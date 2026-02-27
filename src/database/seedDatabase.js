#!/usr/bin/env node
/**
 * MongoDB Database Seeding Script
 * 
 * This script populates the database with realistic dummy data for all collections.
 * Run with: node src/database/seedDatabase.js
 * 
 * Environment variables required:
 * - MONGODB_USERNAME
 * - MONGODB_PASSWORD
 * - MONGODB_HOST (optional, defaults to status-update-ai-main.0mr0frx.mongodb.net)
 * - MONGODB_DATABASE (optional, defaults to status-updates)
 */

require('dotenv').config();
const { ObjectId } = require('mongodb');
const { getMongoConnection } = require('./mongodb');
const { initAllCollections } = require('./initCollections');
const { COLLECTIONS } = require('./collections');

/**
 * Generate dummy data for all collections
 */
class DatabaseSeeder {
  constructor() {
    this.connection = getMongoConnection();
    this.db = null;
    this.insertedIds = {};
  }

  async connect() {
    this.db = await this.connection.connect();
    console.log('✓ Connected to database\n');
  }

  async disconnect() {
    await this.connection.disconnect();
    console.log('\n✓ Disconnected from database');
  }

  /**
   * Clear all collections (optional - use with caution)
   */
  async clearAllCollections() {
    console.log('⚠️  Clearing all existing data...\n');
    
    const collections = Object.values(COLLECTIONS);
    for (const collectionName of collections) {
      try {
        await this.db.collection(collectionName).deleteMany({});
        console.log(`  ✓ Cleared ${collectionName}`);
      } catch (error) {
        console.log(`  ⚠️  Could not clear ${collectionName}: ${error.message}`);
      }
    }
    console.log('');
  }

  /**
   * Seed Plans Collection
   */
  async seedPlans() {
    console.log('📊 Seeding plans...');
    
    const plans = [
      {
        _id: new ObjectId(),
        name: 'free',
        displayName: 'Free',
        priceMonthly: 0,
        priceYearly: 0,
        stripePriceIdMonthly: null,
        stripePriceIdYearly: null,
        limits: {
          maxRepos: 1,
          maxContributors: 5,
          maxEmailsPerMonth: 50,
        },
        isActive: true,
        createdAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: 'starter',
        displayName: 'Starter',
        priceMonthly: 29,
        priceYearly: 290,
        stripePriceIdMonthly: 'price_starter_monthly',
        stripePriceIdYearly: 'price_starter_yearly',
        limits: {
          maxRepos: 5,
          maxContributors: 20,
          maxEmailsPerMonth: 500,
        },
        isActive: true,
        createdAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: 'pro',
        displayName: 'Professional',
        priceMonthly: 99,
        priceYearly: 990,
        stripePriceIdMonthly: 'price_pro_monthly',
        stripePriceIdYearly: 'price_pro_yearly',
        limits: {
          maxRepos: 20,
          maxContributors: 100,
          maxEmailsPerMonth: 2000,
        },
        isActive: true,
        createdAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: 'enterprise',
        displayName: 'Enterprise',
        priceMonthly: 299,
        priceYearly: 2990,
        stripePriceIdMonthly: 'price_enterprise_monthly',
        stripePriceIdYearly: 'price_enterprise_yearly',
        limits: {
          maxRepos: 100,
          maxContributors: 500,
          maxEmailsPerMonth: 10000,
        },
        isActive: true,
        createdAt: new Date(),
      },
    ];

    await this.db.collection(COLLECTIONS.PLANS).insertMany(plans);
    this.insertedIds.plans = plans.map(p => p._id);
    console.log(`  ✓ Created ${plans.length} plans\n`);
    
    return plans;
  }

