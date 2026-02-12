# Quick Reference Card

## Essential Commands

```bash
# Install
npm install

# Run
npm start

# Development (auto-reload)
npm run dev
```

## Required Environment Variables

```env
GITHUB_TOKEN=ghp_xxxxx          # GitHub Personal Access Token
GITHUB_USERNAME=yourname        # Your GitHub username
GEMINI_API_KEY=AIzaSyxxxxx     # Google Gemini API Key
EMAIL_SERVICE=gmail             # gmail or zoho
EMAIL_USER=you@gmail.com        # Your email
EMAIL_APP_PASSWORD=xxxxx        # App Password (not regular password!)
EMAIL_TO=recipient@example.com  # Recipient(s), comma-separated
EMAIL_SUBJECT=Status Update     # Email subject
```

## Optional Variables

```env
START_DATE=2026-02-10           # Leave empty for today
END_DATE=2026-02-11             # Leave empty for today
USER_INSTRUCTIONS=Custom...     # AI instructions for email format
```

## Getting Credentials

| What | Where |
|------|-------|
| GitHub Token | https://github.com/settings/tokens |
| Gemini API Key | https://makersuite.google.com/app/apikey |
| Gmail App Password | https://myaccount.google.com/apppasswords |

## Quick Troubleshooting

| Error | Fix |
|-------|-----|
| "Missing required environment variables" | Check `.env` file exists and is complete |
| "Error fetching pull requests" | Verify GitHub token permissions (`repo`, `read:user`) |
| "Error sending email" | Use App Password, not regular password |
| "No pull requests found" | Normal if no PRs in date range |

## File Structure

```
src/
  index.js          → Main app
  config.js         → Configuration
  githubService.js  → Fetch PRs
  aiService.js      → Generate email
  emailService.js   → Send email
```

## Common Use Cases

**Daily update (today's PRs):**
```env
START_DATE=
END_DATE=
```

**Weekly update:**
```env
START_DATE=2026-02-05
END_DATE=2026-02-11
```

**Multiple recipients:**
```env
EMAIL_TO=boss@co.com,team@co.com
```

## Example Output

```
=== Status Update Mail AI Agent ===
Loading configuration...
Date Range: 2026-02-11 to 2026-02-11
Fetching pull requests from GitHub...
Found 2 pull request(s)
Generating email content with AI...
Sending email...
✓ Email sent successfully!
```

## Need Help?

- 📖 Full docs: [README.md](README.md)
- 🚀 Quick start: [QUICKSTART.md](QUICKSTART.md)  
- 🔧 Problems: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- 💡 Examples: [EXAMPLES.md](EXAMPLES.md)

## Security Checklist

- [x] No hardcoded credentials
- [x] Using App Passwords
- [x] `.env` in `.gitignore`
- [x] Regular token rotation
- [x] 0 npm vulnerabilities

---

**Version**: 1.0.0 | **License**: MIT
