import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {defineString} from "firebase-functions/params";
const sgMail = require("@sendgrid/mail");
const cors = require("cors")({origin: true});

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Define SendGrid API key parameter
const sendgridApiKey = defineString("SENDGRID_API_KEY");

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