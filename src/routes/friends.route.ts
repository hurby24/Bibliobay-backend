import { Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { Environment } from "../../bindings";
import httpStatus from "http-status";
import { getSignedCookie } from "hono/cookie";
import * as sessionService from "../services/session.service";
import { getFriends, removeFriend } from "../services/friend.service";
import { ApiError } from "../utils/ApiError";

const friendRoute = new Hono<Environment>();

export default friendRoute;

friendRoute.get("/friends", async (c) => {
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
  const { page, limit } = c.req.query();

  const friends = await getFriends(
    session.values.user_id,
    { Bindings: c.env },
    page,
    limit
  );

  return c.json(friends, httpStatus.OK as StatusCode);
});

friendRoute.delete("/friends/:id", async (c) => {
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

  const friend_id = c.req.param("id");

  await removeFriend(session.values.user_id, friend_id, { Bindings: c.env });

  c.status(httpStatus.NO_CONTENT as StatusCode);
  return c.body(null);
});
