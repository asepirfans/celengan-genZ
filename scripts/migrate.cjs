const fs = require('node:fs');
require('@next/env').loadEnvConfig(process.cwd());
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
 const client = await pool.connect();
 try { await client.query('BEGIN'); for (const file of fs.readdirSync('db/migrations').filter(name=>name.endsWith('.sql')).sort()) await client.query(fs.readFileSync('db/migrations/'+file, 'utf8')); await client.query('COMMIT'); console.log('Migrations applied.'); }
 catch(error) { await client.query('ROLLBACK'); console.error('Migration failed:', error.code); process.exitCode=1; }
 finally { client.release(); await pool.end(); }
})();
