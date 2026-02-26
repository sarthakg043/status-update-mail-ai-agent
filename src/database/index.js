/**
 * Database Module Entry Point
 * 
 * Exports the main database service interface.
 * The service is provider-agnostic and can be easily swapped to different databases.
 */

const { getDatabaseService, DatabaseService } = require('./databaseService');
const { getMongoConnection, MongoDBConnection } = require('./mongodb');

module.exports = {
  // Main exports - use these in your application
  getDatabaseService,
  DatabaseService,
  
  // MongoDB-specific exports (only if you need direct access)
  getMongoConnection,
  MongoDBConnection
};
