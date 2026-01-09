import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Create connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Or use individual environment variables
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'outreach_crm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('📦 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper function for queries
export async function query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('📝 Query executed', { text: text.substring(0, 50) + '...', duration: duration + 'ms', rows: res.rowCount });
  }
  
  return res;
}

// Get a client from the pool for transactions
export async function getClient() {
  const client = await pool.connect();
  return client;
}

// Graceful shutdown
export async function closePool() {
  await pool.end();
  console.log('📦 PostgreSQL pool closed');
}

export default pool;
