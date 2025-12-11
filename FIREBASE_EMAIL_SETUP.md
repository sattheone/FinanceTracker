# Firebase Email Notifications Setup Guide

This guide will help you set up email notifications using Firebase Extensions for your Personal Finance Manager.

## 🔥 **Firebase Extensions Approach**

We're using Firebase's "Trigger Email" extension, which automatically sends emails when documents are added to a specific Firestore collection.

## 📋 **Prerequisites**

- Firebase project already set up (you should have this from the main app setup)
- Firebase CLI installed (optional, but recommended)
- Access to Firebase Console

## 🚀 **Step-by-Step Setup**

### Step 1: Install Trigger Email Extension

1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Extensions** in the left sidebar
4. Click **Browse Hub**
5. Search for **"Trigger Email"** or **"firestore-send-email"**
6. Click **Install** on the official Firebase extension

### Step 2: Configure the Extension

During installation, you'll be prompted to configure:

#### **Required Configuration:**
- **Collection path**: `mail` (this is where our app will write email documents)
- **SMTP connection URI**: Your email service SMTP settings
- **Default FROM address**: The email address emails will be sent from
- **Default REPLY-TO address**: Where replies should go (usually same as FROM)

#### **SMTP Configuration Examples:**

**Gmail:**
```
smtps://username:password@smtp.gmail.com:465
```

**Outlook/Hotmail:**
```
smtps://username:password@smtp-mail.outlook.com:587
```

**SendGrid:**
```
smtps://apikey:YOUR_API_KEY@smtp.sendgrid.net:587
```

**Custom SMTP:**
```
smtps://username:password@your-smtp-server.com:587
```

### Step 3: Set Up App-Specific Password (Gmail Users)

If using Gmail:

1. Go to your [Google Account settings](https://myaccount.google.com/)
2. Navigate to **Security**
3. Enable **2-Step Verification** (if not already enabled)
4. Go to **App passwords**
5. Generate a new app password for "Mail"
6. Use this app password instead of your regular password in the SMTP URI

### Step 4: Configure Firestore Security Rules

Add this rule to your `firestore.rules` to allow the extension to process emails:

```javascript
// Allow the extension to read and delete from the mail collection
match /mail/{document} {
  allow read, delete: if request.auth != null;
  allow create: if request.auth != null && request.auth.uid == resource.data.metadata.userId;
}
```

### Step 5: Test the Setup

1. Go to your app's **Settings → Notifications**
2. Enter your email address
3. Click **"Send Test Email"**
4. Check your inbox (and spam folder)

## 🔧 **How It Works**

### Email Flow:
1. **App triggers notification** (bill due, budget exceeded, etc.)
2. **Document created** in Firestore `mail` collection
3. **Extension processes** the document automatically
4. **Email sent** via your configured SMTP service
5. **Document deleted** after successful send

### Document Structure:
```javascript
{
  to: "user@example.com",
  message: {
    subject: "Bill Reminder: Electricity Bill",
    html: "<html>...</html>",
    text: "Fallback text version"
  },
  metadata: {
    type: "bill_reminder",
    userId: "user123",
    timestamp: "2024-01-01T00:00:00Z",
    source: "personal-finance-manager"
  }
}
```

## 📊 **Monitoring & Logs**

### View Extension Logs:
1. Go to **Firebase Console → Extensions**
2. Click on the **Trigger Email** extension
3. View **Logs** tab to see email processing status

### Common Log Messages:
- ✅ **"Email sent successfully"**: Email delivered
- ❌ **"SMTP connection failed"**: Check SMTP settings
- ⚠️ **"Invalid email format"**: Check recipient email address

## 🛠️ **Troubleshooting**

### Emails Not Sending

1. **Check Extension Status**
   - Go to Firebase Console → Extensions
   - Ensure Trigger Email extension is **Active**

2. **Verify SMTP Settings**
   - Test SMTP connection manually
   - Check username/password/server details
   - Ensure correct port (587 for TLS, 465 for SSL)

3. **Check Firestore Rules**
   - Ensure app can write to `mail` collection
   - Verify extension can read/delete from collection

4. **Review Extension Logs**
   - Look for error messages in Firebase Console
   - Check for authentication failures

### Emails Going to Spam

1. **SPF Records**: Configure SPF for your domain
2. **DKIM**: Enable DKIM signing if available
3. **Reputation**: Use reputable SMTP service (SendGrid, Mailgun)
4. **Content**: Avoid spam trigger words in subject/body

### High Email Volume

1. **Rate Limits**: Check your SMTP service limits
2. **Upgrade Plan**: Consider paid SMTP service for higher volumes
3. **Batch Processing**: Extension handles queuing automatically

## 💰 **Cost Considerations**

### Firebase Extensions:
- **Free tier**: 125K function invocations/month
- **Paid tier**: $0.40 per million invocations

### SMTP Services:
- **Gmail**: Free (with daily limits)
- **SendGrid**: 100 emails/day free, then paid plans
- **Mailgun**: 5,000 emails/month free
- **Amazon SES**: $0.10 per 1,000 emails

## 🔒 **Security Best Practices**

1. **Use App Passwords**: Never use your main email password
2. **Limit Permissions**: Only grant necessary Firestore access
3. **Monitor Usage**: Watch for unusual email activity
4. **Secure SMTP**: Always use encrypted connections (SMTPS)
5. **Environment Variables**: Store sensitive config in Firebase config

## 📈 **Advanced Features**

### Email Templates:
- Create reusable HTML templates
- Use dynamic content with variables
- Support for attachments (if needed)

### Delivery Tracking:
- Monitor delivery status
- Handle bounces and failures
- Track open rates (with tracking pixels)

### Batch Processing:
- Queue multiple emails
- Process in batches to avoid rate limits
- Retry failed deliveries

## 🎯 **Testing Checklist**

- [ ] Extension installed and active
- [ ] SMTP connection configured
- [ ] Test email sent successfully
- [ ] Bill reminder emails working
- [ ] Budget alert emails working
- [ ] Overdue payment alerts working
- [ ] Monthly reports (if enabled)
- [ ] Email formatting looks good on mobile/desktop
- [ ] Emails not going to spam
- [ ] Extension logs show no errors

## 📞 **Support Resources**

- [Firebase Extensions Documentation](https://firebase.google.com/docs/extensions)
- [Trigger Email Extension GitHub](https://github.com/firebase/extensions/tree/master/firestore-send-email)
- [Firebase Support](https://firebase.google.com/support)
- [SMTP Troubleshooting Guide](https://firebase.google.com/docs/extensions/official/firestore-send-email#troubleshooting)

---

**🎉 Once configured, your Personal Finance Manager will automatically send beautiful, professional email notifications for all your important financial reminders!**