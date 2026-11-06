# Gmail Bank Statement Import Setup Guide

This guide will help you set up automatic import of bank statement PDFs from your Gmail account.

## 🎯 **What This Does**

- **Automatically scans** your Gmail for bank statement emails
- **Downloads PDF attachments** from HDFC Bank (more banks coming soon)
- **Extracts transaction data** using AI-powered PDF parsing
- **Imports transactions** directly into your Personal Finance Manager
- **Categorizes automatically** using smart categorization rules

## 📋 **Prerequisites**

- Gmail account with bank statement emails
- Google Cloud Console access (free)
- HDFC Bank account (other banks coming soon)

## 🚀 **Step-by-Step Setup**

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"New Project"** or select existing project
3. Name your project (e.g., "Personal Finance Manager")
4. Click **"Create"**

### Step 2: Enable Gmail API

1. In Google Cloud Console, go to **"APIs & Services" → "Library"**
2. Search for **"Gmail API"**
3. Click on **Gmail API** and click **"Enable"**

### Step 3: Configure the OAuth Consent Screen

1. Go to **"APIs & Services" → "OAuth consent screen"** (Google Auth Platform → Branding / Audience / Data access)
2. User type: **External**; app name e.g. "FinanceTracker"; add your support/developer email
3. Data access → add scope `https://www.googleapis.com/auth/gmail.readonly`
4. Audience → while the app is in **Testing**, add every Gmail address that will connect as a **Test user**
   - `gmail.readonly` is a *restricted* scope: publishing to production for other users requires Google verification + a security assessment
   - In Testing mode, consent expires after 7 days and must be granted again

### Step 4: Create an OAuth 2.0 Client ID (no secret needed)

1. Go to **"APIs & Services" → "Credentials" → "Create Credentials" → "OAuth client ID"**
2. Application type: **Web application**
3. **Authorized JavaScript origins**: `http://localhost:3000` and your hosting origin(s), e.g. `https://<project>.web.app`, `https://<project>.firebaseapp.com`
4. Redirect URIs are **not** needed (the app uses the Google Identity Services token popup)
5. Copy the **Client ID** only. Do **not** put the client secret anywhere in the frontend.

### Step 5: Configure the App

1. Add to `.env` (see `.env.example`) and restart `npm run dev`:
   ```
   VITE_GOOGLE_OAUTH_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com
   ```
   (Alternatively paste it under **Settings → Gmail Import → Advanced Settings → Client ID override**.)
2. Open **Settings → Gmail Import**, toggle **"Enable Gmail Statement Import"**
3. Click **"Connect with Google"** and allow read-only Gmail access

### Step 6: Configure Banks

1. Enable each bank you receive statements from; the sender can be an address or a domain (e.g. `hdfcbank.net`)
2. Choose the account to import into (or pick it during review)
3. Enter the statement PDF password. Passwords are stored **only in this browser** (localStorage), never in Firestore

### Step 7: Scan, Review, Import

1. Click **"Scan now"** – statements found are listed and parsed one by one
2. Locked PDFs show a password prompt; tick "Remember" to save it locally for that bank
3. Click **"Review & Import"** – edit/deselect rows, pick the account, confirm
4. Possible duplicates of existing transactions are shown for resolution before saving
5. Imported/skipped emails are recorded in Firestore (`users/{uid}/gmailProcessedMessages`) and are not offered again

Google access tokens last about one hour and are kept only for the browser session; click "Connect with Google" again when they expire. Background scanning while the app is closed is not supported yet (it needs a server-side refresh-token flow).

## 🔧 **Gmail Search Filters**

The app searches for emails using these criteria:

```
from:alerts@hdfcbank.net 
has:attachment 
subject:statement 
after:2024-01-01
```

### Supported Email Patterns:
- **HDFC Bank**: `alerts@hdfcbank.net`, `customercare@hdfcbank.net`
- **Subject Keywords**: "statement", "account statement", "monthly statement"
- **Attachment Types**: PDF files containing transaction data

## 📊 **Transaction Parsing**

### HDFC Bank Statement Format:
```
Date        Description                    Amount    Dr/Cr   Balance
01/01/2024  ATM CASH WITHDRAWAL           5,000.00   Dr     45,000.00
02/01/2024  UPI PAYMENT TO MERCHANT       1,200.00   Dr     43,800.00
03/01/2024  SALARY CREDIT                75,000.00   Cr    118,800.00
```

### Extracted Data:
- **Date**: Transaction date
- **Description**: Transaction details
- **Amount**: Transaction amount
- **Type**: Debit (expense) or Credit (income)
- **Mode**: ATM, UPI, NEFT, Card, etc.
- **Balance**: Account balance after transaction

