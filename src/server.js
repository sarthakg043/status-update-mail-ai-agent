/**
 * Server entry point — starts the Express HTTP server
 * and connects to MongoDB.
 */

require('dotenv').config();

const { createApp } = require('./api/app');
const { getMongoConnection } = require('./database/mongodb');
const { initAllCollections } = require('./database/initCollections');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    const mongo = getMongoConnection();
    const db = await mongo.connect();
    console.log('MongoDB connected.');

    // Initialise collections (schemas + indexes)
    console.log('Initialising collections...');
    await initAllCollections(db);
    console.log('Collections ready.');

    // Create and start Express app
    const app = createApp();

    app.listen(PORT, () => {
      console.log(`\n🚀  API server listening on http://localhost:${PORT}`);
      console.log(`    Health check: http://localhost:${PORT}/health`);
      console.log(`    API base:     http://localhost:${PORT}/v1\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
