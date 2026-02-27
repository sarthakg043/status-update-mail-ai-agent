/**
 * Summary Runs Collection Schema
 * One document per triggered run. Historical log for dashboard, timeline, analytics, and email records.
 */

const summaryRunsValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      'monitoredContributorId', 'companyId', 'contributorId', 'repositoryId',
      'githubUsername', 'repoFullName',
      'triggerType', 'createdAt',
    ],
    properties: {
      monitoredContributorId: { bsonType: 'objectId' },
      companyId: { bsonType: 'objectId' },
      contributorId: { bsonType: 'objectId' },
      repositoryId: { bsonType: 'objectId' },
      githubUsername: { bsonType: 'string' },
      repoFullName: { bsonType: 'string' },
      scheduledAt: { bsonType: ['date', 'null'] },
      startedAt: { bsonType: ['date', 'null'] },
      completedAt: { bsonType: ['date', 'null'] },
      fetchWindow: {
        bsonType: ['object', 'null'],
        properties: {
          from: { bsonType: 'date' },
          to: { bsonType: 'date' },
        },
      },
      prStats: {
        bsonType: ['object', 'null'],
        properties: {
          totalPRsFetched: { bsonType: 'int' },
          prNumbers: { bsonType: 'array', items: { bsonType: 'int' } },
        },
      },
      hasActivity: { bsonType: 'bool' },
      aiSummary: { bsonType: ['string', 'null'] },
      contributorNoteSnapshot: { bsonType: ['string', 'null'] },
      emailStatus: {
        bsonType: 'object',
        properties: {
          status: { bsonType: 'string', enum: ['pending', 'sent', 'failed', 'skipped'] },
          sentAt: { bsonType: ['date', 'null'] },
          recipients: { bsonType: 'array', items: { bsonType: 'string' } },
          failureReason: { bsonType: ['string', 'null'] },
        },
      },
      triggerType: { bsonType: 'string', enum: ['scheduled', 'manual'] },
      createdAt: { bsonType: 'date' },
    },
  },
};

const summaryRunsIndexes = [
  { key: { monitoredContributorId: 1, createdAt: -1 }, options: { name: 'monitoredContributor_timeline' } },
  { key: { companyId: 1, createdAt: -1 }, options: { name: 'company_analytics' } },
  { key: { contributorId: 1, createdAt: -1 }, options: { name: 'contributor_dashboard' } },
  { key: { repositoryId: 1, createdAt: -1 }, options: { name: 'repository_analytics' } },
];

module.exports = { summaryRunsValidator, summaryRunsIndexes };
