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

### Step 3: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services" → "Credentials"**
2. Click **"Create Credentials" → "OAuth 2.0 Client IDs"**
3. If prompted, configure OAuth consent screen:
   - Choose **"External"** user type
   - Fill in app name: "Personal Finance Manager"
   - Add your email as developer contact
   - Add scopes: `https://www.googleapis.com/auth/gmail.readonly`
4. For OAuth 2.0 Client ID:
   - Application type: **"Web application"**
   - Name: "Personal Finance Manager"
   - Authorized redirect URIs: `http://localhost:3000/auth/callback`
5. Click **"Create"**
6. **Copy the Client ID and Client Secret** (you'll need these)

### Step 4: Configure App Settings

1. Open your Personal Finance Manager
2. Go to **Settings → Gmail Import**
3. Toggle **"Enable Gmail Import"** to ON
4. Enter your **Google Client ID** and **Client Secret**
5. Click **"Test Connection"** to authenticate

### Step 5: Configure HDFC Bank Settings

1. In Gmail Import settings, enable **HDFC Bank Settings**
2. Verify sender email: `alerts@hdfcbank.net` (or your bank's email)
3. Adjust subject keywords if needed
4. Link to your HDFC bank account from the dropdown

### Step 6: Test Manual Import

1. Click **"Import Now"** to test the setup
2. Check your Gmail for HDFC statement emails
3. Verify transactions are imported correctly
4. Review auto-categorization results

### Step 7: Enable Auto Import (Optional)

1. Click **"Start Auto Import"** for automatic processing
2. The system will check every 6 hours for new statements
3. Monitor the import logs for any issues

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
1. Verify Client ID and Secret are correct
2. Check OAuth consent screen is configured
3. Ensure Gmail API is enabled
4. Try re-creating OAuth credentials

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
2. **Secure Credentials**: Keep Client ID/Secret confidential
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