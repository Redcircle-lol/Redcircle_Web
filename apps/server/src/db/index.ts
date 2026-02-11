import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;

// Create PostgreSQL connection pool for Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase connection settings
  ssl: false, // Supabase pooler doesn't require SSL
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool);

// Export all schemas
export * from "./schema/users";
export * from "./schema/posts";
export * from "./schema/holdings";
export * from "./schema/transactions";
export * from "./schema/price-history";
export * from "./schema/waitlist";
