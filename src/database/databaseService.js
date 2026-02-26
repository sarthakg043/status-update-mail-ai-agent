const { getMongoConnection } = require('./mongodb');

/**
 * Database Service - Abstract interface for database operations
 * 
 * This service provides a database-agnostic interface for CRUD operations.
 * It can be easily adapted to use different database providers (PostgreSQL, MySQL, etc.)
 * by only changing the implementation, not the interface.
 * 
 * Currently implements MongoDB, but can be swapped with minimal changes.
 */
class DatabaseService {
  constructor() {
    // Use MongoDB implementation by default
    // To switch providers, just change this to a different connection manager
    this.connection = getMongoConnection();
    this.provider = 'mongodb';
  }

  /**
   * Initialize database connection
   */
  async connect() {
    try {
      await this.connection.connect();
      console.log(`✓ Database service initialized with ${this.provider}`);
    } catch (error) {
      console.error('Database connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async disconnect() {
    try {
      await this.connection.disconnect();
    } catch (error) {
      console.error('Database disconnection error:', error.message);
      throw error;
    }
  }

  // ==================== CREATE OPERATIONS ====================

  /**
   * Create a single document/record
   * @param {string} collection - Collection/table name
   * @param {Object} data - Data to insert
   * @returns {Object} Created document with ID
   */
  async create(collection, data) {
    try {
      const coll = await this.connection.getCollection(collection);
      const timestamp = new Date();
      
      const document = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      const result = await coll.insertOne(document);
      return {
        id: result.insertedId,
        ...document
      };
    } catch (error) {
      console.error(`Error creating document in ${collection}:`, error.message);
      throw new Error(`Failed to create document: ${error.message}`);
    }
  }

  /**
   * Create multiple documents/records
   * @param {string} collection - Collection/table name
   * @param {Array<Object>} dataArray - Array of data to insert
   * @returns {Array} Array of created documents with IDs
   */
  async createMany(collection, dataArray) {
    try {
      const coll = await this.connection.getCollection(collection);
      const timestamp = new Date();
      
      const documents = dataArray.map(data => ({
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp
      }));

      const result = await coll.insertMany(documents);
      return documents.map((doc, index) => ({
        id: result.insertedIds[index],
        ...doc
      }));
    } catch (error) {
      console.error(`Error creating documents in ${collection}:`, error.message);
      throw new Error(`Failed to create documents: ${error.message}`);
    }
  }

  // ==================== READ OPERATIONS ====================

  /**
   * Find a single document by ID
   * @param {string} collection - Collection/table name
   * @param {string|Object} id - Document ID
   * @returns {Object|null} Found document or null
   */
  async findById(collection, id) {
    try {
      const coll = await this.connection.getCollection(collection);
      const { ObjectId } = require('mongodb');
      
      // Convert string ID to ObjectId if needed
      const query = typeof id === 'string' ? { _id: new ObjectId(id) } : { _id: id };
      
      return await coll.findOne(query);
    } catch (error) {
      console.error(`Error finding document by ID in ${collection}:`, error.message);
      throw new Error(`Failed to find document: ${error.message}`);
    }
  }

  /**
   * Find a single document by query
   * @param {string} collection - Collection/table name
   * @param {Object} query - Query criteria
   * @returns {Object|null} Found document or null
   */
  async findOne(collection, query = {}) {
    try {
      const coll = await this.connection.getCollection(collection);
      return await coll.findOne(query);
    } catch (error) {
      console.error(`Error finding document in ${collection}:`, error.message);
      throw new Error(`Failed to find document: ${error.message}`);
    }
  }

  /**
   * Find multiple documents by query
   * @param {string} collection - Collection/table name
   * @param {Object} query - Query criteria
   * @param {Object} options - Query options (sort, limit, skip, projection)
   * @returns {Array} Array of found documents
   */
  async find(collection, query = {}, options = {}) {
    try {
      const coll = await this.connection.getCollection(collection);
      const { sort, limit, skip, projection } = options;
      
      let cursor = coll.find(query);
      
      if (projection) cursor = cursor.project(projection);
      if (sort) cursor = cursor.sort(sort);
      if (skip) cursor = cursor.skip(skip);
      if (limit) cursor = cursor.limit(limit);
      
      return await cursor.toArray();
    } catch (error) {
      console.error(`Error finding documents in ${collection}:`, error.message);
      throw new Error(`Failed to find documents: ${error.message}`);
    }
  }

  /**
   * Find all documents in a collection
   * @param {string} collection - Collection/table name
   * @param {Object} options - Query options
   * @returns {Array} Array of all documents
   */
  async findAll(collection, options = {}) {
    return this.find(collection, {}, options);
  }

  /**
   * Count documents matching query
   * @param {string} collection - Collection/table name
   * @param {Object} query - Query criteria
   * @returns {number} Count of matching documents
   */
  async count(collection, query = {}) {
    try {
      const coll = await this.connection.getCollection(collection);
      return await coll.countDocuments(query);
    } catch (error) {
      console.error(`Error counting documents in ${collection}:`, error.message);
      throw new Error(`Failed to count documents: ${error.message}`);
    }
  }

  // ==================== UPDATE OPERATIONS ====================

  /**
   * Update a single document by ID
   * @param {string} collection - Collection/table name
   * @param {string|Object} id - Document ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Update result
   */
  async updateById(collection, id, updateData) {
    try {
      const coll = await this.connection.getCollection(collection);
      const { ObjectId } = require('mongodb');
      
      const query = typeof id === 'string' ? { _id: new ObjectId(id) } : { _id: id };
      const update = {
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      };
      
      const result = await coll.updateOne(query, update);
      return {
        matched: result.matchedCount,
        modified: result.modifiedCount
      };
    } catch (error) {
      console.error(`Error updating document in ${collection}:`, error.message);
      throw new Error(`Failed to update document: ${error.message}`);
    }
  }

  /**
   * Update a single document by query
   * @param {string} collection - Collection/table name
   * @param {Object} query - Query criteria
   * @param {Object} updateData - Data to update
   * @returns {Object} Update result
   */
  async updateOne(collection, query, updateData) {
    try {
      const coll = await this.connection.getCollection(collection);
      const update = {
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      };
      
      const result = await coll.updateOne(query, update);
      return {
        matched: result.matchedCount,
        modified: result.modifiedCount
      };
    } catch (error) {
      console.error(`Error updating document in ${collection}:`, error.message);
      throw new Error(`Failed to update document: ${error.message}`);
    }
  }

  /**
   * Update multiple documents by query
   * @param {string} collection - Collection/table name
   * @param {Object} query - Query criteria
   * @param {Object} updateData - Data to update
   * @returns {Object} Update result
   */
  async updateMany(collection, query, updateData) {
    try {
      const coll = await this.connection.getCollection(collection);
      const update = {
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      };
      
      const result = await coll.updateMany(query, update);
      return {
        matched: result.matchedCount,
        modified: result.modifiedCount
      };
    } catch (error) {
      console.error(`Error updating documents in ${collection}:`, error.message);
      throw new Error(`Failed to update documents: ${error.message}`);
    }
  }

  /**
   * Upsert - Update if exists, create if not
   * @param {string} collection - Collection/table name
   * @param {Object} query - Query criteria
   * @param {Object} data - Data to insert/update
   * @returns {Object} Upsert result
   */
  async upsert(collection, query, data) {
    try {
      const coll = await this.connection.getCollection(collection);
      const timestamp = new Date();
      
      const update = {
        $set: {
          ...data,
          updatedAt: timestamp
        },
        $setOnInsert: {
          createdAt: timestamp
        }
      };
      
      const result = await coll.updateOne(query, update, { upsert: true });
      return {
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount,
        upsertedId: result.upsertedId
      };
    } catch (error) {
      console.error(`Error upserting document in ${collection}:`, error.message);
      throw new Error(`Failed to upsert document: ${error.message}`);
    }
  }

  // ==================== DELETE OPERATIONS ====================

  /**
   * Delete a single document by ID
   * @param {string} collection - Collection/table name
   * @param {string|Object} id - Document ID
   * @returns {Object} Delete result
   */
  async deleteById(collection, id) {
    try {
      const coll = await this.connection.getCollection(collection);
      const { ObjectId } = require('mongodb');
      
      const query = typeof id === 'string' ? { _id: new ObjectId(id) } : { _id: id };
      const result = await coll.deleteOne(query);
      
      return {
        deleted: result.deletedCount
      };
    } catch (error) {
      console.error(`Error deleting document in ${collection}:`, error.message);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  /**
   * Delete a single document by query
   * @param {string} collection - Collection/table name
   * @param {Object} query - Query criteria
   * @returns {Object} Delete result
   */
  async deleteOne(collection, query) {
    try {
      const coll = await this.connection.getCollection(collection);
      const result = await coll.deleteOne(query);
      
      return {
        deleted: result.deletedCount
      };
    } catch (error) {
      console.error(`Error deleting document in ${collection}:`, error.message);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  /**
   * Delete multiple documents by query
   * @param {string} collection - Collection/table name
   * @param {Object} query - Query criteria
   * @returns {Object} Delete result
   */
  async deleteMany(collection, query) {
    try {
      const coll = await this.connection.getCollection(collection);
      const result = await coll.deleteMany(query);
      
      return {
        deleted: result.deletedCount
      };
    } catch (error) {
      console.error(`Error deleting documents in ${collection}:`, error.message);
      throw new Error(`Failed to delete documents: ${error.message}`);
    }
  }

  // ==================== UTILITY OPERATIONS ====================

  /**
   * Check if a document exists
   * @param {string} collection - Collection/table name
   * @param {Object} query - Query criteria
   * @returns {boolean} True if document exists
   */
  async exists(collection, query) {
    try {
      const count = await this.count(collection, query);
      return count > 0;
    } catch (error) {
      console.error(`Error checking existence in ${collection}:`, error.message);
      throw new Error(`Failed to check existence: ${error.message}`);
    }
  }

  /**
   * Execute a transaction (for operations that require atomicity)
   * @param {Function} operations - Async function containing operations
   * @returns {*} Result of the transaction
   */
  async transaction(operations) {
    // MongoDB transactions require replica sets
    // For basic usage, this is a placeholder
    try {
      return await operations(this);
    } catch (error) {
      console.error('Transaction error:', error.message);
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  /**
   * Get raw database connection (use with caution)
   * Allows direct access to provider-specific features
   * @returns {Object} Raw database connection
   */
  async getRawConnection() {
    return await this.connection.getDB();
  }

  /**
   * Get raw collection (use with caution)
   * @param {string} collection - Collection name
   * @returns {Object} Raw collection object
   */
  async getRawCollection(collection) {
    return await this.connection.getCollection(collection);
  }
}

// Singleton instance
let dbService = null;

/**
 * Get database service instance (Singleton pattern)
 */
function getDatabaseService() {
  if (!dbService) {
    dbService = new DatabaseService();
  }
  return dbService;
}

module.exports = {
  getDatabaseService,
  DatabaseService
}; 