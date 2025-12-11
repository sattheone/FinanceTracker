# Email Notification Setup Guide

This guide will help you set up email notifications for your Personal Finance Manager.

## 🔥 **UPDATED: Now Using Firebase Extensions**

**Important**: This app now uses Firebase Extensions for email notifications instead of EmailJS. Please follow the new setup guide:

👉 **[Firebase Email Setup Guide](./FIREBASE_EMAIL_SETUP.md)**

## 📧 Why Firebase Extensions?

- **More Reliable**: Built-in retry logic and error handling
- **Better Integration**: Seamless with existing Firebase setup
- **Cost Effective**: Free tier covers most personal use cases
- **Professional**: Enterprise-grade email delivery
- **Secure**: No need to expose API keys in frontend code

---

## 📋 Legacy EmailJS Setup (Deprecated)

The following EmailJS setup is no longer used but kept for reference:

### Step 1: Create EmailJS Account

1. Go to [EmailJS.com](https://www.emailjs.com/)
2. Sign up for a free account
3. Verify your email address

### Step 2: Create Email Service

1. In your EmailJS dashboard, go to **Email Services**
2. Click **Add New Service**
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the setup instructions for your provider
5. Note down your **Service ID**

### Step 3: Create Email Template

1. Go to **Email Templates** in your dashboard
2. Click **Create New Template**
3. Use this template structure:

```html
Subject: {{subject}}

From: {{from_name}}
To: {{to_email}}

{{html_content}}
```

4. Save the template and note down your **Template ID**

### Step 4: Get Your User ID

1. Go to **Account** in your EmailJS dashboard
2. Find your **User ID** (also called Public Key)

### Step 5: Configure Environment Variables

Create a `.env` file in your project root and add:

```env
VITE_EMAILJS_SERVICE_ID=your_service_id_here
VITE_EMAILJS_TEMPLATE_ID=your_template_id_here
VITE_EMAILJS_USER_ID=your_user_id_here
VITE_EMAIL_API_ENDPOINT=https://api.emailjs.com/api/v1.0/email/send
```

**Note**: Since this project uses Vite, environment variables must be prefixed with `VITE_` to be accessible in the browser.

## 🔧 Configuration in App

### Check Configuration Status

1. Go to **Settings** → **Notifications**
2. Look for the **"EmailJS Configuration Status"** section at the top
3. If you see a green checkmark, you're all set!
4. If you see an orange warning, click "Show Details" to see what's missing

### Enable Email Notifications

1. Enter your email address in the "Email Address for Notifications" field
2. Toggle on "Enable Email Notifications"
3. Configure your preferences:
   - **Bill Reminders**: Get alerts before bills are due
   - **Recurring Transaction Reminders**: Alerts for upcoming recurring payments
   - **Overdue Payment Alerts**: Urgent notifications for overdue items
   - **Budget Alerts**: Notifications when you exceed budget limits
   - **Monthly Reports**: Monthly financial summaries

### Test Your Setup

1. Click the **"Send Test Email"** button in Settings
2. Check your inbox for the test email
3. If you don't receive it, check your spam folder and verify your EmailJS setup

## 📅 Notification Schedule

The app automatically checks for notifications:
- **Daily**: At startup and every hour
- **Bill Reminders**: 7, 3, and 1 days before due date (configurable)
- **Recurring Reminders**: 3 and 1 days before due date
- **Overdue Alerts**: Daily for any overdue items
- **Budget Alerts**: When spending exceeds your threshold

## 🎨 Email Templates

The app sends beautifully formatted HTML emails with:
- **Responsive design** that works on all devices
- **Color-coded alerts** (red for urgent, orange for warnings, green for success)
- **Detailed information** about bills, amounts, and due dates
- **Professional styling** with your app branding

## 🔒 Privacy & Security

- Your email address is stored locally in your browser
- No emails are stored on external servers
- All communication goes through EmailJS's secure API
- You can disable notifications anytime in Settings

## 🛠️ Troubleshooting

### Demo Mode
If EmailJS is not configured, the app runs in **demo mode**:
- Notifications are logged to the browser console instead of being sent
- You can still test all notification features
- The "Send Test Email" button will show success but won't actually send emails
- Check the browser console (F12) to see what emails would be sent

### Email Not Sending
1. Check your EmailJS service status
2. Verify your Service ID, Template ID, and User ID
3. Ensure your email service is properly configured
4. Check browser console for error messages

### Emails Going to Spam
1. Add your EmailJS sending address to your contacts
2. Check your email provider's spam settings
3. Consider using a custom domain with EmailJS

### Missing Notifications
1. Ensure notifications are enabled in Settings
2. Check that your email address is correct
3. Verify your notification preferences are configured
4. Test with the "Send Test Email" button

## 💡 Tips

- **Use a dedicated email**: Consider using a separate email for financial notifications
- **Check regularly**: Test your email setup monthly to ensure it's working
- **Customize timing**: Adjust reminder days based on your payment habits
- **Mobile notifications**: Add your finance email to your phone for instant alerts

## 🆘 Support

If you need help setting up email notifications:
1. Check the browser console for error messages
2. Verify all environment variables are set correctly
3. Test your EmailJS setup independently
4. Ensure your email provider allows third-party applications

---

**Note**: EmailJS free tier includes 200 emails per month, which is typically sufficient for personal finance notifications. For higher volumes, consider upgrading to a paid plan.