  /**
   * Seed Companies Collection
   */
  async seedCompanies(plans) {
    console.log('🏢 Seeding companies...');
    
    const companies = [
      {
        _id: new ObjectId(),
        clerkOrgId: 'org_clerk_acme_corp_001',
        name: 'Acme Corporation',
        email: 'admin@acme-corp.com',
        logoUrl: 'https://example.com/logos/acme.png',
        subscription: {
          planId: plans[2]._id, // Pro plan
          planName: 'pro',
          status: 'active',
          stripeCustomerId: 'cus_acme_stripe_123',
          stripeSubscriptionId: 'sub_acme_stripe_456',
          currentPeriodStart: new Date('2026-01-01'),
          currentPeriodEnd: new Date('2026-02-01'),
          limits: {
            maxRepos: 20,
            maxContributors: 100,
            maxEmailsPerMonth: 2000,
          },
          usage: {
            reposCount: 5,
            contributorsCount: 12,
            emailsSentThisMonth: 145,
            usagePeriodStart: new Date('2026-02-01'),
          },
        },
        settings: {
          defaultMonitoringType: 'ghost',
          timezone: 'America/New_York',
        },
        createdAt: new Date('2025-12-01'),
        updatedAt: new Date('2026-02-15'),
      },
      {
        _id: new ObjectId(),
        clerkOrgId: 'org_clerk_tech_innovators_002',
        name: 'Tech Innovators Inc',
        email: 'hello@techinnovators.io',
        logoUrl: 'https://example.com/logos/techinnovators.png',
        subscription: {
          planId: plans[1]._id, // Starter plan
          planName: 'starter',
          status: 'active',
          stripeCustomerId: 'cus_tech_stripe_789',
          stripeSubscriptionId: 'sub_tech_stripe_012',
          currentPeriodStart: new Date('2026-02-01'),
          currentPeriodEnd: new Date('2026-03-01'),
          limits: {
            maxRepos: 5,
            maxContributors: 20,
            maxEmailsPerMonth: 500,
          },
          usage: {
            reposCount: 3,
            contributorsCount: 8,
            emailsSentThisMonth: 67,
            usagePeriodStart: new Date('2026-02-01'),
          },
        },
        settings: {
          defaultMonitoringType: 'open',
          timezone: 'America/Los_Angeles',
        },
        createdAt: new Date('2026-01-15'),
        updatedAt: new Date('2026-02-20'),
      },
      {
        _id: new ObjectId(),
        clerkOrgId: 'org_clerk_startup_labs_003',
        name: 'Startup Labs',
        email: 'team@startuplabs.dev',
        logoUrl: null,
        subscription: {
          planId: plans[0]._id, // Free plan
          planName: 'free',
          status: 'trialing',
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          currentPeriodStart: new Date('2026-02-20'),
          currentPeriodEnd: new Date('2026-03-20'),
          limits: {
            maxRepos: 1,
            maxContributors: 5,
            maxEmailsPerMonth: 50,
          },
          usage: {
            reposCount: 1,
            contributorsCount: 3,
            emailsSentThisMonth: 12,
            usagePeriodStart: new Date('2026-02-20'),
          },
        },
        settings: {
          defaultMonitoringType: 'ghost',
          timezone: 'UTC',
        },
        createdAt: new Date('2026-02-20'),
        updatedAt: new Date('2026-02-20'),
      },
    ];

    await this.db.collection(COLLECTIONS.COMPANIES).insertMany(companies);
    this.insertedIds.companies = companies.map(c => c._id);
    console.log(`  ✓ Created ${companies.length} companies\n`);
    
    return companies;
  }

  /**
   * Seed Company Members Collection
   */
  async seedCompanyMembers(companies) {
    console.log('👥 Seeding company members...');
    
    const members = [
      // Acme Corporation members
      {
        _id: new ObjectId(),
        companyId: companies[0]._id,
        clerkUserId: 'user_clerk_alice_001',
        email: 'alice@acme-corp.com',
        name: 'Alice Johnson',
        role: 'admin',
        isActive: true,
        createdAt: new Date('2025-12-01'),
        updatedAt: new Date('2025-12-01'),
      },
      {
        _id: new ObjectId(),
        companyId: companies[0]._id,
        clerkUserId: 'user_clerk_bob_002',
        email: 'bob@acme-corp.com',
        name: 'Bob Smith',
        role: 'manager',
        isActive: true,
        createdAt: new Date('2025-12-05'),
        updatedAt: new Date('2025-12-05'),
      },
      {
        _id: new ObjectId(),
        companyId: companies[0]._id,
        clerkUserId: 'user_clerk_charlie_003',
        email: 'charlie@acme-corp.com',
        name: 'Charlie Brown',
        role: 'viewer',
        isActive: true,
        createdAt: new Date('2025-12-10'),
        updatedAt: new Date('2025-12-10'),
      },
      // Tech Innovators members
      {
        _id: new ObjectId(),
        companyId: companies[1]._id,
        clerkUserId: 'user_clerk_diana_004',
        email: 'diana@techinnovators.io',
        name: 'Diana Prince',
        role: 'admin',
        isActive: true,
        createdAt: new Date('2026-01-15'),
        updatedAt: new Date('2026-01-15'),
      },
      {
        _id: new ObjectId(),
        companyId: companies[1]._id,
        clerkUserId: 'user_clerk_eric_005',
        email: 'eric@techinnovators.io',
        name: 'Eric Taylor',
        role: 'manager',
        isActive: true,
        createdAt: new Date('2026-01-20'),
        updatedAt: new Date('2026-01-20'),
      },
      // Startup Labs members
      {
        _id: new ObjectId(),
        companyId: companies[2]._id,
        clerkUserId: 'user_clerk_frank_006',
        email: 'frank@startuplabs.dev',
        name: 'Frank Ocean',
        role: 'admin',
        isActive: true,
        createdAt: new Date('2026-02-20'),
        updatedAt: new Date('2026-02-20'),
      },
    ];

    await this.db.collection(COLLECTIONS.COMPANY_MEMBERS).insertMany(members);
    this.insertedIds.companyMembers = members.map(m => m._id);
    console.log(`  ✓ Created ${members.length} company members\n`);
    
    return members;
  }

