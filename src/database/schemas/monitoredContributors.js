/**
 * Monitored Contributors Collection Schema
 * Central/core collection. One document per (company + contributor + repo) combination.
 */

const monitoredContributorsValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      'companyId', 'contributorId', 'repositoryId',
      'githubUsername', 'repoFullName',
      'monitoringType', 'status', 'schedule',
      'createdAt', 'updatedAt',
    ],
    properties: {
      companyId: { bsonType: 'objectId' },
      contributorId: { bsonType: 'objectId' },
      repositoryId: { bsonType: 'objectId' },
      githubUsername: { bsonType: 'string' },
      repoFullName: { bsonType: 'string' },
      monitoringType: { bsonType: 'string', enum: ['ghost', 'open'] },
      status: { bsonType: 'string', enum: ['active', 'paused', 'removed'] },
      inviteStatus: {
        bsonType: 'string',
        enum: ['not_sent', 'sent', 'accepted', 'declined', 'expired'],
      },
      inviteEmail: { bsonType: ['string', 'null'] },
      schedule: {
        bsonType: 'object',
        required: ['type', 'time', 'timezone', 'isActive'],
        properties: {
          type: {
            bsonType: 'string',
            enum: ['daily', 'specific_weekdays', 'monthly_date', 'fixed_interval', 'one_time', 'yearly'],
          },
          config: { bsonType: 'object' },
          time: { bsonType: 'string' },
          timezone: { bsonType: 'string' },
          isActive: { bsonType: 'bool' },
          nextRunAt: { bsonType: ['date', 'null'] },
          lastRunAt: { bsonType: ['date', 'null'] },
        },
      },
      fetchConfig: {
        bsonType: 'object',
        properties: {
          windowType: { bsonType: 'string', enum: ['since_last_run', 'date_range'] },
          dateRange: {
            bsonType: ['object', 'null'],
            properties: {
              from: { bsonType: ['date', 'null'] },
              to: { bsonType: ['date', 'null'] },
            },
          },
        },
      },
      emailConfig: {
        bsonType: 'object',
        properties: {
          recipients: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['email', 'type'],
              properties: {
                email: { bsonType: 'string' },
                type: { bsonType: 'string', enum: ['company_admin', 'custom', 'contributor'] },
              },
            },
          },
        },
      },
      contributorNote: { bsonType: ['string', 'null'], maxLength: 5000 },
      addedBy: { bsonType: ['string', 'null'] },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
};

const monitoredContributorsIndexes = [
  {
    key: { companyId: 1, contributorId: 1, repositoryId: 1 },
    options: { unique: true, name: 'company_contributor_repo_unique' },
  },
  { key: { 'schedule.nextRunAt': 1 }, options: { name: 'schedule_nextRunAt' } },
  { key: { companyId: 1 }, options: { name: 'companyId' } },
  { key: { contributorId: 1 }, options: { name: 'contributorId' } },
];

module.exports = { monitoredContributorsValidator, monitoredContributorsIndexes };
