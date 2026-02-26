/**
 * Contributor Accounts Collection Schema
 * Created only when a contributor accepts a Clerk invite and onboards themselves.
 */

const contributorAccountsValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['contributorId', 'clerkUserId', 'createdAt', 'updatedAt'],
    properties: {
      contributorId: { bsonType: 'objectId', description: 'Reference to contributors collection' },
      clerkUserId: { bsonType: 'string' },
      name: { bsonType: ['string', 'null'] },
      personalEmail: { bsonType: ['string', 'null'] },
      mailConfig: {
        bsonType: ['object', 'null'],
        properties: {
          provider: { bsonType: 'string', enum: ['gmail', 'zoho'] },
          email: { bsonType: 'string' },
          encryptedAppPassword: { bsonType: 'string' },
        },
      },
      savedTemplates: {
        bsonType: 'array',
        items: {
          bsonType: 'object',
          required: ['title', 'content', 'createdAt', 'updatedAt'],
          properties: {
            _id: { bsonType: 'objectId' },
            title: { bsonType: 'string' },
            content: { bsonType: 'string', maxLength: 5000 },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
          },
        },
      },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
};

const contributorAccountsIndexes = [
  { key: { contributorId: 1 }, options: { unique: true, name: 'contributorId_unique' } },
  { key: { clerkUserId: 1 }, options: { unique: true, name: 'clerkUserId_unique' } },
];

module.exports = { contributorAccountsValidator, contributorAccountsIndexes };
