import { z } from "zod";

export const createShelf = z.strictObject({
  name: z.string().min(1).max(50),
  description: z.string().min(1).max(255).optional(),
  private: z.boolean().default(false),
});

export const updateShelf = z.strictObject({
  name: z.string().min(1).max(50).optional(),
  description: z.string().min(1).max(255).optional(),
  private: z.boolean().optional(),
});

export const addBookToShelf = z.strictObject({
  book_id: z.string(),
});

export const ShelfQuerySchema = z.strictObject({
  sort: z.enum(["name", "created_at", "book_count"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.string().regex(/^\d+$/).transform(Number).default("1"),
  limit: z.string().regex(/^\d+$/).transform(Number).default("20"),
});
