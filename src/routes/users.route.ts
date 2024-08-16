import { Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { Environment } from "../../bindings";
import httpStatus from "http-status";
import { getSignedCookie } from "hono/cookie";
import * as sessionService from "../services/session.service";
import { ApiError } from "../utils/ApiError";
import { getUserProfile, searchUsers } from "../services/user.service";
import { getBooks } from "../services/book.service";
import { getShelves } from "../services/shelf.service";
import { getFriends } from "../services/friend.service";
import { BookQuerySchema } from "../validations/book.validation";
import { ShelfQuerySchema } from "../validations/shelf.validation";

const userRoute = new Hono<Environment>();

export default userRoute;

userRoute.get("/", async (c) => {
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
  const users = await searchUsers(q, page, limit, { Bindings: c.env });
  return c.json(users, httpStatus.OK as StatusCode);
});

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
  const userProfile = await getUserProfile(session.values.user_id, {
    Bindings: c.env,
  });

  return c.json(userProfile, httpStatus.OK as StatusCode);
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
    { Bindings: c.env },
    username
  );
  return c.json(userProfile, httpStatus.OK as StatusCode);
});

userRoute.get("/:username/books", async (c) => {
  const sessionID = await getSignedCookie(c, c.env.HMACsecret, "SID");
  let session;
  if (sessionID != null) {
    session = await sessionService.validSession(sessionID.toString(), {
      Bindings: c.env,
    });
  }

  let username = c.req.param("username");
  const queries = c.req.query();
  const queryData = BookQuerySchema.safeParse(queries);

  let books = await getBooks(
    session?.values.user_id,
    queryData.data,
    {
      Bindings: c.env,
    },
    username
  );
  return c.json(books, httpStatus.OK as StatusCode);
});

userRoute.get("/:username/shelves", async (c) => {
  const sessionID = await getSignedCookie(c, c.env.HMACsecret, "SID");
  let session;
  if (sessionID != null) {
    session = await sessionService.validSession(sessionID.toString(), {
      Bindings: c.env,
    });
  }

  let username = c.req.param("username");
  const queries = c.req.query();
  const queryData = ShelfQuerySchema.safeParse(queries);

  const shelves = await getShelves(
    session?.values.user_id,
    queryData.data,
    {
      Bindings: c.env,
    },
    username
  );

  return c.json(shelves, httpStatus.OK as StatusCode);
});

userRoute.get("/:username/friends", async (c) => {
  const sessionID = await getSignedCookie(c, c.env.HMACsecret, "SID");
  let session;
  if (sessionID != null) {
    session = await sessionService.validSession(sessionID.toString(), {
      Bindings: c.env,
    });
  }

  let username = c.req.param("username");

  const { page, limit } = c.req.query();

  const friends = await getFriends(
    session?.values.user_id,
    { Bindings: c.env },
    page,
    limit,
    username
  );

  return c.json(friends, httpStatus.OK as StatusCode);
});
