# Status Update Mail AI Agent

An intelligent AI-powered agent that automatically fetches your GitHub pull request information for a specified date range, generates a professional status update email using Google Gemini AI, and sends it via Gmail or Zoho Mail.

## Features

- 🔍 **Fetch GitHub PRs**: Automatically retrieves pull requests created by you within a specified date range
- 🤖 **AI-Powered Email Drafting**: Uses Google Gemini AI to generate professional status update emails
- 📧 **Multi-Provider Email Support**: Send emails via Gmail (with App Password) or Zoho Mail
- ⚙️ **Customizable**: Configure email recipients, subject, and content instructions
- 📅 **Flexible Date Range**: Specify a single day or a range of days for PR analysis

## Tech Stack

- **Node.js**: Runtime environment
- **@octokit/rest**: GitHub API integration
- **@google/generative-ai**: Google Gemini AI SDK
- **nodemailer**: Email sending functionality
- **dotenv**: Environment variable management

## Prerequisites

Before using this tool, you need to obtain the following credentials:

### 1. GitHub Personal Access Token
1. Go to [GitHub Settings > Developer Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token" (classic)
3. Select scopes: `repo`, `read:user`
4. Copy the generated token

### 2. Google Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 3. Email App Password

#### For Gmail:
1. Enable 2-Step Verification on your Google Account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate a new app password for "Mail"
4. Copy the 16-character password

#### For Zoho Mail:
1. Go to Zoho Account Settings > Security > App Passwords
2. Generate a new app password
3. Copy the password

## Installation

1. Clone the repository:
```bash
git clone https://github.com/sarthakg043/status-update-mail-ai-agent.git
cd status-update-mail-ai-agent
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Edit the `.env` file with your credentials:
```env
# GitHub Configuration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_USERNAME=your_github_username

# Google Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# Email Configuration (Gmail example)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_gmail_app_password

# Email Recipients (comma-separated for multiple recipients)
EMAIL_TO=recipient1@example.com,recipient2@example.com

# Email Subject
EMAIL_SUBJECT=Daily Status Update - Pull Requests

# Optional: Date Range (leave empty for today)
START_DATE=2026-02-10
END_DATE=2026-02-11

# User Instructions for AI
USER_INSTRUCTIONS=Please draft a professional status update email summarizing my pull requests. Include PR titles, descriptions, and current status. Keep it concise and highlight any blockers.
```

## Usage

### Quick Start

See [QUICKSTART.md](QUICKSTART.md) for a 5-minute setup guide.

### Run the Agent

```bash
npm start
```

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Examples

Check out [EXAMPLES.md](EXAMPLES.md) for detailed usage examples including:
- Daily status updates
- Weekly team reports
- Project milestone reports
- Automation with cron jobs and task scheduler

## Configuration Options

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GITHUB_TOKEN` | Yes | GitHub Personal Access Token | `ghp_xxxxxxxxxxxxx` |
| `GITHUB_USERNAME` | Yes | Your GitHub username | `sarthakg043` |
| `GEMINI_API_KEY` | Yes | Google Gemini API Key | `AIzaSyxxxxxxxxx` |
| `EMAIL_SERVICE` | Yes | Email service provider | `gmail` or `zoho` |
| `EMAIL_USER` | Yes | Your email address | `user@gmail.com` |
| `EMAIL_APP_PASSWORD` | Yes | Email app password | `xxxx xxxx xxxx xxxx` |
| `EMAIL_TO` | Yes | Recipient email(s) | `boss@company.com` |
| `EMAIL_SUBJECT` | No | Email subject line | `Status Update` |
| `START_DATE` | No | Start date (YYYY-MM-DD) | `2026-02-10` |
| `END_DATE` | No | End date (YYYY-MM-DD) | `2026-02-11` |
| `USER_INSTRUCTIONS` | No | Instructions for AI | Custom instructions |

### Date Range Behavior

- **Both dates specified**: Fetches PRs between START_DATE and END_DATE
- **Only START_DATE specified**: Fetches PRs for that single day
- **No dates specified**: Fetches PRs for today

## Example Output

```
=== Status Update Mail AI Agent ===

Loading configuration...
Configuration loaded successfully

Date Range: 2026-02-10 to 2026-02-11

Initializing services...
Services initialized

Fetching pull requests from GitHub...
Found 3 pull request(s)
Retrieved 3 pull request(s)

Pull Requests Summary:
  1. Add authentication feature (open) - company/project-api
  2. Fix bug in user service (closed) - company/project-backend
  3. Update documentation (open) - company/project-docs

Generating email content with AI...
Email content generated

--- Generated Email Preview ---
To: manager@company.com
Subject: Daily Status Update - Pull Requests
---
[AI-generated professional email content here]
--- End of Preview ---

Sending email...
Email server connection verified
Email sent successfully: <message-id>

✓ Email sent successfully!
✓ Recipients: manager@company.com
✓ Subject: Daily Status Update - Pull Requests
```

## Project Structure

```
status-update-mail-ai-agent/
├── src/
│   ├── index.js          # Main application entry point
│   ├── config.js         # Configuration loader and validator
│   ├── githubService.js  # GitHub API integration
│   ├── aiService.js      # Google Gemini AI integration
│   └── emailService.js   # Email sending functionality
├── .env.example          # Example environment configuration
├── .gitignore            # Git ignore rules
├── package.json          # Project dependencies and scripts
├── package-lock.json     # Dependency lock file
├── README.md             # Main documentation
├── QUICKSTART.md         # Quick setup guide
├── EXAMPLES.md           # Usage examples
├── TROUBLESHOOTING.md    # Troubleshooting guide
├── CONTRIBUTING.md       # Contribution guidelines
├── CHANGELOG.md          # Version history
└── LICENSE               # MIT License
```

## Troubleshooting

For detailed troubleshooting information, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

### Quick Fixes

1. **"Missing required environment variables"**
   - Ensure all required variables are set in your `.env` file
   - Check that `.env` is in the root directory

2. **"Error fetching pull requests"**
   - Verify your GitHub token has the correct permissions
   - Check that your GitHub username is correct

3. **"Error sending email"**
   - Verify your email credentials
   - For Gmail, ensure 2FA is enabled and you're using an App Password
   - Check that EMAIL_SERVICE matches your provider (`gmail` or `zoho`)

4. **"No pull requests found"**
   - Verify the date range
   - Check that you have PRs created in that timeframe
   - Ensure your GitHub username is correct

## Security Notes

- Never commit your `.env` file to version control
- Use app-specific passwords, not your main email password
- Rotate your API keys and tokens regularly
- Keep your dependencies up to date

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

Created by sarthakg043