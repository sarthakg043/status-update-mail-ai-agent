# Troubleshooting Guide

Common issues and their solutions for the Status Update Mail AI Agent.

## Configuration Issues

### ❌ "Missing required environment variables"

**Problem**: The application can't find required configuration values.

**Solutions**:
1. Ensure `.env` file exists in the root directory
2. Check that all required variables are set (see `.env.example`)
3. Don't use quotes around values in `.env` file
4. Restart the application after changing `.env`

**Example**:
```env
# ✗ Wrong
GITHUB_TOKEN="ghp_xxxxx"

# ✓ Correct
GITHUB_TOKEN=ghp_xxxxx
```

---

## GitHub Issues

### ❌ "Error fetching pull requests"

**Problem**: Can't connect to GitHub API or fetch PRs.

**Solutions**:
1. **Check token permissions**:
   - Go to https://github.com/settings/tokens
   - Token needs: `repo`, `read:user` scopes
   
2. **Verify token is active**:
   - Tokens can expire
   - Generate a new one if needed

3. **Check username**:
   - Use your GitHub username, not email
   - Case-sensitive

4. **Test token manually**:
```bash
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user
```

### ❌ "No pull requests found"

**Problem**: No PRs returned for the date range.

**This is normal if**:
- You haven't created any PRs in the specified date range
- The dates are in the future
- You're using the wrong username

**Solutions**:
1. Check your GitHub profile for recent PRs
2. Verify date range format: `YYYY-MM-DD`
3. Leave dates empty to search today
4. Try a wider date range

**Example**:
```env
# Search last 30 days
START_DATE=2026-01-12
END_DATE=2026-02-11
```

---

## AI/Gemini Issues

### ❌ "Error generating email content"

**Problem**: Google Gemini API error.

**Solutions**:
1. **Verify API key**:
   - Check at https://makersuite.google.com/app/apikey
   - Regenerate if expired

2. **Check API quota**:
   - Free tier has limits
   - Wait and retry if quota exceeded

3. **Network issues**:
   - Check internet connection
   - Check if makersuite.google.com is accessible

### ❌ "API key not valid"

**Problem**: Invalid or expired Gemini API key.

**Solutions**:
1. Generate a new key at https://makersuite.google.com/app/apikey
2. Copy the entire key without spaces
3. Update `.env` file

---

## Email Issues

### ❌ "Error sending email" (Gmail)

**Problem**: Can't authenticate or send email via Gmail.

**Solutions**:
1. **Use App Password, NOT your regular Gmail password**:
   - Go to https://myaccount.google.com/apppasswords
   - You MUST have 2-Factor Authentication enabled
   - Generate new app password for "Mail"

2. **Check App Password format**:
```env
# Remove spaces from the 16-character password
EMAIL_APP_PASSWORD=abcdabcdabcdabcd
```

3. **Less Secure Apps**:
   - App Passwords are the recommended method
   - "Less secure app access" is deprecated by Google

4. **Verify email settings**:
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your.actual.email@gmail.com
EMAIL_APP_PASSWORD=your16charapppassword
```

### ❌ "Error sending email" (Zoho)

**Problem**: Can't send via Zoho Mail.

**Solutions**:
1. Use Zoho App Password
2. Verify email service is set correctly:
```env
EMAIL_SERVICE=zoho
EMAIL_USER=your.email@zohomail.com
```

3. Check Zoho SMTP is enabled for your account

### ❌ "Invalid recipients"

**Problem**: Email addresses are not recognized.

**Solutions**:
1. **Check email format**:
```env
# ✓ Single recipient
EMAIL_TO=manager@company.com

# ✓ Multiple recipients (comma-separated, no spaces)
EMAIL_TO=manager@company.com,team@company.com

# ✗ Wrong (spaces will cause issues)
EMAIL_TO=manager@company.com, team@company.com
```

---

## Runtime Issues

### ❌ Module not found errors

**Problem**: Dependencies not installed.

**Solution**:
```bash
# Remove and reinstall
rm -rf node_modules package-lock.json
npm install
```

### ❌ "Cannot find module 'dotenv'"

**Problem**: Missing dependencies.

**Solution**:
```bash
npm install
```

### ❌ Port or network errors

**Problem**: Firewall or network blocking connections.

**Solutions**:
1. Check firewall settings
2. For Gmail: Ensure port 587 or 465 is open
3. For Zoho: Ensure port 465 is open
4. Check if your network blocks SMTP

---

## Date and Time Issues

### ❌ Wrong timezone for PRs

**Problem**: Date range seems off by a day.

**Explanation**: GitHub uses UTC timestamps.

**Solution**:
- Adjust `START_DATE` and `END_DATE` accounting for timezone
- Or use broader date ranges

---

## Testing & Debugging

### Test Individual Components

**Test GitHub connection**:
```javascript
// Create test-github.js
require('dotenv').config();
const GitHubService = require('./src/githubService');

const service = new GitHubService(
  process.env.GITHUB_TOKEN, 
  process.env.GITHUB_USERNAME
);

const today = new Date();
service.fetchPullRequests(today, today)
  .then(prs => console.log(`Found ${prs.length} PRs`, prs))
  .catch(err => console.error('Error:', err));
```

Run: `node test-github.js`

**Test Email connection**:
```javascript
// Create test-email.js
require('dotenv').config();
const EmailService = require('./src/emailService');

const service = new EmailService({
  service: process.env.EMAIL_SERVICE,
  user: process.env.EMAIL_USER,
  appPassword: process.env.EMAIL_APP_PASSWORD
});

service.sendEmail(
  process.env.EMAIL_USER, // Send to yourself
  'Test Email',
  'If you receive this, email is working!'
).then(() => console.log('✓ Email sent'))
  .catch(err => console.error('✗ Error:', err));
```

Run: `node test-email.js`

### Enable Debug Logging

Add to your code to see more details:
```javascript
// In index.js, add before main():
process.env.DEBUG = 'nodemailer';
```

---

## Getting Help

If none of these solutions work:

1. **Check the logs**: Look at the error message carefully
2. **Verify versions**: Ensure you have Node.js 18+ installed
3. **Try with minimal config**: Test with bare minimum settings
4. **Check for typos**: Review all variable names in `.env`
5. **Open an issue**: https://github.com/sarthakg043/status-update-mail-ai-agent/issues

Include in your issue:
- Node.js version (`node --version`)
- Error message (remove sensitive data!)
- Steps you've already tried
- Your configuration (remove all secrets!)

---

## Quick Checklist

Before reporting an issue, verify:

- [ ] `.env` file exists and is in the root directory
- [ ] All required variables are set in `.env`
- [ ] No quotes around values in `.env`
- [ ] GitHub token has correct permissions
- [ ] Using GitHub App Password, not regular password (for Gmail)
- [ ] Email addresses are correct format
- [ ] `npm install` was run successfully
- [ ] Node.js version is 18 or higher
- [ ] No typos in configuration values
