# Database Seeding Guide

This guide explains how to populate your MongoDB database with realistic dummy data for testing and development.

## Prerequisites

1. **MongoDB Connection**: Ensure you have MongoDB credentials configured in your `.env` file:
   ```env
   MONGODB_USERNAME=your_username
   MONGODB_PASSWORD=your_password
   MONGODB_HOST=your_host.mongodb.net
   MONGODB_DATABASE=status-updates
   ```

2. **Node.js Dependencies**: Make sure all dependencies are installed:
   ```bash
   npm install
   ```

## Running the Seed Script

### Basic Usage

To seed the database with dummy data:

```bash
node src/database/seedDatabase.js
```

This will:
- Connect to your MongoDB database
- Initialize all collections with proper schemas and indexes
- Insert dummy data for all collections
- Maintain referential integrity between collections

### Clear Existing Data

To clear all existing data and reseed from scratch:

```bash
node src/database/seedDatabase.js --clear
# or
node src/database/seedDatabase.js -c
```

⚠️ **Warning**: This will delete all existing data in the collections!

## What Gets Seeded

The script creates realistic dummy data for all collections:

### 1. **Plans** (4 records)
- Free plan (1 repo, 5 contributors, 50 emails/month)
- Starter plan ($29/month, 5 repos, 20 contributors, 500 emails/month)
- Pro plan ($99/month, 20 repos, 100 contributors, 2000 emails/month)
- Enterprise plan ($299/month, 100 repos, 500 contributors, 10000 emails/month)

### 2. **Companies** (3 records)
- Acme Corporation (Pro plan, 5 repos, 12 contributors)
- Tech Innovators Inc (Starter plan, 3 repos, 8 contributors)
- Startup Labs (Free plan/trial, 1 repo, 3 contributors)

### 3. **Company Members** (6 records)
- 3 members for Acme Corp (admin, manager, viewer)
- 2 members for Tech Innovators (admin, manager)
- 1 member for Startup Labs (admin)

### 4. **Contributors** (5 records)
- john-dev (has account, open monitoring)
- sarah-codes (no account, ghost monitoring)
- mike-fullstack (has account, open monitoring)
- emma-opensource (no account, invite sent)
- alex-backend (no account, ghost monitoring)

### 5. **Contributor Accounts** (2 records)
- Accounts for contributors who accepted invites
- Includes mail config and saved templates

### 6. **Repositories** (6 records)
- 3 repos for Acme Corp (web-app, mobile-app, api-backend)
- 2 repos for Tech Innovators (core-service, frontend)
- 1 repo for Startup Labs (mvp-product)

### 7. **Monitored Contributors** (5 records)
- Various monitoring configurations (ghost/open mode)
- Different schedules (daily, specific weekdays)
- Mix of invite statuses (accepted, sent, not_sent)

### 8. **Teams** (3 records)
- Frontend Team at Acme Corp
- Backend Team at Acme Corp
- Core Team at Tech Innovators

### 9. **Invites** (3 records)
- Accepted invites for john-dev and mike-fullstack
- Pending invite for emma-opensource

### 10. **Summary Runs** (5 records)
- Successful runs with AI summaries and PR stats
- Failed email delivery example
- Runs with no activity (skipped emails)
- Both scheduled and manual trigger types

## Data Relationships

The seed script respects all foreign key relationships:

```
plans
  └─> companies
        ├─> company_members
        ├─> repositories
        └─> monitored_contributors
              ├─> invites
              └─> summary_runs

contributors
  ├─> contributor_accounts
  ├─> monitored_contributors
  │     ├─> invites
  │     └─> summary_runs
  └─> teams
```

## Verification

After seeding, you can verify the data using MongoDB Compass or the mongo shell:

```javascript
// Connect to your database and run:
db.companies.countDocuments()        // Should return 3
db.contributors.countDocuments()     // Should return 5
db.summary_runs.countDocuments()     // Should return 5

// Check a specific company with its relationships:
db.companies.findOne({ name: "Acme Corporation" })
```

## Using Seeded Data

The seeded data includes:
- Valid Clerk organization IDs and user IDs
- Realistic GitHub usernames and repo names
- Proper timestamps and date ranges
- Various monitoring configurations
- Email delivery statuses (sent, failed, skipped)
- AI-generated summaries for successful runs

You can use this data to:
- Test API endpoints
- Develop UI components
- Verify business logic
- Test email scheduling
- Simulate different monitoring scenarios

## Customization

To customize the seed data, edit `src/database/seedDatabase.js` and modify the data in methods like:
- `seedPlans()`
- `seedCompanies()`
- `seedContributors()`
- etc.

## Troubleshooting

### Connection Errors
```
Error: Failed to connect to MongoDB
```
**Solution**: Verify your MongoDB credentials in `.env` file

### Duplicate Key Errors
```
E11000 duplicate key error
```
**Solution**: Clear existing data first with `--clear` flag

### Missing Dependencies
```
Error: Cannot find module 'mongodb'
```
**Solution**: Run `npm install` to install dependencies

## Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Database Schema Documentation](./README.md)
- [Integration Guide](./INTEGRATION.md)
