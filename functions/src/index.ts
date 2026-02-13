import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { defineString } from "firebase-functions/params";
import axios from "axios";
import * as JSZip from "jszip";
import * as Papa from "papaparse";

const sgMail = require("@sendgrid/mail");
const cors = require("cors")({ origin: true });

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Define SendGrid API key parameter
const sendgridApiKey = defineString("SENDGRID_API_KEY");

// ============================================================
// MONTHLY SUMMARY CLOUD FUNCTIONS
// Automatically maintain monthlySummaries when transactions change
// ============================================================

interface TransactionData {
  amount: number;
  category: string;
  type: string;
  date: string;
}

/**
 * Helper: Update monthly summary for a transaction
 * @param userId - The user's ID
 * @param txData - Transaction data
 * @param isAdd - true to add, false to subtract
 */
async function updateMonthlySummary(
  userId: string,
  txData: TransactionData,
  isAdd: boolean
): Promise<void> {
  // Only track expense, investment, and transfer types
  if (!["expense", "investment", "transfer"].includes(txData.type)) {
    return;
  }

  const txDate = new Date(txData.date);
  const year = txDate.getFullYear();
  const month = txDate.getMonth() + 1; // 1-based
  const summaryId = `${year}-${String(month).padStart(2, "0")}`;
  const categoryId = txData.category || "uncategorized";
  const amount = txData.amount || 0;
  const delta = isAdd ? amount : -amount;

  const summaryRef = db.doc(`users/${userId}/monthlySummaries/${summaryId}`);

  await db.runTransaction(async (transaction) => {
    const summaryDoc = await transaction.get(summaryRef);

    if (summaryDoc.exists) {
      const data = summaryDoc.data()!;
      const currentCategoryTotal = data.categoryTotals?.[categoryId] || 0;
      const newCategoryTotal = Math.max(0, currentCategoryTotal + delta);
      const currentTotal = data.totalSpent || 0;
      const newTotal = Math.max(0, currentTotal + delta);

      transaction.update(summaryRef, {
        [`categoryTotals.${categoryId}`]: newCategoryTotal,
        totalSpent: newTotal,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (isAdd) {
      // Create new summary document
      transaction.set(summaryRef, {
        userId,
        year,
        month,
        categoryTotals: { [categoryId]: amount },
        totalSpent: amount,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
}

/**
 * Trigger: When a transaction is created
 */
export const onTransactionCreated = onDocumentCreated(
  "users/{userId}/transactions/{transactionId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const userId = event.params.userId;
    const txData = snapshot.data() as TransactionData;

    console.log(`Transaction created for user ${userId}:`, txData);

    await updateMonthlySummary(userId, txData, true);
  }
);

/**
 * Trigger: When a transaction is updated
 */
export const onTransactionUpdated = onDocumentUpdated(
  "users/{userId}/transactions/{transactionId}",
  async (event) => {
    const beforeSnap = event.data?.before;
    const afterSnap = event.data?.after;
    if (!beforeSnap || !afterSnap) return;

    const userId = event.params.userId;
    const beforeData = beforeSnap.data() as TransactionData;
    const afterData = afterSnap.data() as TransactionData;

    // Check if relevant fields changed
    const dateChanged = beforeData.date !== afterData.date;
    const categoryChanged = beforeData.category !== afterData.category;
    const amountChanged = beforeData.amount !== afterData.amount;
    const typeChanged = beforeData.type !== afterData.type;

    if (!dateChanged && !categoryChanged && !amountChanged && !typeChanged) {
      return; // No relevant changes
    }

    console.log(`Transaction updated for user ${userId}:`, { before: beforeData, after: afterData });

    // Subtract old values
    await updateMonthlySummary(userId, beforeData, false);
    // Add new values
    await updateMonthlySummary(userId, afterData, true);
  }
);

/**
 * Trigger: When a transaction is deleted
 */
export const onTransactionDeleted = onDocumentDeleted(
  "users/{userId}/transactions/{transactionId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const userId = event.params.userId;
    const txData = snapshot.data() as TransactionData;

    console.log(`Transaction deleted for user ${userId}:`, txData);

    await updateMonthlySummary(userId, txData, false);
  }
);

/**
 * Callable function to rebuild all monthly summaries for a user
 * Use this to fix any inconsistencies or after bulk imports
 */
export const rebuildMonthlySummaries = onCall(async (request) => {
  const userId = request.auth?.uid;
  if (!userId) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  console.log(`Rebuilding monthly summaries for user ${userId}`);

  // Get all transactions
  const transactionsSnap = await db.collection(`users/${userId}/transactions`).get();
  
  // Calculate summaries in memory
  const summaries: Record<string, { categoryTotals: Record<string, number>; totalSpent: number; year: number; month: number }> = {};

  transactionsSnap.forEach((doc) => {
    const tx = doc.data() as TransactionData;
    
    // Only track expense, investment, and transfer types
    if (!["expense", "investment", "transfer"].includes(tx.type)) {
      return;
    }

    const txDate = new Date(tx.date);
    const year = txDate.getFullYear();
    const month = txDate.getMonth() + 1;
    const summaryId = `${year}-${String(month).padStart(2, "0")}`;
    const categoryId = tx.category || "uncategorized";
    const amount = tx.amount || 0;

    if (!summaries[summaryId]) {
      summaries[summaryId] = { categoryTotals: {}, totalSpent: 0, year, month };
    }

    summaries[summaryId].categoryTotals[categoryId] = 
      (summaries[summaryId].categoryTotals[categoryId] || 0) + amount;
    summaries[summaryId].totalSpent += amount;
  });

  // Write all summaries in a batch
  const batch = db.batch();
  
  for (const [summaryId, data] of Object.entries(summaries)) {
    const summaryRef = db.doc(`users/${userId}/monthlySummaries/${summaryId}`);
    batch.set(summaryRef, {
      userId,
      year: data.year,
      month: data.month,
      categoryTotals: data.categoryTotals,
      totalSpent: data.totalSpent,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  console.log(`Rebuilt ${Object.keys(summaries).length} monthly summaries for user ${userId}`);

  return { 
    success: true, 
    summariesCount: Object.keys(summaries).length,
    transactionsProcessed: transactionsSnap.size 
  };
});

export const testEmail = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      // Verify authentication
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).send("Unauthorized");
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      if (!decodedToken) {
        res.status(401).send("Invalid token");
        return;
      }

      const { userEmail, fromEmail, fromName } = req.body;

      if (!userEmail || !fromEmail) {
        res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
        return;
      }

      // Check SendGrid configuration
      if (!sendgridApiKey.value()) {
        res.status(500).json({
          success: false,
          message: "SendGrid API key not configured on server",
        });
        return;
      }
      sgMail.setApiKey(sendgridApiKey.value());

      // Send test email
      const testMessage = {
        to: userEmail,
        from: {
          email: fromEmail,
          name: fromName || "FinanceTracker",
        },
        subject: "✅ FinanceTracker Email Test - Success!",
        html: `
          <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">
            <div style=\"background: #28a745; color: white; padding: 20px; text-align: center;\">
              <h1>✅ Email Test Successful</h1>
              <p>FinanceTracker Email Configuration</p>
            </div>
            <div style=\"padding: 20px;\">
              <h2>🎉 Congratulations!</h2>
              <p>Your email notifications are now working perfectly!</p>
              <p>You will receive automated notifications for bills, budgets, and financial events.</p>
              <a href=\"https://financetracker-b00a6.web.app/settings\" 
                 style=\"background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;\">
                Manage Settings
              </a>
            </div>
            <div style=\"background: #f8f9fa; padding: 15px; text-align: center; color: #666;\">
              <p>This is a test email from FinanceTracker</p>
              <p>Sent at ${new Date().toLocaleString("en-IN")}</p>
            </div>
          </div>
        `,
        text: `
Email Test Successful!

Your email notifications are now working perfectly!

Manage settings: https://financetracker-b00a6.web.app/settings

This is a test email from FinanceTracker.
Sent at ${new Date().toLocaleString("en-IN")}
        `.trim(),
      };

      await sgMail.send(testMessage);

      console.log(`Test email sent successfully to ${userEmail}`);

      res.json({
        success: true,
        message: "Test email sent successfully! Check your inbox.",
      });
    } catch (error: any) {
      console.error("Error sending test email:", error);

      res.status(500).json({
        success: false,
        message: "Failed to send test email",
        error: error.message || "Unknown error",
      });
    }
  });
});

export const healthCheck = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      sendgridConfigured: !!sendgridApiKey.value(),
    });
  });
});

