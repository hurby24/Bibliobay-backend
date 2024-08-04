import { defineConfig } from "drizzle-kit";

// export default defineConfig({
//   dialect: "postgresql",
//   schema: "./src/db/schema.ts",
//   out: "./drizzle",
// });

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./migrations",
});
