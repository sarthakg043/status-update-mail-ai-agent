# Database Integration Quick Start

## ✅ What Was Created

The database module has been restructured with proper separation of concerns:

```
src/database/
├── index.js              # Main exports
├── mongodb.js            # MongoDB-specific implementation
├── databaseService.js    # Abstract CRUD interface
├── example.js            # Usage examples
└── README.md            # Detailed documentation
```

## 🚀 Quick Setup

### 1. Add Environment Variables

Add to your `.env` file:

```env
# Database Configuration (optional - set DATABASE_ENABLED=true to use)
DATABASE_ENABLED=true
MONGODB_USERNAME=your_username
MONGODB_PASSWORD=your_password
MONGODB_HOST=status-update-ai-main.0mr0frx.mongodb.net
MONGODB_DATABASE=status-updates
```

### 2. Basic Usage

```javascript
const { getDatabaseService } = require('./database');

// Get singleton instance
const db = getDatabaseService();

// Connect (do this once at app startup)
await db.connect();

// Use CRUD operations
const doc = await db.create('statusUpdates', { data: 'value' });
const results = await db.find('statusUpdates', { userId: 'user123' });

// Disconnect (on app shutdown)
await db.disconnect();
```

## 📋 Common Operations

### Save a Status Update

```javascript
const { getDatabaseService } = require('./database');

async function saveUpdate(userId, prData, emailData) {
  const db = getDatabaseService();
  await db.connect();
  
  return await db.create('statusUpdates', {
    userId,
    pullRequests: prData,
    emailContent: emailData,
    sentAt: new Date()
  });
}
```

### Get History

```javascript
async function getHistory(userId) {
  const db = getDatabaseService();
  await db.connect();
  
  return await db.find('statusUpdates',
    { userId },
    { sort: { sentAt: -1 }, limit: 10 }
  );
}
```

## 🔄 Integrating into Main Application

Update `src/index.js` to include database operations:

```javascript
const { getDatabaseService } = require('./database');
const { loadConfig } = require('./config');

async function main() {
  const config = loadConfig();
  
  // Initialize database if enabled
  let db = null;
  if (config.database.enabled) {
    db = getDatabaseService();
    await db.connect();
  }
  
  try {
    // ... existing code to fetch PRs and generate email ...
    
    // Save to database if available
    if (db) {
      await db.create('statusUpdates', {
        userId: config.github.username,
        pullRequests: prData,
        emailContent: generatedEmail,
        recipients: [config.email.to],
        sentAt: new Date(),
        status: 'sent'
      });
      console.log('✓ Status update saved to database');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Cleanup
    if (db) await db.disconnect();
  }
}
```

## 🎯 Key Features

### ✨ Provider-Agnostic Design

The `databaseService.js` provides a standard interface. To switch from MongoDB to PostgreSQL:

1. Create `postgresql.js` with the same interface as `mongodb.js`
2. Update one line in `databaseService.js` constructor
3. Application code remains unchanged

### 🔒 Connection Pooling

MongoDB connection uses built-in pooling:
- Min pool size: 2 connections
- Max pool size: 10 connections
- Auto-reconnection on failure

### 📊 Available Collections

Suggested collections:
- `statusUpdates` - Email history and PR data
- `users` - User preferences
- `emailLogs` - Delivery tracking
- `pullRequests` - Cached PR information

## 📖 Available CRUD Methods

### Create
- `create(collection, data)` - Insert one
- `createMany(collection, dataArray)` - Insert many

### Read
- `findById(collection, id)` - Find by ID
- `findOne(collection, query)` - Find one by query
- `find(collection, query, options)` - Find many
- `findAll(collection, options)` - Find all
- `count(collection, query)` - Count documents
- `exists(collection, query)` - Check existence

### Update
- `updateById(collection, id, data)` - Update by ID
- `updateOne(collection, query, data)` - Update one
- `updateMany(collection, query, data)` - Update many
- `upsert(collection, query, data)` - Update or insert

### Delete
- `deleteById(collection, id)` - Delete by ID
- `deleteOne(collection, query)` - Delete one
- `deleteMany(collection, query)` - Delete many

## 🧪 Testing

Run the example workflow:

```bash
# Make sure your .env has DATABASE_ENABLED=true and MongoDB credentials
node src/database/example.js
```

## 📚 More Information

See [src/database/README.md](README.md) for:
- Detailed API documentation
- Advanced usage examples
- Migration guide for switching providers
- Best practices

## ⚠️ Important Notes

1. **Optional Feature**: Database is optional. Set `DATABASE_ENABLED=false` to run without it
2. **Singleton Pattern**: Always use `getDatabaseService()` to get the instance
3. **Connect Once**: Call `connect()` at startup, not before each operation
4. **Error Handling**: Wrap database calls in try-catch blocks
5. **Graceful Shutdown**: Call `disconnect()` on app exit

## 🎨 Architecture Benefits

- ✅ Separation of concerns (MongoDB code isolated)
- ✅ Easy to test (mock the database service)
- ✅ Easy to migrate (swap implementation, keep interface)
- ✅ Type-safe operations (consistent API)
- ✅ Connection pooling (automatic)
- ✅ Error handling (standardized)