export const billReminderEmail = onSchedule("every day 09:00", async (event) => {
  if (!sendgridApiKey.value()) {
    console.error("SendGrid API key not configured.");
    return;
  }
  sgMail.setApiKey(sendgridApiKey.value());

  const usersSnapshot = await db.collection("users").get();

  for (const userDoc of usersSnapshot.docs) {
    const user = userDoc.data();
    const notificationSettings = user.notificationSettings;

    if (notificationSettings?.billReminders?.enabled && user.email) {
      const billsSnapshot = await db.collection("users").doc(userDoc.id).collection("bills").get();
      const reminderDays = notificationSettings.billReminders.daysBefore || [1, 3, 7];

      for (const billDoc of billsSnapshot.docs) {
        const bill = billDoc.data();
        const dueDate = bill.dueDate.toDate();
        const today = new Date();
        const timeDiff = dueDate.getTime() - today.getTime();
        const daysUntilDue = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (reminderDays.includes(daysUntilDue)) {
          const msg = {
            to: user.email,
            from: {
              email: "noreply@financetracker.com", // Verified sender
              name: "FinanceTracker",
            },
            subject: `Upcoming Bill Reminder: ${bill.name}`,
            html: `
                <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">
                  <div style=\"background: #007bff; color: white; padding: 20px; text-align: center;\">
                    <h1>Bill Reminder</h1>
                  </div>
                  <div style=\"padding: 20px;\">
                    <p>Hi ${user.displayName || ""},</p>
                    <p>This is a reminder that your bill, <strong>${bill.name}</strong>, is due in <strong>${daysUntilDue} day(s)</strong>.</p>
                    <p><strong>Amount Due:</strong> ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(bill.amount)}</p>
                    <p><strong>Due Date:</strong> ${dueDate.toLocaleDateString("en-IN")}</p>
                    <a href=\"https://financetracker-b00a6.web.app/bills\"
                       style=\"background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;\">
                      View Bill
                    </a>
                  </div>
                  <div style=\"background: #f8f9fa; padding: 15px; text-align: center; color: #666;\">
                    <p>FinanceTracker</p>
                  </div>
                </div>
              `,
          };
          try {
            await sgMail.send(msg);
            console.log(`Bill reminder sent to ${user.email} for bill ${bill.name}`);
          } catch (error) {
            console.error("Error sending bill reminder:", error);
          }
        }
      }
    }
  }
});

