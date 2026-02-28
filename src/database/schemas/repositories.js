/**
 * Repositories Collection Schema
 * Repos onboarded by a company. Each repo stores its own encrypted PAT.
 */

const repositoriesValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['companyId', 'owner', 'name', 'fullName', 'isPrivate', 'encryptedAccessToken', 'status', 'createdAt', 'updatedAt'],
    properties: {
      companyId: { bsonType: 'objectId', description: 'Reference to companies collection' },
      githubRepoId: { bsonType: ['int', 'long'] },
      owner: { bsonType: 'string' },
      name: { bsonType: 'string' },
      fullName: { bsonType: 'string' },
      isPrivate: { bsonType: 'bool' },
      encryptedAccessToken: { bsonType: 'string' },
      tokenAddedBy: { bsonType: ['string', 'null'] },
      status: { bsonType: 'string', enum: ['active', 'revoked', 'token_error', 'paused', 'removed'] },
      lastSyncedAt: { bsonType: ['date', 'null'] },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
};

const repositoriesIndexes = [
  { key: { companyId: 1, fullName: 1 }, options: { unique: true, name: 'company_fullName_unique' } },
  { key: { companyId: 1 }, options: { name: 'companyId' } },
];

module.exports = { repositoriesValidator, repositoriesIndexes };
