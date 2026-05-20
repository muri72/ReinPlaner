import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// For query purposes (read operations)
const queryClient = postgres(connectionString, { max: 10 });

// For migration purposes
export const migrateClient = postgres(connectionString, { max: 1 });

// Main Drizzle instance with schema
export const db = drizzle(queryClient, { schema });

export type Database = typeof db;