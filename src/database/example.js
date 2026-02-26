/**
 * Example: Integrating Database Service into Status Update Application
 * 
 * This file demonstrates how to use the database service to:
 * 1. Save status updates to the database
 * 2. Track email history
 * 3. Retrieve past updates
 * 4. Store user preferences
 */

const { getDatabaseService } = require('./database');
const { loadConfig } = require('./config');

/**
 * Initialize database connection
 */
async function initializeDatabase() {
  const config = loadConfig();
  
  if (!config.database.enabled) {
    console.log('ℹ Database is disabled. Set DATABASE_ENABLED=true to enable.');
    return null;
  }

  try {
    const db = getDatabaseService();
    await db.connect();
    return db;
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    return null;
  }
}

/**
 * Save a status update to the database
 */
async function saveStatusUpdate(userId, pullRequests, emailContent, recipients) {
  const db = getDatabaseService();
  
  try {
    const statusUpdate = await db.create('statusUpdates', {
      userId,
      pullRequests: pullRequests.map(pr => ({
        number: pr.number,
        title: pr.title,
        repo: pr.repo,
        state: pr.state,
        url: pr.html_url,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at
      })),
      emailContent: {
        subject: emailContent.subject,
        body: emailContent.body,
        htmlBody: emailContent.htmlBody
      },
      recipients,
      sentAt: new Date(),
      status: 'sent'
    });

    console.log(`✓ Status update saved to database (ID: ${statusUpdate.id})`);
    return statusUpdate;
  } catch (error) {
    console.error('Failed to save status update:', error.message);
    throw error;
  }
}

/**
 * Get user's status update history
 */
async function getUserHistory(userId, options = {}) {
  const db = getDatabaseService();
  const { limit = 20, skip = 0 } = options;
  
  try {
    const history = await db.find('statusUpdates',
      { userId },
      { 
        sort: { sentAt: -1 },
        limit,
        skip,
        projection: {
          pullRequests: 1,
          recipients: 1,
          sentAt: 1,
          status: 1
        }
      }
    );

    return history;
  } catch (error) {
    console.error('Failed to retrieve history:', error.message);
    throw error;
  }
}

/**
 * Get statistics for a user
 */
async function getUserStats(userId) {
  const db = getDatabaseService();
  
  try {
    const totalUpdates = await db.count('statusUpdates', { userId });
    
    const recentUpdates = await db.find('statusUpdates',
      { userId },
      { 
        sort: { sentAt: -1 },
        limit: 1,
        projection: { sentAt: 1 }
      }
    );

    const lastUpdateDate = recentUpdates.length > 0 
      ? recentUpdates[0].sentAt 
      : null;

    // Get PR count from all updates
    const allUpdates = await db.find('statusUpdates',
      { userId },
      { projection: { pullRequests: 1 } }
    );
    
    const totalPRs = allUpdates.reduce((sum, update) => 
      sum + (update.pullRequests?.length || 0), 0);

    return {
      totalUpdates,
      totalPRs,
      lastUpdateDate,
      averagePRsPerUpdate: totalUpdates > 0 ? totalPRs / totalUpdates : 0
    };
  } catch (error) {
    console.error('Failed to get user stats:', error.message);
    throw error;
  }
}

/**
 * Save or update user preferences
 */
async function saveUserPreferences(userId, preferences) {
  const db = getDatabaseService();
  
  try {
    await db.upsert('users',
      { userId },
      {
        ...preferences,
        lastModified: new Date()
      }
    );

    console.log(`✓ User preferences saved for ${userId}`);
  } catch (error) {
    console.error('Failed to save user preferences:', error.message);
    throw error;
  }
}

/**
 * Get user preferences
 */
async function getUserPreferences(userId) {
  const db = getDatabaseService();
  
  try {
    const user = await db.findOne('users', { userId });
    return user || null;
  } catch (error) {
    console.error('Failed to get user preferences:', error.message);
    throw error;
  }
}

/**
 * Log email delivery status
 */