  /**
   * Seed Contributors Collection
   */
  async seedContributors() {
    console.log('👤 Seeding contributors...');
    
    const contributors = [
      {
        _id: new ObjectId(),
        githubUsername: 'john-dev',
        githubUserId: 12345678,
        githubProfileUrl: 'https://github.com/john-dev',
        avatarUrl: 'https://avatars.githubusercontent.com/u/12345678',
        discoveredEmails: [
          {
            email: 'john@example.com',
            source: 'commit',
            discoveredAt: new Date('2025-11-15'),
          },
          {
            email: 'john.dev@gmail.com',
            source: 'github_profile',
            discoveredAt: new Date('2025-11-20'),
          },
        ],
        hasAccount: true,
        clerkUserId: 'user_clerk_john_dev_007',
        createdAt: new Date('2025-11-15'),
        updatedAt: new Date('2026-01-10'),
      },
      {
        _id: new ObjectId(),
        githubUsername: 'sarah-codes',
        githubUserId: 23456789,
        githubProfileUrl: 'https://github.com/sarah-codes',
        avatarUrl: 'https://avatars.githubusercontent.com/u/23456789',
        discoveredEmails: [
          {
            email: 'sarah@example.com',
            source: 'commit',
            discoveredAt: new Date('2025-12-01'),
          },
        ],
        hasAccount: false,
        clerkUserId: null,
        createdAt: new Date('2025-12-01'),
        updatedAt: new Date('2026-02-01'),
      },
      {
        _id: new ObjectId(),
        githubUsername: 'mike-fullstack',
        githubUserId: 34567890,
        githubProfileUrl: 'https://github.com/mike-fullstack',
        avatarUrl: 'https://avatars.githubusercontent.com/u/34567890',
        discoveredEmails: [
          {
            email: 'mike@techmail.com',
            source: 'manual',
            discoveredAt: new Date('2026-01-05'),
          },
        ],
        hasAccount: true,
        clerkUserId: 'user_clerk_mike_fullstack_008',
        createdAt: new Date('2026-01-05'),
        updatedAt: new Date('2026-02-10'),
      },
      {
        _id: new ObjectId(),
        githubUsername: 'emma-opensource',
        githubUserId: 45678901,
        githubProfileUrl: 'https://github.com/emma-opensource',
        avatarUrl: 'https://avatars.githubusercontent.com/u/45678901',
        discoveredEmails: [
          {
            email: 'emma@oss.dev',
            source: 'github_profile',
            discoveredAt: new Date('2026-01-10'),
          },
        ],
        hasAccount: false,
        clerkUserId: null,
        createdAt: new Date('2026-01-10'),
        updatedAt: new Date('2026-02-15'),
      },
      {
        _id: new ObjectId(),
        githubUsername: 'alex-backend',
        githubUserId: 56789012,
        githubProfileUrl: 'https://github.com/alex-backend',
        avatarUrl: 'https://avatars.githubusercontent.com/u/56789012',
        discoveredEmails: [
          {
            email: 'alex@backend.io',
            source: 'commit',
            discoveredAt: new Date('2026-02-01'),
          },
        ],
        hasAccount: false,
        clerkUserId: null,
        createdAt: new Date('2026-02-01'),
        updatedAt: new Date('2026-02-20'),
      },
    ];

    await this.db.collection(COLLECTIONS.CONTRIBUTORS).insertMany(contributors);
    this.insertedIds.contributors = contributors.map(c => c._id);
    console.log(`  ✓ Created ${contributors.length} contributors\n`);
    
    return contributors;
  }

  /**
   * Seed Contributor Accounts Collection
   */
  async seedContributorAccounts(contributors) {
    console.log('🔐 Seeding contributor accounts...');
    
    // Only create accounts for contributors who have accepted invites (hasAccount: true)
    const contributorsWithAccounts = contributors.filter(c => c.hasAccount);
    
    const accounts = [
      {
        _id: new ObjectId(),
        contributorId: contributorsWithAccounts[0]._id,
        clerkUserId: contributorsWithAccounts[0].clerkUserId,
        name: 'John Developer',
        personalEmail: 'john.dev@gmail.com',
        mailConfig: {
          provider: 'gmail',
          email: 'john.dev@gmail.com',
          encryptedAppPassword: 'encrypted_password_hash_abc123',
        },
        savedTemplates: [
          {
            _id: new ObjectId(),
            title: 'Weekly Update Template',
            content: 'This week I worked on:\n- [Task 1]\n- [Task 2]\n\nNext week I plan to:\n- [Task 3]',
            createdAt: new Date('2026-01-15'),
            updatedAt: new Date('2026-01-15'),
          },
        ],
        createdAt: new Date('2026-01-10'),
        updatedAt: new Date('2026-02-01'),
      },
      {
        _id: new ObjectId(),
        contributorId: contributorsWithAccounts[1]._id,
        clerkUserId: contributorsWithAccounts[1].clerkUserId,
        name: 'Mike Fullstack',
        personalEmail: 'mike@techmail.com',
        mailConfig: {
          provider: 'zoho',
          email: 'mike@techmail.com',
          encryptedAppPassword: 'encrypted_password_hash_def456',
        },
        savedTemplates: [],
        createdAt: new Date('2026-02-10'),
        updatedAt: new Date('2026-02-10'),
      },
    ];

    await this.db.collection(COLLECTIONS.CONTRIBUTOR_ACCOUNTS).insertMany(accounts);
    this.insertedIds.contributorAccounts = accounts.map(a => a._id);
    console.log(`  ✓ Created ${accounts.length} contributor accounts\n`);
    
    return accounts;
  }

