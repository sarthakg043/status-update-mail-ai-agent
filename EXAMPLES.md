# Examples

This directory contains example configurations and use cases for the Status Update Mail AI Agent.

## Example 1: Daily Status Update

**Scenario**: Send a daily status update email for today's PRs

**Configuration (`.env`)**:
```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
GITHUB_USERNAME=johndoe
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxx
EMAIL_SERVICE=gmail
EMAIL_USER=john.doe@company.com
EMAIL_APP_PASSWORD=abcdabcdabcdabcd
EMAIL_TO=manager@company.com
EMAIL_SUBJECT=Daily Status Update - [Your Name]
START_DATE=
END_DATE=
USER_INSTRUCTIONS=Please draft a brief daily status update. Highlight what I've accomplished today through my pull requests.
```

## Example 2: Weekly Team Update

**Scenario**: Send a weekly summary every Friday

**Configuration (`.env`)**:
```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
GITHUB_USERNAME=johndoe
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxx
EMAIL_SERVICE=gmail
EMAIL_USER=john.doe@company.com
EMAIL_APP_PASSWORD=abcdabcdabcdabcd
EMAIL_TO=team@company.com,manager@company.com
EMAIL_SUBJECT=Weekly Update - Week of Feb 5-11
START_DATE=2026-02-05
END_DATE=2026-02-11
USER_INSTRUCTIONS=Create a comprehensive weekly summary of my contributions. Group by repository and highlight major accomplishments. Keep it professional but friendly.
```

## Example 3: Project Milestone Report

**Scenario**: Report on sprint contributions

**Configuration (`.env`)**:
```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
GITHUB_USERNAME=johndoe
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxx
EMAIL_SERVICE=zoho
EMAIL_USER=john.doe@company.com
EMAIL_APP_PASSWORD=xyzxyzxyzxyzxyzx
EMAIL_TO=stakeholders@company.com,projectmanager@company.com
EMAIL_SUBJECT=Sprint 23 Contribution Report
START_DATE=2026-02-01
END_DATE=2026-02-14
USER_INSTRUCTIONS=Generate a detailed report of my sprint contributions. Include PR status, repositories, and impact. Organize by priority and highlight any blocked items.
```

## Example 4: Multiple Recipients with Detailed Instructions

**Configuration (`.env`)**:
```env
USER_INSTRUCTIONS=Please create a professional status update email with the following structure:
1. Summary: Brief overview of number of PRs and their status
2. Completed Work: List all merged PRs with repository names
3. In Progress: List all open PRs and their current state
4. Blockers: Highlight any PRs awaiting review or facing issues
5. Next Steps: Brief mention of upcoming work
Keep the tone professional and concise.
```

## Cron Job Example (Linux/Mac)

To automate daily emails at 5 PM:

```bash
# Open crontab
crontab -e

# Add this line (adjust path as needed)
0 17 * * * cd /path/to/status-update-mail-ai-agent && /usr/bin/node src/index.js >> /tmp/status-update.log 2>&1
```

## Windows Task Scheduler Example

1. Open Task Scheduler
2. Create Basic Task
3. Name: "Daily Status Update"
4. Trigger: Daily at 5:00 PM
5. Action: Start a program
6. Program: `node.exe`
7. Arguments: `src/index.js`
8. Start in: `C:\path\to\status-update-mail-ai-agent`

## Custom Date Range Script

Create a shell script for custom reporting:

```bash
#!/bin/bash
# weekly-report.sh

# Set environment variables
export GITHUB_TOKEN="your_token"
export GITHUB_USERNAME="your_username"
export GEMINI_API_KEY="your_key"
export EMAIL_SERVICE="gmail"
export EMAIL_USER="your_email@gmail.com"
export EMAIL_APP_PASSWORD="your_app_password"
export EMAIL_TO="manager@company.com"
export EMAIL_SUBJECT="Weekly Report - $(date +%Y-%m-%d)"

# Calculate date range (last 7 days)
export END_DATE=$(date +%Y-%m-%d)
export START_DATE=$(date -d '7 days ago' +%Y-%m-%d)

# Run the agent
node src/index.js
```

Make it executable:
```bash
chmod +x weekly-report.sh
./weekly-report.sh
```

## Tips for Effective Use

1. **Start Small**: Begin with daily updates for yourself to understand the output
2. **Refine Instructions**: Iterate on USER_INSTRUCTIONS to match your style
3. **Test Date Ranges**: Try different date ranges to ensure comprehensive coverage
4. **Multiple Configs**: Create different .env files for different scenarios
5. **Automation**: Use cron jobs or task scheduler for hands-free operation
