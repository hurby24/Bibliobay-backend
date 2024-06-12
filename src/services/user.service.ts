import { createDatabaseConnection } from "../db/connection";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import httpStatus from "http-status";
import { ApiError } from "../utils/ApiError";
import { spaceSlug, verb, digits, noun } from "space-slug";

export const CreateUser = async (email: string, databaseConfig: string) => {
  let result;
  const db = await createDatabaseConnection(databaseConfig);
  const id = nanoid();
  const username = spaceSlug([verb(1), noun(1), digits(5)], {
    separator: "-",
    cleanString(word) {
      word = word.toLowerCase();
      if (word.length > 25) {
        word = word.slice(0, 25);
      }
      return word;
    },
  });
  const user = {
    id: id,
    username: username,
    email: email,
    bio: "",
    avatar: "test",
  };
  try {
    result = await db.insert(users).values(user).returning();
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User already exists");
  }
  return result[0];
};

export const loginUser = async (email: string, databaseConfig: string) => {
  let result;
  const db = await createDatabaseConnection(databaseConfig);
  try {
    // result = await db.select().from(users).where(eq(users.email, email));
    result = await db
      .update(users)
      .set({ last_sign_in_at: new Date() })
      .where(eq(users.email, email))
      .returning();
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to login");
  }
  if (result.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User does not exist");
  }
  return result[0];
};

export const getUser = async (id: string, databaseConfig: string) => {
  let result;
  const db = await createDatabaseConnection(databaseConfig);
  try {
    result = await db.select().from(users).where(eq(users.id, id));
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to get user");
  }

  return result[0];
};

// getUserprofile takes username and id
