import { Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { Environment } from "../../bindings";
import httpStatus from "http-status";
import { getSignedCookie } from "hono/cookie";
import * as sessionService from "../services/session.service";
import { ApiError } from "../utils/ApiError";
import {
  getUserProfile,
  searchUsers,
  getUser,
  updateUser,
} from "../services/user.service";
import { userUpdate } from "../validations/user.validation";

const userRoute = new Hono<Environment>();

export default userRoute;

userRoute.get("/users/me", async (c) => {
  const sessionID = await getSignedCookie(c, c.env.HMACsecret, "SID");
  if (sessionID == null) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
  }
  const session = await sessionService.validSession(sessionID.toString(), {
    Bindings: c.env,
  });
  if (session == null) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
  }
  if (!session.values.email_verified) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "User is not verified.");
  }
  const userProfile = await getUserProfile(
    session.values.user_id,
    c.env.DATABASE_URL
  );

  return c.json(userProfile, httpStatus.CREATED as StatusCode);
});

userRoute.get("/users/:username", async (c) => {
  const sessionID = await getSignedCookie(c, c.env.HMACsecret, "SID");
  let session;
  if (sessionID != null) {
    session = await sessionService.validSession(sessionID.toString(), {
      Bindings: c.env,
    });
  }

  let username = c.req.param("username");
  const userProfile = await getUserProfile(
    session?.values.user_id,
    c.env.DATABASE_URL,
    username
  );
  return c.json(userProfile, httpStatus.CREATED as StatusCode);
});

userRoute.get("/users", async (c) => {
  const sessionID = await getSignedCookie(c, c.env.HMACsecret, "SID");
  if (sessionID == null) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
  }
  const session = await sessionService.validSession(sessionID.toString(), {
    Bindings: c.env,
  });
  if (session == null) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
  }
  if (!session.values.email_verified) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "User is not verified.");
  }
  const { q, page, limit } = c.req.query();
  if (!q) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Query parameter is required");
  }
  const users = await searchUsers(q, page, limit, c.env.DATABASE_URL);
  return c.json(users, httpStatus.OK as StatusCode);
});

userRoute.get("/settings", async (c) => {
  const sessionID = await getSignedCookie(c, c.env.HMACsecret, "SID");
  if (sessionID == null) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
  }
  const session = await sessionService.validSession(sessionID.toString(), {
    Bindings: c.env,
  });
  if (session == null) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
  }
  if (!session.values.email_verified) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "User is not verified.");
  }
  const user = await getUser(session.values.user_id, c.env.DATABASE_URL);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  return c.json(user, httpStatus.OK as StatusCode);
});

userRoute.put("/settings", async (c) => {
  const sessionID = await getSignedCookie(c, c.env.HMACsecret, "SID");
  if (sessionID == null) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
  }
  const session = await sessionService.validSession(sessionID.toString(), {
    Bindings: c.env,
  });
  if (session == null) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
  }
  if (!session.values.email_verified) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "User is not verified.");
  }
  const bodyParse = await c.req.json();
  const body = await userUpdate.parseAsync(bodyParse);

  const user = await updateUser(
    session.values.user_id,
    body,
    c.env.DATABASE_URL
  );

  return c.json(user, httpStatus.OK as StatusCode);
});
