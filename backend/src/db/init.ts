#!/usr/bin/env tsx

/**
 * Database initialization script
 * Run with: npm run db:init
 */

import { initializeDatabase, closeDatabase } from '../config/database';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('Initializing database...');

try {
  initializeDatabase();
  console.log('✓ Database initialization complete');
  console.log('✓ Demo user created (id=1, email=demo@local)');
  console.log('✓ Default project created (id=1)');
} catch (error) {
  console.error('✗ Database initialization failed:', error);
  process.exit(1);
} finally {
  closeDatabase();
}
