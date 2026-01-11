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
 * Run pending migrations
 */
function runMigrations(): void {
  // Try multiple possible paths for migrations directory
  const possiblePaths = [
    path.join(__dirname, '../db/migrations'),
    path.join(__dirname, '../../src/db/migrations'),
    path.resolve(process.cwd(), 'src/db/migrations'),
  ];

  let migrationsDir: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      migrationsDir = p;
      break;
    }
  }

  if (!migrationsDir) {
    console.log('Migrations directory not found, skipping migrations');
    return;
  }

  // Create migrations tracking table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Get list of applied migrations
  const appliedMigrations = new Set(
    db.prepare('SELECT name FROM _migrations').all().map((row: any) => row.name)
  );

  // Get migration files and run any that haven't been applied
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    if (appliedMigrations.has(file)) {
      continue;
    }

    console.log(`Running migration: ${file}`);
    const migrationPath = path.join(migrationsDir, file);
    const migration = fs.readFileSync(migrationPath, 'utf-8');

    // Remove comment lines and split by semicolon
    const cleanedMigration = migration
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    const statements = cleanedMigration
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    try {
      for (const statement of statements) {
        db.exec(statement);
      }
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
      console.log(`Migration ${file} applied successfully`);
    } catch (error: any) {
      // Handle "duplicate column" errors gracefully (column already exists)
      if (error.code === 'SQLITE_ERROR' && error.message.includes('duplicate column')) {
        console.log(`Migration ${file}: column already exists, marking as applied`);
        db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
      } else {
        console.error(`Error running migration ${file}:`, error);
        throw error;
      }
    }
  }
}

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
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      db.exec(statement);
    } catch (error: any) {
      // Ignore "index already exists" errors
      if (error.code === 'SQLITE_ERROR' && error.message.includes('already exists')) {
        continue;
      }
      // Ignore errors for columns that don't exist yet (migrations will handle)
      if (error.code === 'SQLITE_ERROR' && error.message.includes('no such column')) {
        console.log('Schema references new columns - running migrations...');
        runMigrations();
        // Retry the statement after migrations
        try {
          db.exec(statement);
        } catch (retryError: any) {
          if (retryError.code === 'SQLITE_ERROR' && retryError.message.includes('already exists')) {
            continue;
          }
          throw retryError;
        }
        continue;
      }
      console.error('Error executing SQL statement:', statement);
      throw error;
    }
  }

  // Run any remaining migrations
  runMigrations();

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
