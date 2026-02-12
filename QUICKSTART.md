# Quick Start Guide

Get up and running with the Status Update Mail AI Agent in 5 minutes!

## Step 1: Get Your Credentials

### GitHub Token (2 minutes)
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name it "Status Update Agent"
4. Check: `repo` and `read:user`
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again!)

### Gemini API Key (1 minute)
1. Visit https://makersuite.google.com/app/apikey
2. Click "Create API key"
3. Copy the key

### Gmail App Password (2 minutes)
1. Enable 2FA on your Google Account if not already enabled
2. Go to https://myaccount.google.com/apppasswords
3. Select "Mail" and your device
4. Click "Generate"
5. Copy the 16-character password (no spaces needed in .env)

## Step 2: Setup Project

```bash
# Clone the repository
git clone https://github.com/sarthakg043/status-update-mail-ai-agent.git
cd status-update-mail-ai-agent

# Install dependencies
npm install

# Create configuration file
cp .env.example .env
```

## Step 3: Configure

Edit `.env` file with your credentials:

```env
GITHUB_TOKEN=ghp_your_token_here
GITHUB_USERNAME=your_github_username
GEMINI_API_KEY=AIzaSy_your_key_here
EMAIL_SERVICE=gmail
EMAIL_USER=your.email@gmail.com
EMAIL_APP_PASSWORD=your16charpassword
EMAIL_TO=recipient@example.com
EMAIL_SUBJECT=Daily Status Update
```

**Tips:**
- Leave `START_DATE` and `END_DATE` empty for today's PRs
- Separate multiple recipients with commas: `email1@test.com,email2@test.com`
- Customize `USER_INSTRUCTIONS` to match your reporting style

## Step 4: Run

```bash
npm start
```

That's it! The agent will:
1. ✓ Fetch your PRs from GitHub
2. ✓ Generate a professional email with AI
3. ✓ Send the email to your recipients

## Example Output

```
=== Status Update Mail AI Agent ===

Loading configuration...
Configuration loaded successfully

Date Range: 2026-02-11 to 2026-02-11

Fetching pull requests from GitHub...
Found 2 pull request(s)

Generating email content with AI...
Email content generated

Sending email...
✓ Email sent successfully!
✓ Recipients: manager@company.com
```

## Troubleshooting

**"Missing required environment variables"**
→ Check all variables in `.env` are filled

**"Error fetching pull requests"**
→ Verify GitHub token has correct permissions

**"Error sending email"**
→ Check Gmail App Password (not your regular password!)

**"No pull requests found"**
→ Normal if you haven't created PRs today. Try setting a date range.

## Next Steps

- Schedule with cron to run daily
- Customize `USER_INSTRUCTIONS` for your team
- Add multiple recipients for team updates

Need help? Check the [full README](README.md) or [open an issue](https://github.com/sarthakg043/status-update-mail-ai-agent/issues).
