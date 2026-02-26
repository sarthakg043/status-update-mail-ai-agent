/**
 * Database Module Entry Point
 * 
 * Exports the main database service interface, collection constants,
 * schema validators, initialization helpers, and domain-specific services.
 *
 * For microservice usage, import individual services:
 *   const { CompanyService, ContributorService } = require('./database');
 *
 * To initialize all collections with validation & indexes:
 *   const { initAllCollections } = require('./database');
 *   const db = await getMongoConnection().getDB();
 *   await initAllCollections(db);
 */

const { getDatabaseService, DatabaseService } = require('./databaseService');
const { getMongoConnection, MongoDBConnection } = require('./mongodb');
const { COLLECTIONS } = require('./collections');
const { initAllCollections, initCollection, collectionDefinitions } = require('./initCollections');

// Domain-specific service classes
const {
  BaseService,
  CompanyService,
  CompanyMemberService,
  RepositoryService,
  ContributorService,
  ContributorAccountService,
  MonitoredContributorService,
  SummaryRunService,
  TeamService,
  InviteService,
  PlanService,
} = require('./services');

module.exports = {
  // Main exports - use these in your application
  getDatabaseService,
  DatabaseService,
  
  // MongoDB-specific exports (only if you need direct access)
  getMongoConnection,
  MongoDBConnection,

  // Collection name constants
  COLLECTIONS,

  // Initialization helpers
  initAllCollections,
  initCollection,
  collectionDefinitions,

  // Domain-specific service classes
  BaseService,
  CompanyService,
  CompanyMemberService,
  RepositoryService,
  ContributorService,
  ContributorAccountService,
  MonitoredContributorService,
  SummaryRunService,
  TeamService,
  InviteService,
  PlanService,
};
