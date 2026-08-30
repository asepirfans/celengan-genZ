import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || "postgresql://postgres.xfbkytsfbebkbiiyoxts:money-tracker122@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

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