### Auto-Categorization:
- **ATM Withdrawals** → Cash/ATM
- **UPI Payments** → Based on merchant name
- **Salary Credits** → Income/Salary
- **Bill Payments** → Utilities/Bills
- **Shopping** → Shopping/Retail

## 🛠️ **Troubleshooting**

### Authentication Issues

**Problem**: "Failed to authenticate with Gmail"
**Solution**:
1. Verify the Client ID is a *Web application* client and the current origin is listed under Authorized JavaScript origins
2. Check the OAuth consent screen is configured and your Gmail address is a Test user
3. Ensure the Gmail API is enabled for the same Google Cloud project
4. Allow popups for the app (the Google sign-in opens in a popup)

### No Emails Found

**Problem**: "No bank statement emails found"
**Solution**:
1. Check sender email address is correct
2. Verify subject keywords match your bank's emails
3. Adjust date range in Advanced Settings
4. Check Gmail search manually: `from:alerts@hdfcbank.net has:attachment`

### PDF Parsing Errors

**Problem**: "Failed to parse PDF"
**Solution**:
1. Ensure PDF is not password-protected
2. Check PDF contains readable text (not scanned image)
3. Verify PDF format matches HDFC standard
4. Try manual upload to test parsing

### Import Duplicates

**Problem**: "Duplicate transactions imported"
**Solution**:
1. App automatically detects duplicates by date, amount, and description
2. Check "Last Processed Date" in Advanced Settings
3. Review imported transactions and remove duplicates manually

## 🔒 **Security & Privacy**

### Data Protection:
- **OAuth 2.0**: Secure authentication with Google
- **Read-Only Access**: App can only read emails, not send or delete
- **Local Processing**: PDFs processed locally in your browser
- **No Data Storage**: Gmail credentials not stored on external servers

### Permissions Required:
- `gmail.readonly`: Read access to Gmail messages and attachments
- No access to compose, send, or delete emails

### Best Practices:
1. **Regular Review**: Check imported transactions monthly
2. **No Secrets in the Browser**: Only the public Client ID is used; never add the client secret to `.env`
3. **Revoke Access**: Can revoke app access anytime in Google Account settings
4. **Monitor Usage**: Check Google Cloud Console for API usage

## 💰 **Cost Considerations**

### Google Cloud Costs:
- **Gmail API**: Free tier includes 1 billion quota units/month
- **Typical Usage**: ~100 units per email processed
- **Monthly Cost**: $0 for personal use (well within free tier)

### Rate Limits:
- **250 quota units per user per second**
- **1 billion quota units per day**
- **Sufficient for**: 1000+ emails per day

## 📈 **Advanced Features**

### Multiple Bank Support (Coming Soon):
- SBI Bank statements
- ICICI Bank statements
- Axis Bank statements
- Custom bank configurations

### Enhanced Parsing:
- Credit card statements
- Investment statements
- Loan statements
- Insurance premium receipts

### Smart Features:
- Duplicate detection
- Merchant name standardization
- Category learning from user corrections
- Spending pattern analysis

## 🎯 **Testing Checklist**

- [ ] Google Cloud project created
- [ ] Gmail API enabled
- [ ] OAuth credentials configured
- [ ] App authentication successful
- [ ] HDFC bank settings configured
- [ ] Manual import test successful
- [ ] Transactions imported correctly
- [ ] Auto-categorization working
- [ ] Auto import enabled (optional)
- [ ] No duplicate transactions
- [ ] Bank account linked correctly

## 📞 **Support Resources**

- [Google Cloud Console](https://console.cloud.google.com/)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [OAuth 2.0 Setup Guide](https://developers.google.com/identity/protocols/oauth2)
- [HDFC Bank Email Formats](https://www.hdfcbank.com/)

## 🚨 **Important Notes**

1. **Email Access**: App needs read access to your Gmail
2. **Bank Statements**: Only processes PDF attachments from bank emails
3. **Data Privacy**: All processing happens locally in your browser
4. **Accuracy**: Always review imported transactions for accuracy
5. **Backup**: Keep original bank statements for reference

---

**🎉 Once configured, your Personal Finance Manager will automatically import and categorize all your HDFC bank transactions from Gmail!**

## 🔄 **Future Enhancements**

- Support for more banks (SBI, ICICI, Axis, etc.)
- Credit card statement parsing
- Investment statement import
- Receipt parsing from shopping emails
- Expense categorization learning
- Merchant name standardization
- Spending insights from email data