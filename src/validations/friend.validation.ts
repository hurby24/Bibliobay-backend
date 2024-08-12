import { z } from "zod";

export const addFriend = z.strictObject({
  user_id: z.string().length(15),
});

export const acceptFriend = z.strictObject({
  accept: z.boolean(),
});
