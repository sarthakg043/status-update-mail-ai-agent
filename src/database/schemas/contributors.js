/**
 * Contributors Collection Schema
 * Global registry of GitHub users. One document per GitHub user regardless of how many companies monitor them.
 */

const contributorsValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['githubUsername', 'githubUserId', 'createdAt', 'updatedAt'],
    properties: {
      githubUsername: { bsonType: 'string' },
      githubUserId: { bsonType: ['int', 'long'] },
      githubProfileUrl: { bsonType: ['string', 'null'] },
      avatarUrl: { bsonType: ['string', 'null'] },
      discoveredEmails: {
        bsonType: 'array',
        items: {
          bsonType: 'object',
          required: ['email', 'source', 'discoveredAt'],
          properties: {
            email: { bsonType: 'string' },
            source: { bsonType: 'string', enum: ['commit', 'github_profile', 'manual'] },
            discoveredAt: { bsonType: 'date' },
          },
        },
      },
      hasAccount: { bsonType: 'bool' },
      clerkUserId: { bsonType: ['string', 'null'] },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
};

const contributorsIndexes = [
  { key: { githubUsername: 1 }, options: { unique: true, name: 'githubUsername_unique' } },
  { key: { githubUserId: 1 }, options: { unique: true, name: 'githubUserId_unique' } },
  { key: { clerkUserId: 1 }, options: { name: 'clerkUserId', sparse: true } },
];

module.exports = { contributorsValidator, contributorsIndexes };