  /**
   * Seed Repositories Collection
   */
  async seedRepositories(companies) {
    console.log('📦 Seeding repositories...');
    
    const repositories = [
      // Acme Corporation repos
      {
        _id: new ObjectId(),
        companyId: companies[0]._id,
        githubRepoId: 111111111,
        owner: 'acme-corp',
        name: 'web-app',
        fullName: 'acme-corp/web-app',
        isPrivate: true,
        encryptedAccessToken: 'encrypted_token_acme_web_app_xyz789',
        tokenAddedBy: this.insertedIds.companyMembers[0],
        status: 'active',
        lastSyncedAt: new Date('2026-02-25'),
        createdAt: new Date('2025-12-01'),
        updatedAt: new Date('2026-02-25'),
      },
      {
        _id: new ObjectId(),
        companyId: companies[0]._id,
        githubRepoId: 222222222,
        owner: 'acme-corp',
        name: 'mobile-app',
        fullName: 'acme-corp/mobile-app',
        isPrivate: true,
        encryptedAccessToken: 'encrypted_token_acme_mobile_app_abc123',
        tokenAddedBy: this.insertedIds.companyMembers[0],
        status: 'active',
        lastSyncedAt: new Date('2026-02-24'),
        createdAt: new Date('2025-12-10'),
        updatedAt: new Date('2026-02-24'),
      },
      {
        _id: new ObjectId(),
        companyId: companies[0]._id,
        githubRepoId: 333333333,
        owner: 'acme-corp',
        name: 'api-backend',
        fullName: 'acme-corp/api-backend',
        isPrivate: true,
        encryptedAccessToken: 'encrypted_token_acme_api_backend_def456',
        tokenAddedBy: this.insertedIds.companyMembers[1],
        status: 'active',
        lastSyncedAt: new Date('2026-02-25'),
        createdAt: new Date('2025-12-05'),
        updatedAt: new Date('2026-02-25'),
      },
      // Tech Innovators repos
      {
        _id: new ObjectId(),
        companyId: companies[1]._id,
        githubRepoId: 444444444,
        owner: 'tech-innovators',
        name: 'core-service',
        fullName: 'tech-innovators/core-service',
        isPrivate: false,
        encryptedAccessToken: 'encrypted_token_tech_core_service_ghi789',
        tokenAddedBy: this.insertedIds.companyMembers[3],
        status: 'active',
        lastSyncedAt: new Date('2026-02-26'),
        createdAt: new Date('2026-01-15'),
        updatedAt: new Date('2026-02-26'),
      },
      {
        _id: new ObjectId(),
        companyId: companies[1]._id,
        githubRepoId: 555555555,
        owner: 'tech-innovators',
        name: 'frontend',
        fullName: 'tech-innovators/frontend',
        isPrivate: false,
        encryptedAccessToken: 'encrypted_token_tech_frontend_jkl012',
        tokenAddedBy: this.insertedIds.companyMembers[3],
        status: 'active',
        lastSyncedAt: new Date('2026-02-26'),
        createdAt: new Date('2026-01-20'),
        updatedAt: new Date('2026-02-26'),
      },
      // Startup Labs repos
      {
        _id: new ObjectId(),
        companyId: companies[2]._id,
        githubRepoId: 666666666,
        owner: 'startup-labs',
        name: 'mvp-product',
        fullName: 'startup-labs/mvp-product',
        isPrivate: true,
        encryptedAccessToken: 'encrypted_token_startup_mvp_mno345',
        tokenAddedBy: this.insertedIds.companyMembers[5],
        status: 'active',
        lastSyncedAt: new Date('2026-02-25'),
        createdAt: new Date('2026-02-20'),
        updatedAt: new Date('2026-02-25'),
      },
    ];

    await this.db.collection(COLLECTIONS.REPOSITORIES).insertMany(repositories);
    this.insertedIds.repositories = repositories.map(r => r._id);
    console.log(`  ✓ Created ${repositories.length} repositories\n`);
    
    return repositories;
  }

