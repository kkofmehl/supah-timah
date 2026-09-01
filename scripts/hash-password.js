#!/usr/bin/env node
/**
 * Generate a bcrypt hash for APP_PASSWORD_HASH in .env
 * Usage: npm run hash-password -- your-password
 */
import bcrypt from 'bcrypt';

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run hash-password -- <your-password>');
  console.error('');
  console.error('Example:');
  console.error('  npm run hash-password -- mysecret');
  console.error('');
  console.error('Then add the output to .env (keep the single quotes):');
  console.error("  APP_PASSWORD_HASH='$2b$10$...'");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
console.log('');
console.log('Add this line to your .env file:');
console.log('');
console.log(`APP_PASSWORD_HASH='${hash}'`);
console.log('');