async function logEmailDelivery(statusUpdateId, status, details = {}) {
  const db = getDatabaseService();
  
  try {
    await db.create('emailLogs', {
      statusUpdateId,
      status, // 'sent', 'failed', 'bounced', etc.
      details,
      timestamp: new Date()
    });

    // Update the status update record
    await db.updateById('statusUpdates', statusUpdateId, { status });
    
    console.log(`✓ Email delivery logged: ${status}`);
  } catch (error) {
    console.error('Failed to log email delivery:', error.message);
    throw error;
  }
}

/**
 * Search status updates
 */
async function searchStatusUpdates(searchParams) {
  const db = getDatabaseService();
  const { userId, startDate, endDate, status, limit = 50 } = searchParams;
  
  const query = {};
  
  if (userId) query.userId = userId;
  if (status) query.status = status;
  if (startDate || endDate) {
    query.sentAt = {};
    if (startDate) query.sentAt.$gte = new Date(startDate);
    if (endDate) query.sentAt.$lte = new Date(endDate);
  }
  
  try {
    const results = await db.find('statusUpdates',
      query,
      { 
        sort: { sentAt: -1 },
        limit
      }
    );

    return results;
  } catch (error) {
    console.error('Failed to search status updates:', error.message);
    throw error;
  }
}

/**
 * Clean up old records (data retention)
 */
async function cleanupOldRecords(retentionDays = 90) {
  const db = getDatabaseService();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  try {
    // Delete old status updates
    const statusResult = await db.deleteMany('statusUpdates', {
      sentAt: { $lt: cutoffDate }
    });

    // Delete old email logs
    const logsResult = await db.deleteMany('emailLogs', {
      timestamp: { $lt: cutoffDate }
    });

    console.log(`✓ Cleanup completed: ${statusResult.deleted} status updates, ${logsResult.deleted} logs deleted`);
    
    return {
      statusUpdates: statusResult.deleted,
      emailLogs: logsResult.deleted
    };
  } catch (error) {
    console.error('Failed to cleanup old records:', error.message);
    throw error;
  }
}

/**
 * Example: Complete workflow with database integration
 */
async function exampleWorkflow() {
  console.log('=== Database Integration Example ===\n');
  
  // 1. Initialize database
  const db = await initializeDatabase();
  if (!db) {
    console.log('Database not available, running without persistence.');
    return;
  }

  const userId = 'github-user-123';

  try {
    // 2. Save a status update
    const pullRequests = [
      { 
        number: 42, 
        title: 'Add new feature', 
        repo: 'my-repo',
        state: 'open',
        html_url: 'https://github.com/user/repo/pull/42',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    const emailContent = {
      subject: 'Weekly Status Update',
      body: 'This week I worked on...',
      htmlBody: '<h1>Weekly Status Update</h1><p>This week I worked on...</p>'
    };

    const savedUpdate = await saveStatusUpdate(
      userId,
      pullRequests,
      emailContent,
      ['manager@company.com']
    );

    // 3. Log email delivery
    await logEmailDelivery(savedUpdate.id, 'sent', {
      emailId: 'email-123',
      provider: 'gmail'
    });

    // 4. Get user statistics
    const stats = await getUserStats(userId);
    console.log('\nUser Statistics:', stats);

    // 5. Get history
    const history = await getUserHistory(userId, { limit: 5 });
    console.log(`\nFound ${history.length} recent status updates`);

    // 6. Save preferences
    await saveUserPreferences(userId, {
      emailFrequency: 'weekly',
      includeCodeSnippets: true,
      preferredFormat: 'html'
    });

    // 7. Search updates
    const searchResults = await searchStatusUpdates({
      userId,
      status: 'sent',
      limit: 10
    });
    console.log(`\nSearch found ${searchResults.length} results`);

  } catch (error) {
    console.error('Workflow error:', error);
  } finally {
    // Cleanup
    await db.disconnect();
    console.log('\n=== Workflow Complete ===');
  }
}

// Export functions for use in other modules
module.exports = {
  initializeDatabase,
  saveStatusUpdate,
  getUserHistory,
  getUserStats,
  saveUserPreferences,
  getUserPreferences,
  logEmailDelivery,
  searchStatusUpdates,
  cleanupOldRecords
};

// Run example if this file is executed directly
if (require.main === module) {
  exampleWorkflow().catch(console.error);
}
