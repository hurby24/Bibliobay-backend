import { z } from "zod";

export const userAuth = z.object({
  email: z.string().email().max(200),
  "cf-turnstile-response": z.string().max(2048),
});

export const otpAuth = z.object({
  otp: z.string().length(6),
});
