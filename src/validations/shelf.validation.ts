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
