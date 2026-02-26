require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

/**
 * MongoDB Connection Manager
 * Handles MongoDB-specific connection, pooling, and client management
 */
class MongoDBConnection {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
    
    // Build connection URI from environment variables
    const username = process.env.MONGODB_USERNAME;
    const password = process.env.MONGODB_PASSWORD;
    const host = process.env.MONGODB_HOST || 'status-update-ai-main.0mr0frx.mongodb.net';
    const dbName = process.env.MONGODB_DATABASE || 'status-updates';
    
    if (!username || !password) {
      throw new Error('MONGODB_USERNAME and MONGODB_PASSWORD must be set in environment variables');
    }
    
    this.uri = `mongodb+srv://${username}:${password}@${host}/?appName=status-update-ai-main`;
    this.dbName = dbName;
  }

  /**
   * Connect to MongoDB
   * Uses connection pooling for efficient resource management
   */
  async connect() {
    if (this.isConnected && this.client) {
      return this.db;
    }

    try {
      this.client = new MongoClient(this.uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 60000,
      });

      await this.client.connect();
      
      // Verify connection
      await this.client.db('admin').command({ ping: 1 });
      
      this.db = this.client.db(this.dbName);
      this.isConnected = true;
      
      console.log(`✓ Connected to MongoDB database: ${this.dbName}`);
      return this.db;
    } catch (error) {
      console.error('MongoDB connection error:', error.message);
      throw new Error(`Failed to connect to MongoDB: ${error.message}`);
    }
  }

  /**
   * Get database instance
   * Ensures connection is established before returning
   */
  async getDB() {
    if (!this.isConnected || !this.db) {
      await this.connect();
    }
    return this.db;
  }

  /**
   * Get a specific collection
   * @param {string} collectionName - Name of the collection
   */
  async getCollection(collectionName) {
    const db = await this.getDB();
    return db.collection(collectionName);
  }

  /**
   * Close the database connection
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.close();
      this.isConnected = false;
      this.db = null;
      console.log('✓ Disconnected from MongoDB');
    }
  }

  /**
   * Check if connected
   */
  isActive() {
    return this.isConnected;
  }
}

// Singleton instance
let mongoConnection = null;

/**
 * Get MongoDB connection instance (Singleton pattern)
 */
function getMongoConnection() {
  if (!mongoConnection) {
    mongoConnection = new MongoDBConnection();
  }
  return mongoConnection;
}

module.exports = {
  getMongoConnection,
  MongoDBConnection
};
