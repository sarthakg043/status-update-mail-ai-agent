/**
 * Plans Collection Schema
 * Plan definitions. Referenced by companies.subscription.planId.
 */

const plansValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['name', 'displayName', 'priceMonthly', 'limits', 'isActive', 'createdAt'],
    properties: {
      name: { bsonType: 'string' },
      displayName: { bsonType: 'string' },
      priceMonthly: { bsonType: ['int', 'double'] },
      priceYearly: { bsonType: ['int', 'double', 'null'] },
      stripePriceIdMonthly: { bsonType: ['string', 'null'] },
      stripePriceIdYearly: { bsonType: ['string', 'null'] },
      limits: {
        bsonType: 'object',
        required: ['maxRepos', 'maxContributors', 'maxEmailsPerMonth'],
        properties: {
          maxRepos: { bsonType: 'int' },
          maxContributors: { bsonType: 'int' },
          maxEmailsPerMonth: { bsonType: 'int' },
        },
      },
      isActive: { bsonType: 'bool' },
      createdAt: { bsonType: 'date' },
    },
  },
};

const plansIndexes = [
  { key: { name: 1 }, options: { unique: true, name: 'name_unique' } },
  { key: { isActive: 1 }, options: { name: 'isActive' } },
];

module.exports = { plansValidator, plansIndexes };
