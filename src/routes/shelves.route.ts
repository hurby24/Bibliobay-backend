import { Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { Environment } from "../../bindings";
import httpStatus from "http-status";
import { getSignedCookie } from "hono/cookie";
import * as sessionService from "../services/session.service";
import * as shelfValidation from "../validations/shelf.validation";
import {
  createShelf,
  updateShelf,
  deleteShelf,
} from "../services/shelf.service";
import { ApiError } from "../utils/ApiError";

const shelfRoute = new Hono<Environment>();

export default shelfRoute;

shelfRoute.post("/", async (c) => {
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
  const body = await shelfValidation.createShelf.parseAsync(bodyParse);
  const shelf = await createShelf(
    session.values.user_id,
    body,
    c.env.DATABASE_URL
  );

  return c.json(shelf, httpStatus.CREATED as StatusCode);
});

shelfRoute.put("/:id", async (c) => {
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
  let shelf_id = c.req.param("id");
  const bodyParse = await c.req.json();
  const body = await shelfValidation.updateShelf.parseAsync(bodyParse);
  const shelf = await updateShelf(
    session.values.user_id,
    shelf_id,
    body,
    c.env.DATABASE_URL
  );
  return c.json(shelf, httpStatus.OK as StatusCode);
});

shelfRoute.delete("/:id", async (c) => {
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
  let shelf_id = c.req.param("id");
  await deleteShelf(session.values.user_id, shelf_id, c.env.DATABASE_URL);

  c.status(httpStatus.NO_CONTENT as StatusCode);
  return c.body(null);
});