// --- MARKET DATA FUNCTIONS ---

export const fetchNseBhavcopy = onCall({
  timeoutSeconds: 60,
  memory: "512MiB"
}, async (request: any) => {

  // Helper to get formatted date string for NSE URL
  const getBhavcopyUrl = (date: Date) => {
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // NEW NSE URL Format (2025/2026 Standard)
    const filename = `BhavCopy_NSE_CM_0_0_0_${year}${month}${day}_F_0000.csv.zip`;
    const url = `https://nsearchives.nseindia.com/content/cm/${filename}`;

    return { url, filename, dateStr: `${year}-${month}-${day}` };
  };

  // Helper to fetch Cookies from NSE Homepage
  const getNseCookies = async () => {
    try {
      const response = await axios.get('https://www.nseindia.com', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 5000
      });
      return response.headers['set-cookie'];
    } catch (e) {
      console.warn("Failed to get NSE cookies:", e);
      return [];
    }
  };

  let attempts = 0;
  let success = false;
  let date = new Date();

  // Adjust UTC to IST
  date.setHours(date.getHours() + 5);
  date.setMinutes(date.getMinutes() + 30);

  // Fetch cookies once
  const cookies = await getNseCookies();
  const cookieHeader = cookies ? cookies.map((c: string) => c.split(';')[0]).join('; ') : '';
  console.log(`Obtained Cookies: ${cookieHeader ? 'Yes' : 'No'}`);

  while (!success && attempts < 5) {
    const { url, dateStr } = getBhavcopyUrl(date);
    console.log(`Attempting to fetch NSE data for: ${dateStr}`);

    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Connection': 'keep-alive',
          'Cookie': cookieHeader
        }
      });

      if (response.status === 200) {
        console.log(`Download successful for ${dateStr}. Unzipping...`);
        const zip = await JSZip.loadAsync(response.data);
        const csvFilename = Object.keys(zip.files).find(name => name.toLowerCase().endsWith('.csv'));

        if (csvFilename) {
          const csvText = await zip.files[csvFilename].async('string');
          const parsed = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false
          });

          // Process Data
          const stockData = parsed.data
            .filter((row: any) => {
              const series = row['Srs'] || row['SERIES'];
              return series === 'EQ' || series === 'BE';
            })
            .map((row: any) => {
              return {
                symbol: row['TckrSymb'] || row['SYMBOL'],
                price: parseFloat(row['LstTrdPric'] || row['LAST'] || row['ClsPric'] || row['CLOSE'] || '0'),
                change: parseFloat(row['Chng'] || '0'),
                prevClose: parseFloat(row['PrvClsPric'] || row['PREVCLOSE'] || '0'),
                lastUpdated: dateStr
              };
            })
            .filter((item: any) => item.symbol && item.price > 0);

          if (stockData.length > 0) {
            return {
              success: true,
              date: dateStr,
              count: stockData.length,
              data: stockData
            };
          }
        }
      }
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        console.log(`Data not found for ${dateStr} (likely holiday/weekend).`);
      } else {
        console.error(`Error fetching ${dateStr}:`, error.message);
      }
    }

    date.setDate(date.getDate() - 1);
    attempts++;
  }

  throw new functions.https.HttpsError('not-found', 'Could not fetch NSE data for the last 5 days.');
});