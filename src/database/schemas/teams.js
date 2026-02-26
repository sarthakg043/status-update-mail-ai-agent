/**
 * Teams Collection Schema
 * Company-scoped teams. Contributors from any repo can be grouped into a team.
 */

const teamsValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['companyId', 'name', 'createdBy', 'createdAt', 'updatedAt'],
    properties: {
      companyId: { bsonType: 'objectId' },
      name: { bsonType: 'string' },
      description: { bsonType: ['string', 'null'] },
      createdBy: { bsonType: 'string' },
      memberContributorIds: {
        bsonType: 'array',
        items: { bsonType: 'objectId' },
      },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
};

const teamsIndexes = [
  { key: { companyId: 1 }, options: { name: 'companyId' } },
  { key: { memberContributorIds: 1 }, options: { name: 'memberContributorIds' } },
];

module.exports = { teamsValidator, teamsIndexes };
