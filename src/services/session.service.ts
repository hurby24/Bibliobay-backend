import { createDatabaseConnection } from "../db/connection";
import { email_verifaction_codes } from "../db/schema";
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
  userSessionsKV: KVNamespace,
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
  try {
    await userSessionsKV.put(id, JSON.stringify(values), {
      expirationTtl: absoluteExpiration,
    });
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
  userSessionsKV: KVNamespace
): Promise<Session | null> => {
  let session;
  try {
    session = await userSessionsKV.get(id);
  } catch (error) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to read session"
    );
  }
  if (!session) {
    return null;
  }
  const sessionData = JSON.parse(session);
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
    await userSessionsKV.put(id, JSON.stringify(sessionData), {
      expirationTtl: 10 * 24 * 60 * 60,
    });
  }
  return { id, values: sessionData };
};

export const deleteSession = async (
  id: string,
  userSessionsKV: KVNamespace
) => {
  try {
    await userSessionsKV.delete(id);
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
    .delete(email_verifaction_codes)
    .where(eq(email_verifaction_codes.user_id, user.id));
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
      .insert(email_verifaction_codes)
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
    .from(email_verifaction_codes)
    .where(eq(email_verifaction_codes.user_id, user_id));
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
