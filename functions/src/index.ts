import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import {
  accumulateSummaryDelta, isEmptyDelta, SUMMARY_SCHEMA_VERSION, SummaryDelta, SummaryTx,
} from "./summaryMath";
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
// Maintain users/{userId}/monthlySummaries/{YYYY-MM} when transactions change.
// Transactions live in the top-level `transactions` collection with a `userId` field.
// Summary rules are in ./summaryMath (kept in sync with the web app).
// ============================================================

/** A rebuild holds this lock on users/{uid}.summariesRebuild while it runs. */
const REBUILD_LOCK_TTL_MS = 9 * 60 * 1000;

function isRebuildLockActive(lock: any): boolean {
  if (!lock?.startedAt || lock.finishedAt) return false;
  const startedMs = typeof lock.startedAt.toMillis === "function" ? lock.startedAt.toMillis() : 0;
  return Date.now() - startedMs < REBUILD_LOCK_TTL_MS;
}

/** Firestore increment payload for one month's delta (empty maps left out: under merge they would replace). */
function deltaToWrite(userId: string, delta: SummaryDelta): admin.firestore.DocumentData {
  const inc = admin.firestore.FieldValue.increment;
  const byType: Record<string, Record<string, admin.firestore.FieldValue>> = {};
  for (const [type, cats] of Object.entries(delta.byType)) {
    for (const [categoryId, amount] of Object.entries(cats)) {
      if (amount === 0) continue;
      (byType[type] = byType[type] || {})[categoryId] = inc(amount);
    }
  }
  const categoryTotals: Record<string, admin.firestore.FieldValue> = {};
  for (const [categoryId, amount] of Object.entries(delta.categoryTotals)) {
    if (amount !== 0) categoryTotals[categoryId] = inc(amount);
  }
  const data: admin.firestore.DocumentData = {
    userId,
    year: delta.year,
    month: delta.month,
    expense: inc(delta.expense),
    income: inc(delta.income),
    investment: inc(delta.investment),
    totalSpent: inc(delta.totalSpent),
    txCount: inc(delta.txCount),
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (Object.keys(byType).length > 0) data.byType = byType;
  if (Object.keys(categoryTotals).length > 0) data.categoryTotals = categoryTotals;
  return data;
}

/**
 * Apply per-month deltas atomically. Runs in a transaction that also reads the
 * user's rebuild lock: while a rebuild runs, the change is not applied; instead
 * the rebuild is flagged dirty and re-reads all transactions before finishing.
 * The transaction guarantees the lock can't be taken between check and write.
 */
async function applySummaryDeltas(userId: string, deltas: Map<string, SummaryDelta>): Promise<void> {
  const changed = [...deltas.entries()].filter(([, delta]) => !isEmptyDelta(delta));
  if (changed.length === 0) return;

  const userRef = db.doc(`users/${userId}`);
  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (isRebuildLockActive(userSnap.get("summariesRebuild"))) {
      tx.set(userRef, { summariesRebuild: { dirty: true } }, { merge: true });
      return;
    }
    for (const [monthKey, delta] of changed) {
      tx.set(db.doc(`users/${userId}/monthlySummaries/${monthKey}`), deltaToWrite(userId, delta), { merge: true });
    }
  });
}

/**
 * Trigger: any create / update / delete of a transaction.
 * Subtracts the old version and adds the new one, so moves between
 * months, categories and types are all handled by one code path.
 */
export const onTransactionWritten = onDocumentWritten(
  "transactions/{transactionId}",
  async (event) => {
    const before = event.data?.before.exists ? event.data.before.data() : undefined;
    const after = event.data?.after.exists ? event.data.after.data() : undefined;
    const userId: string | undefined = after?.userId || before?.userId;
    if (!userId) return;

    if (before && after) {
      const unchanged = before.date === after.date && before.category === after.category &&
        before.amount === after.amount && before.type === after.type && before.userId === after.userId;
      if (unchanged) return;
    }

    if (before && after && before.userId && before.userId !== after.userId) {
      // Ownership moved (shouldn't happen): fix both users' summaries separately.
      const removed = new Map<string, SummaryDelta>();
      accumulateSummaryDelta(removed, before as SummaryTx, -1);
      await applySummaryDeltas(before.userId, removed);
      const added = new Map<string, SummaryDelta>();
      accumulateSummaryDelta(added, after as SummaryTx, 1);
      await applySummaryDeltas(after.userId, added);
      return;
    }

    const deltas = new Map<string, SummaryDelta>();
    if (before) accumulateSummaryDelta(deltas, before as SummaryTx, -1);
    if (after) accumulateSummaryDelta(deltas, after as SummaryTx, 1);
    await applySummaryDeltas(userId, deltas);
  }
);

