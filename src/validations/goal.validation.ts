import { z } from "zod";

export const createGoal = z.strictObject({
  goal_type: z.enum(["monthly", "annual"]),
  target: z.number().int().min(1).max(1000),
});

export const updateGoal = z.strictObject({
  target: z.number().int().min(1).max(1000).optional(),
});
