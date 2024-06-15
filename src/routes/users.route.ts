import { Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { Environment } from "../../bindings";
import httpStatus from "http-status";
import { getSignedCookie } from "hono/cookie";
import * as sessionService from "../services/session.service";
import { ApiError } from "../utils/ApiError";
import { getUserProfile } from "../services/user.service";

const userRoute = new Hono<Environment>();

export default userRoute;

userRoute.get("/me", async (c) => {
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

userRoute.get("/:username", async (c) => {
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

//add user search
