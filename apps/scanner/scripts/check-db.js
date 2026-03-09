// Load .env file if it exists (Prisma will also load it, but we need it for the check)
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

try {
  if (existsSync(envPath)) {
    const envFile = readFileSync(envPath, 'utf-8');
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          // Remove surrounding quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      }
    });
  }
} catch (error) {
  // .env file doesn't exist or can't be read - that's okay
}

// Check if DATABASE_URL is set before running Prisma commands
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl || dbUrl.trim() === '' || dbUrl === "''" || dbUrl === '""') {
  console.log('⚠️  DATABASE_URL not set. Database is optional.');
  console.log('   The Third Layer system will work with file-based storage.');
  console.log('   To enable database features, set DATABASE_URL in .env file.');
  console.log('   Example: DATABASE_URL="postgresql://user:password@localhost:5432/raawix"');
  process.exit(1); // Exit with error to prevent Prisma from running
}

console.log('✅ DATABASE_URL found, proceeding with migration...');