  /**
   * Seed Monitored Contributors Collection
   */
  async seedMonitoredContributors(companies, contributors, repositories) {
    console.log('👁️  Seeding monitored contributors...');
    
    const monitoredContributors = [
      // Acme Corp monitoring john-dev in web-app
      {
        _id: new ObjectId(),
        companyId: companies[0]._id,
        contributorId: contributors[0]._id,
        repositoryId: repositories[0]._id,
        githubUsername: contributors[0].githubUsername,
        repoFullName: repositories[0].fullName,
        monitoringType: 'open',
        status: 'active',
        inviteStatus: 'accepted',
        inviteEmail: 'john@example.com',
        schedule: {
          type: 'specific_weekdays',
          config: {
            weekdays: [1, 3, 5], // Monday, Wednesday, Friday
          },
          time: '09:00',
          timezone: 'America/New_York',
          isActive: true,
          nextRunAt: new Date('2026-02-28T09:00:00'),
          lastRunAt: new Date('2026-02-26T09:00:00'),
        },
        fetchConfig: {
          windowType: 'since_last_run',
          dateRange: null,
        },
        recipients: ['alice@acme-corp.com', 'bob@acme-corp.com'],
        contributorNote: 'Senior frontend developer - focus on React components',
        createdAt: new Date('2025-12-01'),
        updatedAt: new Date('2026-02-26'),
      },
      // Acme Corp monitoring sarah-codes in web-app (ghost mode)
      {
        _id: new ObjectId(),
        companyId: companies[0]._id,
        contributorId: contributors[1]._id,
        repositoryId: repositories[0]._id,
        githubUsername: contributors[1].githubUsername,
        repoFullName: repositories[0].fullName,
        monitoringType: 'ghost',
        status: 'active',
        inviteStatus: 'not_sent',
        inviteEmail: null,
        schedule: {
          type: 'daily',
          config: {},
          time: '17:00',
          timezone: 'America/New_York',
          isActive: true,
          nextRunAt: new Date('2026-02-27T17:00:00'),
          lastRunAt: new Date('2026-02-26T17:00:00'),
        },
        fetchConfig: {
          windowType: 'since_last_run',
          dateRange: null,
        },
        recipients: ['bob@acme-corp.com'],
        contributorNote: 'Contract developer - UI/UX specialist',
        createdAt: new Date('2026-01-10'),
        updatedAt: new Date('2026-02-26'),
      },
      // Acme Corp monitoring mike-fullstack in api-backend
      {
        _id: new ObjectId(),
        companyId: companies[0]._id,
        contributorId: contributors[2]._id,
        repositoryId: repositories[2]._id,
        githubUsername: contributors[2].githubUsername,
        repoFullName: repositories[2].fullName,
        monitoringType: 'open',
        status: 'active',
        inviteStatus: 'accepted',
        inviteEmail: 'mike@techmail.com',
        schedule: {
          type: 'specific_weekdays',
          config: {
            weekdays: [2, 4], // Tuesday, Thursday
          },
          time: '10:00',
          timezone: 'America/New_York',
          isActive: true,
          nextRunAt: new Date('2026-02-27T10:00:00'),
          lastRunAt: new Date('2026-02-25T10:00:00'),
        },
        fetchConfig: {
          windowType: 'since_last_run',
          dateRange: null,
        },
        recipients: ['alice@acme-corp.com'],
        contributorNote: 'Backend team lead',
        createdAt: new Date('2026-01-15'),
        updatedAt: new Date('2026-02-25'),
      },
      // Tech Innovators monitoring emma-opensource in core-service
      {
        _id: new ObjectId(),
        companyId: companies[1]._id,
        contributorId: contributors[3]._id,
        repositoryId: repositories[3]._id,
        githubUsername: contributors[3].githubUsername,
        repoFullName: repositories[3].fullName,
        monitoringType: 'ghost',
        status: 'active',
        inviteStatus: 'sent',
        inviteEmail: 'emma@oss.dev',
        schedule: {
          type: 'daily',
          config: {},
          time: '08:00',
          timezone: 'America/Los_Angeles',
          isActive: true,
          nextRunAt: new Date('2026-02-27T08:00:00'),
          lastRunAt: new Date('2026-02-26T08:00:00'),
        },
        fetchConfig: {
          windowType: 'since_last_run',
          dateRange: null,
        },
        recipients: ['diana@techinnovators.io'],
        contributorNote: 'Open source contributor - microservices expert',
        createdAt: new Date('2026-02-01'),
        updatedAt: new Date('2026-02-26'),
      },
      // Startup Labs monitoring alex-backend in mvp-product
      {
        _id: new ObjectId(),
        companyId: companies[2]._id,
        contributorId: contributors[4]._id,
        repositoryId: repositories[5]._id,
        githubUsername: contributors[4].githubUsername,
        repoFullName: repositories[5].fullName,
        monitoringType: 'ghost',
        status: 'active',
        inviteStatus: 'not_sent',
        inviteEmail: null,
        schedule: {
          type: 'specific_weekdays',
          config: {
            weekdays: [1, 3, 5], // Monday, Wednesday, Friday
          },
          time: '16:00',
          timezone: 'UTC',
          isActive: true,
          nextRunAt: new Date('2026-02-28T16:00:00'),
          lastRunAt: new Date('2026-02-26T16:00:00'),
        },
        fetchConfig: {
          windowType: 'since_last_run',
          dateRange: null,
        },
        recipients: ['frank@startuplabs.dev'],
        contributorNote: 'New hire - probation period',
        createdAt: new Date('2026-02-20'),
        updatedAt: new Date('2026-02-26'),
      },
    ];

    await this.db.collection(COLLECTIONS.MONITORED_CONTRIBUTORS).insertMany(monitoredContributors);
    this.insertedIds.monitoredContributors = monitoredContributors.map(mc => mc._id);
    console.log(`  ✓ Created ${monitoredContributors.length} monitored contributors\n`);
    
    return monitoredContributors;
  }

