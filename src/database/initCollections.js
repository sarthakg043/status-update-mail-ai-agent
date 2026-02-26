/**
 * Collection Initialization
 *
 * Creates all MongoDB collections with JSON Schema validation and indexes.
 * Run this once during application startup or as a migration step.
 */

const { COLLECTIONS } = require('./collections');
const {
  companiesValidator, companiesIndexes,
  companyMembersValidator, companyMembersIndexes,
  repositoriesValidator, repositoriesIndexes,
  contributorsValidator, contributorsIndexes,
  contributorAccountsValidator, contributorAccountsIndexes,
  monitoredContributorsValidator, monitoredContributorsIndexes,
  summaryRunsValidator, summaryRunsIndexes,
  teamsValidator, teamsIndexes,
  invitesValidator, invitesIndexes,
  plansValidator, plansIndexes,
} = require('./schemas');

/**
 * Mapping from collection name to its validator and indexes.
 */
const collectionDefinitions = [
  { name: COLLECTIONS.COMPANIES, validator: companiesValidator, indexes: companiesIndexes },
  { name: COLLECTIONS.COMPANY_MEMBERS, validator: companyMembersValidator, indexes: companyMembersIndexes },
  { name: COLLECTIONS.REPOSITORIES, validator: repositoriesValidator, indexes: repositoriesIndexes },
  { name: COLLECTIONS.CONTRIBUTORS, validator: contributorsValidator, indexes: contributorsIndexes },
  { name: COLLECTIONS.CONTRIBUTOR_ACCOUNTS, validator: contributorAccountsValidator, indexes: contributorAccountsIndexes },
  { name: COLLECTIONS.MONITORED_CONTRIBUTORS, validator: monitoredContributorsValidator, indexes: monitoredContributorsIndexes },
  { name: COLLECTIONS.SUMMARY_RUNS, validator: summaryRunsValidator, indexes: summaryRunsIndexes },
  { name: COLLECTIONS.TEAMS, validator: teamsValidator, indexes: teamsIndexes },
  { name: COLLECTIONS.INVITES, validator: invitesValidator, indexes: invitesIndexes },
  { name: COLLECTIONS.PLANS, validator: plansValidator, indexes: plansIndexes },
];

/**
 * Initialize a single collection with validator and indexes.
 * @param {import('mongodb').Db} db - MongoDB database instance
 * @param {Object} definition - Collection definition
 */
async function initCollection(db, definition) {
  const { name, validator, indexes } = definition;
  const existingCollections = await db.listCollections({ name }).toArray();

  if (existingCollections.length > 0) {
    // Collection exists – update validation rules
    await db.command({ collMod: name, validator, validationLevel: 'moderate' });
  } else {
    await db.createCollection(name, { validator, validationLevel: 'moderate' });
  }

  // Create indexes
  const collection = db.collection(name);
  for (const idx of indexes) {
    await collection.createIndex(idx.key, idx.options || {});
  }
}

/**
 * Initialize all collections.
 * @param {import('mongodb').Db} db - MongoDB database instance
 */
async function initAllCollections(db) {
  console.log('Initializing database collections...');

  for (const definition of collectionDefinitions) {
    try {
      await initCollection(db, definition);
      console.log(`  ✓ ${definition.name}`);
    } catch (error) {
      console.error(`  ✗ ${definition.name}: ${error.message}`);
      throw error;
    }
  }

  console.log('✓ All collections initialized successfully');
}

module.exports = { initAllCollections, initCollection, collectionDefinitions };
