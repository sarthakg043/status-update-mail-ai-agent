# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-11

### Added
- Initial release of Status Update Mail AI Agent
- GitHub PR fetching functionality for specified date ranges
- Google Gemini AI integration for email content generation
- Email sending support via Gmail and Zoho Mail
- Comprehensive configuration via environment variables
- User-customizable email instructions
- HTML email formatting
- Detailed logging and error handling
- Complete documentation and setup guide

### Features
- Fetch PRs created by user within date range
- AI-powered professional email drafting
- Multi-recipient email support
- Flexible date range configuration (single day or range)
- Support for Gmail App Password authentication
- Support for Zoho Mail authentication
- Email preview before sending
- Security: No hardcoded credentials
- Comprehensive README with troubleshooting guide

### Dependencies
- @google/generative-ai: ^0.21.0
- @octokit/rest: ^21.0.2
- dotenv: ^16.4.5
- nodemailer: ^8.0.1 (updated for security)

### Security
- Updated nodemailer to version 8.0.1 to address moderate severity vulnerabilities
- Environment-based credential management
- No sensitive data in repository