  /**
   * Seed Teams Collection
   */
  async seedTeams(companies, contributors) {
    console.log('👥 Seeding teams...');
    
    const teams = [
      {
        _id: new ObjectId(),
        companyId: companies[0]._id,
        name: 'Frontend Team',
        description: 'Web and mobile frontend developers',
        createdBy: this.insertedIds.companyMembers[0],
        memberContributorIds: [
          contributors[0]._id, // john-dev
          contributors[1]._id, // sarah-codes
        ],
        createdAt: new Date('2025-12-15'),
        updatedAt: new Date('2026-01-20'),
      },
      {
        _id: new ObjectId(),
        companyId: companies[0]._id,
        name: 'Backend Team',
        description: 'API and infrastructure developers',
        createdBy: this.insertedIds.companyMembers[1],
        memberContributorIds: [
          contributors[2]._id, // mike-fullstack
        ],
        createdAt: new Date('2026-01-15'),
        updatedAt: new Date('2026-01-15'),
      },
      {
        _id: new ObjectId(),
        companyId: companies[1]._id,
        name: 'Core Team',
        description: 'Main product development team',
        createdBy: this.insertedIds.companyMembers[3],
        memberContributorIds: [
          contributors[3]._id, // emma-opensource
        ],
        createdAt: new Date('2026-02-01'),
        updatedAt: new Date('2026-02-01'),
      },
    ];

    await this.db.collection(COLLECTIONS.TEAMS).insertMany(teams);
    this.insertedIds.teams = teams.map(t => t._id);
    console.log(`  ✓ Created ${teams.length} teams\n`);
    
    return teams;
  }

  /**
   * Seed Invites Collection
   */
  async seedInvites(monitoredContributors, companies, contributors) {
    console.log('✉️  Seeding invites...');
    
    const invites = [
      // Invite for john-dev (accepted)
      {
        _id: new ObjectId(),
        monitoredContributorId: monitoredContributors[0]._id,
        companyId: companies[0]._id,
        contributorId: contributors[0]._id,
        githubUsername: contributors[0].githubUsername,
        inviteEmail: 'john@example.com',
        clerkInvitationId: 'inv_clerk_john_001',
        status: 'accepted',
        sentAt: new Date('2025-12-01T10:00:00'),
        acceptedAt: new Date('2025-12-02T14:30:00'),
        expiresAt: new Date('2025-12-15T10:00:00'),
        createdAt: new Date('2025-12-01T10:00:00'),
      },
      // Invite for mike-fullstack (accepted)
      {
        _id: new ObjectId(),
        monitoredContributorId: monitoredContributors[2]._id,
        companyId: companies[0]._id,
        contributorId: contributors[2]._id,
        githubUsername: contributors[2].githubUsername,
        inviteEmail: 'mike@techmail.com',
        clerkInvitationId: 'inv_clerk_mike_002',
        status: 'accepted',
        sentAt: new Date('2026-01-15T09:00:00'),
        acceptedAt: new Date('2026-01-16T11:45:00'),
        expiresAt: new Date('2026-01-29T09:00:00'),
        createdAt: new Date('2026-01-15T09:00:00'),
      },
      // Invite for emma-opensource (sent, not yet accepted)
      {
        _id: new ObjectId(),
        monitoredContributorId: monitoredContributors[3]._id,
        companyId: companies[1]._id,
        contributorId: contributors[3]._id,
        githubUsername: contributors[3].githubUsername,
        inviteEmail: 'emma@oss.dev',
        clerkInvitationId: 'inv_clerk_emma_003',
        status: 'sent',
        sentAt: new Date('2026-02-01T08:00:00'),
        acceptedAt: null,
        expiresAt: new Date('2026-02-15T08:00:00'),
        createdAt: new Date('2026-02-01T08:00:00'),
      },
    ];

    await this.db.collection(COLLECTIONS.INVITES).insertMany(invites);
    this.insertedIds.invites = invites.map(i => i._id);
    console.log(`  ✓ Created ${invites.length} invites\n`);
    
    return invites;
  }

