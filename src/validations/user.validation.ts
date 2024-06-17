import { z } from "zod";

export const userAuth = z.object({
  email: z.string().email().max(200),
  "cf-turnstile-response": z.string().max(2048),
});

export const otpAuth = z.object({
  otp: z.string().length(6),
});

export const userUpdate = z.strictObject({
  username: z.string().min(3).max(25).optional(),
  bio: z.string().max(255).optional(),
  private: z.boolean().optional(),
});

export const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
