/**
 * Base Service - Shared logic for all collection-specific services.
 *
 * Each domain service extends this class and provides:
 *   • A fixed collection name
 *   • Domain-specific helper methods
 *
 * The base class exposes generic CRUD helpers that automatically
 * manage timestamps (createdAt / updatedAt).
 */

const { ObjectId } = require('mongodb');
const { getMongoConnection } = require('../mongodb');

class BaseService {
  /**
   * @param {string} collectionName - MongoDB collection name
   */
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.connection = getMongoConnection();
  }

  /** Get the underlying MongoDB collection handle. */
  async _collection() {
    return this.connection.getCollection(this.collectionName);
  }

  /** Convert a string id to an ObjectId when necessary. */
  _toObjectId(id) {
    return typeof id === 'string' ? new ObjectId(id) : id;
  }

  // ───────────────────── CREATE ─────────────────────

  async create(data) {
    const coll = await this._collection();
    const now = new Date();
    const doc = { ...data, createdAt: now, updatedAt: now };
    const result = await coll.insertOne(doc);
    return { _id: result.insertedId, ...doc };
  }

  async createMany(dataArray) {
    const coll = await this._collection();
    const now = new Date();
    const docs = dataArray.map((d) => ({ ...d, createdAt: now, updatedAt: now }));
    const result = await coll.insertMany(docs);
    return docs.map((doc, i) => ({ _id: result.insertedIds[i], ...doc }));
  }

  // ───────────────────── READ ─────────────────────

  async findById(id) {
    const coll = await this._collection();
    return coll.findOne({ _id: this._toObjectId(id) });
  }

  async findOne(query = {}) {
    const coll = await this._collection();
    return coll.findOne(query);
  }

  async find(query = {}, { sort, limit, skip, projection } = {}) {
    const coll = await this._collection();
    let cursor = coll.find(query);
    if (projection) cursor = cursor.project(projection);
    if (sort) cursor = cursor.sort(sort);
    if (skip) cursor = cursor.skip(skip);
    if (limit) cursor = cursor.limit(limit);
    return cursor.toArray();
  }

  async count(query = {}) {
    const coll = await this._collection();
    return coll.countDocuments(query);
  }

  async exists(query) {
    return (await this.count(query)) > 0;
  }

  // ───────────────────── UPDATE ─────────────────────

  async updateById(id, updateData) {
    const coll = await this._collection();
    const result = await coll.updateOne(
      { _id: this._toObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() } },
    );
    return { matched: result.matchedCount, modified: result.modifiedCount };
  }

  async updateOne(query, updateData) {
    const coll = await this._collection();
    const result = await coll.updateOne(
      query,
      { $set: { ...updateData, updatedAt: new Date() } },
    );
    return { matched: result.matchedCount, modified: result.modifiedCount };
  }

  async updateMany(query, updateData) {
    const coll = await this._collection();
    const result = await coll.updateMany(
      query,
      { $set: { ...updateData, updatedAt: new Date() } },
    );
    return { matched: result.matchedCount, modified: result.modifiedCount };
  }

  async upsert(query, data) {
    const coll = await this._collection();
    const now = new Date();
    const result = await coll.updateOne(
      query,
      { $set: { ...data, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
    return {
      matched: result.matchedCount,
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
      upsertedId: result.upsertedId,
    };
  }

  // ───────────────────── DELETE ─────────────────────

  async deleteById(id) {
    const coll = await this._collection();
    const result = await coll.deleteOne({ _id: this._toObjectId(id) });
    return { deleted: result.deletedCount };
  }

  async deleteOne(query) {
    const coll = await this._collection();
    const result = await coll.deleteOne(query);
    return { deleted: result.deletedCount };
  }

  async deleteMany(query) {
    const coll = await this._collection();
    const result = await coll.deleteMany(query);
    return { deleted: result.deletedCount };
  }
}

module.exports = { BaseService };
