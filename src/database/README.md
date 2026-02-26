# Database Service Documentation

This module provides a **database-agnostic interface** for CRUD operations. The architecture is designed to be **scalable** and **maintainable**, allowing you to switch database providers with minimal code changes.

## Architecture

```
database/
├── index.js              # Entry point for exports
├── mongodb.js            # MongoDB-specific implementation
├── databaseService.js    # Abstract database interface (provider-agnostic)
└── README.md            # This file
```

### Design Principles

1. **Separation of Concerns**: Database-specific code is isolated in `mongodb.js`
2. **Abstract Interface**: `databaseService.js` provides a standard API regardless of the underlying database
3. **Easy Migration**: To switch from MongoDB to PostgreSQL/MySQL, only modify the implementation, not the interface
4. **Singleton Pattern**: Single connection instance shared across the application

## Setup

### Environment Variables

Add these to your `.env` file:

```env
# MongoDB Configuration
MONGODB_USERNAME=your_username
MONGODB_PASSWORD=your_password
MONGODB_HOST=your-cluster.mongodb.net  # Optional, defaults to existing host
MONGODB_DATABASE=status-updates        # Optional, defaults to status-updates
```

## Usage Examples

### Basic Setup

```javascript
const { getDatabaseService } = require('./database');

// Get singleton instance
const db = getDatabaseService();

// Connect to database
await db.connect();

// Use the service...

// Disconnect when done
await db.disconnect();
```

### CREATE Operations

```javascript
// Create a single document
const statusUpdate = await db.create('statusUpdates', {
  userId: 'user123',
  content: 'Completed feature X',
  prNumbers: [42, 43],
  sentAt: new Date()
});

// Create multiple documents
const updates = await db.createMany('statusUpdates', [
  { userId: 'user1', content: 'Update 1' },
  { userId: 'user2', content: 'Update 2' }
]);
```

### READ Operations

```javascript
// Find by ID
const update = await db.findById('statusUpdates', '507f1f77bcf86cd799439011');

// Find one by query
const latest = await db.findOne('statusUpdates', 
  { userId: 'user123' },
);

// Find multiple with options
const userUpdates = await db.find('statusUpdates',
  { userId: 'user123' },
  { 
    sort: { createdAt: -1 },
    limit: 10,
    skip: 0
  }
);

// Find all
const allUpdates = await db.findAll('statusUpdates');

// Count documents
const count = await db.count('statusUpdates', { userId: 'user123' });

// Check if exists
const exists = await db.exists('statusUpdates', { userId: 'user123' });
```

### UPDATE Operations

```javascript
// Update by ID
await db.updateById('statusUpdates', updateId, {
  content: 'Updated content',
  edited: true
});

// Update one by query
await db.updateOne('statusUpdates',
  { userId: 'user123' },
  { lastActive: new Date() }
);

// Update many
await db.updateMany('statusUpdates',
  { sentAt: { $lt: new Date('2026-01-01') } },
  { archived: true }
);

// Upsert (update or insert)
await db.upsert('statusUpdates',
  { userId: 'user123', date: '2026-02-26' },
  { content: 'Daily update', status: 'sent' }
);
```

### DELETE Operations

```javascript
// Delete by ID
await db.deleteById('statusUpdates', updateId);

// Delete one by query
await db.deleteOne('statusUpdates', { userId: 'user123' });

// Delete many
await db.deleteMany('statusUpdates', { archived: true });
```

## Application Integration Example

```javascript
const { getDatabaseService } = require('./database');

async function saveStatusUpdate(userId, prData, emailContent) {
  const db = getDatabaseService();
  
  try {
    // Ensure connection
    await db.connect();
    
    // Save status update
    const statusUpdate = await db.create('statusUpdates', {
      userId,
      pullRequests: prData,
      emailContent,
      sentAt: new Date(),
      status: 'sent'
    });
    
    console.log('Status update saved:', statusUpdate.id);
    return statusUpdate;
    
  } catch (error) {
    console.error('Failed to save status update:', error);
    throw error;
  }
}

async function getUserHistory(userId, limit = 10) {
  const db = getDatabaseService();
  
  try {
    await db.connect();
    
    const history = await db.find('statusUpdates',
      { userId },
      { 
        sort: { createdAt: -1 },
        limit 
      }
    );
    
    return history;
    
  } catch (error) {
    console.error('Failed to retrieve history:', error);
    throw error;
  }
}
```

## Switching Database Providers

To switch from MongoDB to another database (e.g., PostgreSQL):

1. **Create a new implementation file** (e.g., `postgresql.js`):
```javascript
class PostgreSQLConnection {
  async connect() { /* PostgreSQL connection logic */ }
  async getCollection(name) { /* Return table accessor */ }
  async disconnect() { /* Close connection */ }
}
```

2. **Update databaseService.js constructor**:
```javascript
constructor() {
  // Change this line
  this.connection = getPostgreSQLConnection(); // instead of getMongoConnection()
  this.provider = 'postgresql';
}
```

3. **That's it!** All your application code using `getDatabaseService()` continues to work without changes.

## Advanced: Raw Access

If you need database-specific features not covered by the abstract interface:

```javascript
const db = getDatabaseService();

// Get raw database connection
const rawDB = await db.getRawConnection();

// Get raw collection (MongoDB specific)
const rawCollection = await db.getRawCollection('statusUpdates');

// Use MongoDB-specific features
const result = await rawCollection.aggregate([
  { $match: { userId: 'user123' } },
  { $group: { _id: '$status', count: { $sum: 1 } } }
]).toArray();
```

## Best Practices

1. **Use the singleton**: Always use `getDatabaseService()` instead of creating new instances
2. **Connect once**: Call `connect()` at application startup, not before each operation
3. **Let it pool**: The connection manager handles connection pooling automatically
4. **Graceful shutdown**: Call `disconnect()` when your application exits
5. **Error handling**: Wrap database operations in try-catch blocks
6. **Stay abstract**: Use the standard CRUD methods when possible to maintain provider independence

## Collections/Tables

Suggested collections for this application:

- `statusUpdates`: Stores sent status update emails
- `users`: User configuration and preferences
- `pullRequests`: Cached PR data
- `emailLogs`: Email delivery tracking