  /**
   * Seed Summary Runs Collection
   */
  async seedSummaryRuns(monitoredContributors, companies, contributors, repositories) {
    console.log('📊 Seeding summary runs...');
    
    const summaryRuns = [
      // Successful run for john-dev
      {
        _id: new ObjectId(),
        monitoredContributorId: monitoredContributors[0]._id,
        companyId: companies[0]._id,
        contributorId: contributors[0]._id,
        repositoryId: repositories[0]._id,
        githubUsername: contributors[0].githubUsername,
        repoFullName: repositories[0].fullName,
        scheduledAt: new Date('2026-02-26T09:00:00'),
        startedAt: new Date('2026-02-26T09:00:15'),
        completedAt: new Date('2026-02-26T09:02:30'),
        fetchWindow: {
          from: new Date('2026-02-24T09:00:00'),
          to: new Date('2026-02-26T09:00:00'),
        },
        prStats: {
          totalPRsFetched: 3,
          prNumbers: [123, 124, 125],
        },
        hasActivity: true,
        aiSummary: 'John worked on implementing the new authentication flow with OAuth2 support. He also fixed several UI bugs in the login component and improved error handling in the registration form. All PRs include comprehensive tests.',
        contributorNoteSnapshot: 'Senior frontend developer - focus on React components',
        emailStatus: {
          status: 'sent',
          sentAt: new Date('2026-02-26T09:03:00'),
          recipients: ['alice@acme-corp.com', 'bob@acme-corp.com'],
          failureReason: null,
        },
        triggerType: 'scheduled',
        createdAt: new Date('2026-02-26T09:00:00'),
      },
      // Run with no activity for sarah-codes
      {
        _id: new ObjectId(),
        monitoredContributorId: monitoredContributors[1]._id,
        companyId: companies[0]._id,
        contributorId: contributors[1]._id,
        repositoryId: repositories[0]._id,
        githubUsername: contributors[1].githubUsername,
        repoFullName: repositories[0].fullName,
        scheduledAt: new Date('2026-02-26T17:00:00'),
        startedAt: new Date('2026-02-26T17:00:10'),
        completedAt: new Date('2026-02-26T17:00:45'),
        fetchWindow: {
          from: new Date('2026-02-25T17:00:00'),
          to: new Date('2026-02-26T17:00:00'),
        },
        prStats: {
          totalPRsFetched: 0,
          prNumbers: [],
        },
        hasActivity: false,
        aiSummary: null,
        contributorNoteSnapshot: 'Contract developer - UI/UX specialist',
        emailStatus: {
          status: 'skipped',
          sentAt: null,
          recipients: ['bob@acme-corp.com'],
          failureReason: 'No activity in this period',
        },
        triggerType: 'scheduled',
        createdAt: new Date('2026-02-26T17:00:00'),
      },
      // Manual run for mike-fullstack
      {
        _id: new ObjectId(),
        monitoredContributorId: monitoredContributors[2]._id,
        companyId: companies[0]._id,
        contributorId: contributors[2]._id,
        repositoryId: repositories[2]._id,
        githubUsername: contributors[2].githubUsername,
        repoFullName: repositories[2].fullName,
        scheduledAt: null,
        startedAt: new Date('2026-02-25T15:30:00'),
        completedAt: new Date('2026-02-25T15:32:15'),
        fetchWindow: {
          from: new Date('2026-02-18T00:00:00'),
          to: new Date('2026-02-25T23:59:59'),
        },
        prStats: {
          totalPRsFetched: 5,
          prNumbers: [201, 202, 203, 204, 205],
        },
        hasActivity: true,
        aiSummary: 'Mike has been focused on database optimization and API performance improvements. He refactored the query layer, implemented caching for frequently accessed data, and added new monitoring endpoints. He also worked on security patches for the authentication middleware.',
        contributorNoteSnapshot: 'Backend team lead',
        emailStatus: {
          status: 'sent',
          sentAt: new Date('2026-02-25T15:33:00'),
          recipients: ['alice@acme-corp.com'],
          failureReason: null,
        },
        triggerType: 'manual',
        createdAt: new Date('2026-02-25T15:30:00'),
      },
      // Failed run for emma-opensource
      {
        _id: new ObjectId(),
        monitoredContributorId: monitoredContributors[3]._id,
        companyId: companies[1]._id,
        contributorId: contributors[3]._id,
        repositoryId: repositories[3]._id,
        githubUsername: contributors[3].githubUsername,
        repoFullName: repositories[3].fullName,
        scheduledAt: new Date('2026-02-26T08:00:00'),
        startedAt: new Date('2026-02-26T08:00:05'),
        completedAt: new Date('2026-02-26T08:00:20'),
        fetchWindow: {
          from: new Date('2026-02-25T08:00:00'),
          to: new Date('2026-02-26T08:00:00'),
        },
        prStats: {
          totalPRsFetched: 2,
          prNumbers: [301, 302],
        },
        hasActivity: true,
        aiSummary: 'Emma contributed to the microservices architecture by implementing a new message queue system and updating the service discovery layer.',
        contributorNoteSnapshot: 'Open source contributor - microservices expert',
        emailStatus: {
          status: 'failed',
          sentAt: null,
          recipients: ['diana@techinnovators.io'],
          failureReason: 'SMTP connection timeout',
        },
        triggerType: 'scheduled',
        createdAt: new Date('2026-02-26T08:00:00'),
      },
      // Recent successful run for alex-backend
      {
        _id: new ObjectId(),
        monitoredContributorId: monitoredContributors[4]._id,
        companyId: companies[2]._id,
        contributorId: contributors[4]._id,
        repositoryId: repositories[5]._id,
        githubUsername: contributors[4].githubUsername,
        repoFullName: repositories[5].fullName,
        scheduledAt: new Date('2026-02-26T16:00:00'),
        startedAt: new Date('2026-02-26T16:00:08'),
        completedAt: new Date('2026-02-26T16:01:45'),
        fetchWindow: {
          from: new Date('2026-02-24T16:00:00'),
          to: new Date('2026-02-26T16:00:00'),
        },
        prStats: {
          totalPRsFetched: 4,
          prNumbers: [401, 402, 403, 404],
        },
        hasActivity: true,
        aiSummary: 'Alex has been working on the MVP product backend, implementing user authentication, data models for core features, and REST API endpoints. He also set up the initial CI/CD pipeline.',
        contributorNoteSnapshot: 'New hire - probation period',
        emailStatus: {
          status: 'sent',
          sentAt: new Date('2026-02-26T16:02:00'),
          recipients: ['frank@startuplabs.dev'],
          failureReason: null,
        },
        triggerType: 'scheduled',
        createdAt: new Date('2026-02-26T16:00:00'),
      },
    ];

    await this.db.collection(COLLECTIONS.SUMMARY_RUNS).insertMany(summaryRuns);
    this.insertedIds.summaryRuns = summaryRuns.map(sr => sr._id);
    console.log(`  ✓ Created ${summaryRuns.length} summary runs\n`);
    
    return summaryRuns;
  }