/** One full pass: read every transaction of the user and overwrite all month docs. */
async function rebuildSummariesPass(userId: string): Promise<{ months: number; transactions: number }> {
  const transactionsSnap = await db.collection("transactions").where("userId", "==", userId).get();
  const deltas = new Map<string, SummaryDelta>();
  transactionsSnap.forEach((doc) => accumulateSummaryDelta(deltas, doc.data() as SummaryTx, 1));

  const summariesCol = db.collection(`users/${userId}/monthlySummaries`);
  const existing = await summariesCol.select().get();
  const now = admin.firestore.FieldValue.serverTimestamp();

  type Op = { ref: admin.firestore.DocumentReference; data?: admin.firestore.DocumentData };
  const ops: Op[] = [];
  deltas.forEach((delta, monthKey) => {
    ops.push({
      ref: summariesCol.doc(monthKey),
      data: { userId, ...delta, schemaVersion: SUMMARY_SCHEMA_VERSION, lastUpdated: now },
    });
  });
  existing.forEach((doc) => {
    if (!deltas.has(doc.id)) ops.push({ ref: doc.ref }); // month no longer has transactions
  });

  for (let i = 0; i < ops.length; i += 400) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + 400)) {
      if (op.data) batch.set(op.ref, op.data);
      else batch.delete(op.ref);
    }
    await batch.commit();
  }
  return { months: deltas.size, transactions: transactionsSnap.size };
}

/**
 * Callable: rebuild every monthly summary for the calling user from scratch.
 * Use after imports, migrations or if summaries drift. Marks the summaries as
 * complete (users/{uid}.summariesVersion) so the app can trust them.
 *
 * Concurrency: a lock makes the trigger skip (and flag `dirty`) while a pass runs;
 * a dirty pass is repeated, so no change made during the rebuild is lost or doubled.
 */
export const rebuildMonthlySummaries = onCall({ timeoutSeconds: 300, memory: "512MiB" }, async (request) => {
  const userId = request.auth?.uid;
  if (!userId) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const userRef = db.doc(`users/${userId}`);
  const serverNow = admin.firestore.FieldValue.serverTimestamp();
  console.log(`Rebuilding monthly summaries for user ${userId}`);

  await userRef.set({
    summariesRebuild: { startedAt: serverNow, dirty: false, finishedAt: admin.firestore.FieldValue.delete() },
  }, { merge: true });

  const MAX_PASSES = 5;
  let result = { months: 0, transactions: 0 };
  let clean = false;
  for (let pass = 1; pass <= MAX_PASSES && !clean; pass++) {
    result = await rebuildSummariesPass(userId);
    clean = await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (snap.get("summariesRebuild.dirty")) {
        tx.set(userRef, { summariesRebuild: { dirty: false } }, { merge: true });
        return false;
      }
      tx.set(userRef, {
        summariesRebuild: { finishedAt: admin.firestore.FieldValue.serverTimestamp() },
        summariesVersion: SUMMARY_SCHEMA_VERSION,
        summariesRebuiltAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      return true;
    });
    if (!clean) console.log(`Transactions changed during pass ${pass}; rebuilding again`);
  }

  if (!clean) {
    // Release the lock without marking the summaries complete; the app retries later.
    await userRef.set({ summariesRebuild: { finishedAt: admin.firestore.FieldValue.serverTimestamp() } }, { merge: true });
    throw new functions.https.HttpsError("aborted", "Transactions kept changing during the rebuild; try again");
  }

  console.log(`Rebuilt ${result.months} monthly summaries from ${result.transactions} transactions for user ${userId}`);
  return {
    success: true,
    summariesCount: result.months,
    transactionsProcessed: result.transactions,
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