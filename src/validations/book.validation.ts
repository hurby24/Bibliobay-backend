import { z } from "zod";

const uniqueArray = (array: number[]) => new Set(array).size === array.length;

export const createBook = z.strictObject({
  title: z.string().min(1).max(150),
  author: z.string().min(3).max(150),
  cover_url: z.string().url(),
  pages: z.number().int().positive().min(1).max(10000),
  current_page: z.number().int().positive().min(0).max(10000).default(0),
  rating: z.number().positive().min(0).max(5).optional(),
  favorite: z.boolean().default(false),
  finished: z.boolean().default(false),
  private: z.boolean().default(false),
  genres: z
    .array(z.number().int().positive().min(1).max(30))
    .min(1)
    .max(3)
    .refine(uniqueArray, {
      message: "Genres must be unique",
    }),
});

export const updateBook = z.strictObject({
  title: z.string().min(1).max(150).optional(),
  author: z.string().min(3).max(150).optional(),
  cover_url: z.string().url().optional(),
  pages: z.number().int().positive().min(1).max(10000).optional(),
  current_page: z.number().int().positive().min(0).max(10000).optional(),
  rating: z.number().positive().min(0).max(5).optional(),
  favorite: z.boolean().optional(),
  finished: z.boolean().optional(),
  private: z.boolean().optional(),
  genres: z
    .array(z.number().int().positive().min(1).max(30))
    .min(1)
    .max(3)
    .refine(uniqueArray, {
      message: "Genres must be unique",
    })
    .optional(),
});

export const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

export const BookQuerySchema = z.strictObject({
  sort: z
    .enum(["title", "author", "pages", "created_at", "finished_at"])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  state: z.enum(["read", "reading", "favorite"]).optional(),
  genre: z.string().regex(/^\d+$/).transform(Number).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default("1"),
  limit: z.string().regex(/^\d+$/).transform(Number).default("20"),
});
