import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.SQLITE_DB_PATH || './data/kgs.db';

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database connection
export const db: Database.Database = new Database(DB_PATH, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
});

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

/**
 * Initialize database schema
 */
export function initializeDatabase(): void {
  const schemaPath = path.join(__dirname, '../db/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Execute schema (split by semicolon and execute each statement)
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      db.exec(statement);
    } catch (error) {
      console.error('Error executing SQL statement:', statement);
      throw error;
    }
  }

  console.log('Database initialized successfully');
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  db.close();
}

// Graceful shutdown
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});
