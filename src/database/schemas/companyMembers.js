/**
 * Company Members Collection Schema
 * Every person inside a company who has access to the dashboard.
 */

const companyMembersValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['companyId', 'clerkUserId', 'email', 'role', 'isActive', 'createdAt', 'updatedAt'],
    properties: {
      companyId: { bsonType: 'objectId', description: 'Reference to companies collection' },
      clerkUserId: { bsonType: 'string', description: 'Clerk user ID' },
      email: { bsonType: 'string' },
      name: { bsonType: ['string', 'null'] },
      role: { bsonType: 'string', enum: ['admin', 'manager', 'viewer'] },
      isActive: { bsonType: 'bool' },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
};

const companyMembersIndexes = [
  { key: { companyId: 1, clerkUserId: 1 }, options: { unique: true, name: 'company_clerkUser_unique' } },
  { key: { clerkUserId: 1 }, options: { name: 'clerkUserId' } },
];

module.exports = { companyMembersValidator, companyMembersIndexes };
