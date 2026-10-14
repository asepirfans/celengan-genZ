import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL environment variable is not set. Copy .env.example to .env.local and fill it in.'
  );
}

// Global cached pool for server actions / API routes
let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
} else {
  if (!(global as any).pgPool) {
    (global as any).pgPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
  }
  pool = (global as any).pgPool;
}

export default pool;
