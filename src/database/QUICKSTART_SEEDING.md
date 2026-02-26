# Database Seeding - Quick Start Guide

## 📦 What Was Created

I've created a comprehensive database seeding system with the following files:

### 1. **seedDatabase.js** - Main Seeding Script
Located at: `src/database/seedDatabase.js`

This is the primary script that populates your MongoDB database with realistic dummy data. It includes:
- 4 subscription plans (Free, Starter, Pro, Enterprise)
- 3 companies with different subscription tiers
- 6 company members across all companies
- 5 contributors with various monitoring configurations
- 2 contributor accounts (for accepted invites)
- 6 repositories across all companies
- 5 monitored contributors with different schedules
- 3 teams grouping contributors
- 3 invites (accepted, sent, etc.)
- 5 summary runs with AI summaries and email statuses

### 2. **testConnection.js** - Connection Verification Script
Located at: `src/database/testConnection.js`

A utility script to quickly test your MongoDB connection and view database statistics.

### 3. **SEEDING.md** - Detailed Documentation
Located at: `src/database/SEEDING.md`

Comprehensive guide covering:
- Prerequisites and setup
- Detailed usage instructions
- Description of all seeded data
- Data relationships diagram
- Troubleshooting tips

## 🚀 Quick Start

### Step 1: Configure MongoDB Connection

Ensure your `.env` file has MongoDB credentials:

```env
MONGODB_USERNAME=your_username
MONGODB_PASSWORD=your_password
MONGODB_HOST=your_host.mongodb.net
MONGODB_DATABASE=status-updates
```

### Step 2: Test Connection

```bash
npm run db:test
```

This will verify your MongoDB connection is working and show existing collections.

### Step 3: Seed the Database

```bash
# Seed with dummy data (preserves existing data)
npm run db:seed

# OR clear all data and reseed from scratch
npm run db:seed:clear
```

## 📊 What You'll Get

After running the seed script, your database will contain:

```
✅ 4 plans
✅ 3 companies (with active subscriptions)
✅ 6 company members (admins, managers, viewers)
✅ 5 contributors (mixed ghost/open monitoring)
✅ 2 contributor accounts (with mail configs)
✅ 6 repositories (private and public)
✅ 5 monitored contributors (various schedules)
✅ 3 teams (grouping contributors)
✅ 3 invites (with different statuses)
✅ 5 summary runs (with AI summaries)
```

## 🎯 Use Cases

This seeded data is perfect for:

1. **Development & Testing**
   - Test API endpoints with realistic data
   - Develop UI components with proper data structures
   - Verify business logic and edge cases

2. **Demo & Presentation**
   - Show different subscription tiers
   - Demonstrate monitoring workflows
   - Display various email statuses

3. **Integration Testing**
   - Test company onboarding flows
   - Verify contributor invitation process
   - Test summary run generation and email delivery

## 📝 Example Queries

After seeding, try these queries:

```javascript
// Find all active companies
db.companies.find({ "subscription.status": "active" })

// Get monitoring configs for a company
db.monitored_contributors.find({ 
  companyId: ObjectId("your_company_id") 
})

// Find all successful summary runs
db.summary_runs.find({ 
  "emailStatus.status": "sent",
  hasActivity: true 
})

// Get contributors with accepted invites
db.invites.find({ status: "accepted" })
```

## 🔄 NPM Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run db:test` | Test MongoDB connection and show stats |
| `npm run db:seed` | Seed database with dummy data |
| `npm run db:seed:clear` | Clear all data and reseed |

## 🎨 Data Highlights

### Companies
- **Acme Corporation** - Pro plan, 5 repos, 12 contributors
- **Tech Innovators Inc** - Starter plan, 3 repos, 8 contributors  
- **Startup Labs** - Free trial, 1 repo, 3 contributors

### Contributors
- **john-dev** - Has account, open monitoring, active PRs
- **sarah-codes** - Ghost monitoring, contract developer
- **mike-fullstack** - Backend team lead with account
- **emma-opensource** - Invited but not accepted yet
- **alex-backend** - New hire on probation

### Sample Summary Runs
- ✅ Successful runs with AI-generated summaries
- ⏭️ Skipped runs (no activity)
- ❌ Failed email delivery (SMTP timeout)
- 📅 Both scheduled and manual triggers

## 🛠️ Customization

To modify the seed data:

1. Open `src/database/seedDatabase.js`
2. Edit the methods like `seedCompanies()`, `seedContributors()`, etc.
3. Adjust data to match your testing needs
4. Run `npm run db:seed:clear` to apply changes

## ⚠️ Important Notes

- **Foreign Keys**: The script maintains proper relationships between collections
- **Timestamps**: All records have realistic `createdAt` and `updatedAt` dates
- **Indexes**: Collections are initialized with proper indexes for performance
- **Clear Flag**: Use `--clear` carefully as it deletes ALL existing data

## 📚 Additional Resources

- Full documentation: [SEEDING.md](./SEEDING.md)
- Database schema: [README.md](./README.md)
- Integration guide: [INTEGRATION.md](./INTEGRATION.md)

## 🐛 Troubleshooting

### "Failed to connect to MongoDB"
- Verify credentials in `.env` file
- Check IP whitelist in MongoDB Atlas
- Ensure network connectivity

### "E11000 duplicate key error"
- Run with `--clear` flag to remove existing data
- Or manually drop collections in MongoDB

### "Cannot find module 'mongodb'"
- Run `npm install` to install dependencies

## ✅ Success Checklist

- [ ] MongoDB credentials configured in `.env`
- [ ] Connection test passes (`npm run db:test`)
- [ ] Database seeded successfully (`npm run db:seed`)
- [ ] Can query data in MongoDB Compass or shell
- [ ] All 10 collections have expected document counts

---

**Ready to seed your database?** Run `npm run db:test` first, then `npm run db:seed`!
