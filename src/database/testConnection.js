#!/usr/bin/env node
/**
 * Quick Database Connection Test
 * 
 * Run this script to verify your MongoDB connection is working:
 * node src/database/testConnection.js
 */

require('dotenv').config();
const { getMongoConnection } = require('./mongodb');
const { COLLECTIONS } = require('./collections');

async function testConnection() {
  console.log('🔍 Testing MongoDB Connection...\n');
  
  const connection = getMongoConnection();
  
  try {
    // Test connection
    console.log('📡 Connecting to MongoDB...');
    const db = await connection.connect();
    console.log('✅ Successfully connected to MongoDB!\n');
    
    // List all collections
    console.log('📋 Checking collections...');
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('⚠️  No collections found. Run the seed script to create them.\n');
    } else {
      console.log(`✅ Found ${collections.length} collections:\n`);
      
      // Count documents in each collection
      for (const collName of Object.values(COLLECTIONS)) {
        const coll = db.collection(collName);
        const count = await coll.countDocuments();
        const status = count > 0 ? '✓' : '○';
        console.log(`   ${status} ${collName.padEnd(25)} : ${count} documents`);
      }
      
      console.log('');
    }
    
    // Connection info
    console.log('📊 Connection Details:');
    console.log(`   Database: ${db.databaseName}`);
    console.log(`   Host: ${process.env.MONGODB_HOST || 'status-update-ai-main.0mr0frx.mongodb.net'}`);
    console.log('');
    
    console.log('✅ Connection test completed successfully!');
    
    if (collections.length === 0 || 
        !Object.values(COLLECTIONS).every(name => 
          collections.find(c => c.name === name)
        )) {
      console.log('\n💡 Tip: Run the seed script to populate the database:');
      console.log('   node src/database/seedDatabase.js');
    }
    
  } catch (error) {
    console.error('❌ Connection test failed!');
    console.error('\nError details:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check your .env file has MongoDB credentials:');
    console.error('      - MONGODB_USERNAME');
    console.error('      - MONGODB_PASSWORD');
    console.error('      - MONGODB_HOST (optional)');
    console.error('      - MONGODB_DATABASE (optional)');
    console.error('');
    console.error('   2. Verify your IP is whitelisted in MongoDB Atlas');
    console.error('   3. Check that your credentials are correct');
    process.exit(1);
  } finally {
    await connection.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  testConnection().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { testConnection };
