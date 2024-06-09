import { createDatabaseConnection } from "../db/connection";
import { Redis } from "@upstash/redis/cloudflare";
import { Environment } from "../../bindings";
import { email_verification_codes } from "../db/schema";
import { generateRandomString, alphabet } from "oslo/crypto";
import { createDate, TimeSpan, isWithinExpirationDate } from "oslo";
import httpStatus from "http-status";
import { ApiError } from "../utils/ApiError";
import { eq } from "drizzle-orm";

const defaultSessionIDLength = 60;

interface Session {
  id: string;
  values: { [key: string]: any };
}

export const CreateSession = async (
  userId: string,
  Env: Environment,
  temporary: boolean = false,
  sessionIDLength: number = defaultSessionIDLength
): Promise<Session> => {
  const sid = generateRandomString(sessionIDLength, alphabet("a-z", "0-9"));
  const id = `${userId}:${sid}`;
  let absoluteExpiration = 10 * 24 * 60 * 60;
  let expiration = createDate(new TimeSpan(10, "d"));
  let verified = true;
  if (temporary) {
    absoluteExpiration = 60 * 60;
    expiration = createDate(new TimeSpan(1, "h"));
    verified = false;
  }

  const values = {
    user_id: userId,
    email_verified: verified,
    expires_at: expiration,
  };
  const redis = Redis.fromEnv(Env.Bindings);
  try {
    const p = redis.pipeline();
    p.json.set(id, "$", JSON.stringify(values));
    p.expire(id, absoluteExpiration);
    await p.exec();
  } catch (error) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create session"
    );
  }
  return { id, values };
};

export const validSession = async (
  id: string,
  Env: Environment
): Promise<Session | null> => {
  let session: any;
  const redis = Redis.fromEnv(Env.Bindings);
  try {
    session = await redis.json.get(id, "$");
  } catch (error) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to read session"
    );
  }
  if (!session) {
    return null;
  }
  const sessionData = {
    user_id: session[0].user_id,
    email_verified: session[0].email_verified,
    expires_at: session[0].expires_at,
  };
  if (!isWithinExpirationDate(new Date(sessionData.expires_at))) {
    return null;
  }
  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
  if (
    fiveDaysFromNow > new Date(sessionData.expires_at) &&
    !sessionData.email_verified
  ) {
    sessionData.expires_at = createDate(new TimeSpan(10, "d"));
    const p = redis.pipeline();
    p.json.set(id, "$.expires_at", JSON.stringify(sessionData.expires_at));
    p.expire(id, 10 * 24 * 60 * 60);
    await p.exec();
  }
  return { id, values: sessionData };
};

export const deleteSession = async (id: string, Env: Environment) => {
  const redis = Redis.fromEnv(Env.Bindings);
  try {
    await redis.del(id);
  } catch (error) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to delete session"
    );
  }
};

export const sessionCookie = async (expires_in: number) => {
  let expires = new TimeSpan(expires_in, "d").seconds();
  let expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const properities = {
    maxAge: expires,
    expires: expirationDate,
  };
  return properities;
};

export const createOTP = async (user: any, databaseConfig: string) => {
  const db = await createDatabaseConnection(databaseConfig);
  await db
    .delete(email_verification_codes)
    .where(eq(email_verification_codes.user_id, user.id));
  let result;
  const code = generateRandomString(6, alphabet("0-9"));
  const email_verifaction_code = {
    code: code,
    user_id: user.id,
    email: user.email,
    expires_at: createDate(new TimeSpan(15, "m")),
  };
  try {
    result = await db
      .insert(email_verification_codes)
      .values(email_verifaction_code)
      .returning();
  } catch (error) {
    console.log(error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create OTP"
    );
  }
  return result[0];
};

export const verifyOTP = async (
  user_id: string,
  code: string,
  databaseConfig: string
): Promise<boolean> => {
  const db = await createDatabaseConnection(databaseConfig);
  const verification = await db
    .select()
    .from(email_verification_codes)
    .where(eq(email_verification_codes.user_id, user_id));
  if (verification.length === 0) {
    return false;
  }
  if (
    verification[0].code !== code ||
    !isWithinExpirationDate(new Date(verification[0].expires_at))
  ) {
    return false;
  }
  return true;
};