  /**
   * Main seeding orchestration
   */
  async seed(clearExisting = false) {
    console.log('🌱 Starting database seeding...\n');
    console.log('═══════════════════════════════════════════════════\n');

    try {
      await this.connect();

      // Initialize collections with schemas and indexes
      console.log('🔧 Initializing collections with schemas and indexes...');
      await initAllCollections(this.db);
      console.log('  ✓ All collections initialized\n');

      // Optionally clear existing data
      if (clearExisting) {
        await this.clearAllCollections();
      }

      // Seed in order (respecting foreign key relationships)
      const plans = await this.seedPlans();
      const companies = await this.seedCompanies(plans);
      const members = await this.seedCompanyMembers(companies);
      const contributors = await this.seedContributors();
      const accounts = await this.seedContributorAccounts(contributors);
      const repositories = await this.seedRepositories(companies);
      const monitoredContributors = await this.seedMonitoredContributors(
        companies,
        contributors,
        repositories
      );
      const teams = await this.seedTeams(companies, contributors);
      const invites = await this.seedInvites(monitoredContributors, companies, contributors);
      const summaryRuns = await this.seedSummaryRuns(
        monitoredContributors,
        companies,
        contributors,
        repositories
      );

      console.log('═══════════════════════════════════════════════════');
      console.log('✅ Database seeding completed successfully!\n');

      // Print summary
      console.log('📈 Summary:');
      console.log(`   ${plans.length} plans`);
      console.log(`   ${companies.length} companies`);
      console.log(`   ${members.length} company members`);
      console.log(`   ${contributors.length} contributors`);
      console.log(`   ${accounts.length} contributor accounts`);
      console.log(`   ${repositories.length} repositories`);
      console.log(`   ${monitoredContributors.length} monitored contributors`);
      console.log(`   ${teams.length} teams`);
      console.log(`   ${invites.length} invites`);
      console.log(`   ${summaryRuns.length} summary runs`);
      console.log('');

    } catch (error) {
      console.error('\n❌ Seeding failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const clearExisting = args.includes('--clear') || args.includes('-c');

  if (clearExisting) {
    console.log('⚠️  WARNING: This will clear all existing data!\n');
  }

  const seeder = new DatabaseSeeder();
  await seeder.seed(clearExisting);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { DatabaseSeeder };
