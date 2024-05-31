import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";

export const createDatabaseConnection = async (DATABASE_URL: string) => {
  const client = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(client);
  return db;
};
