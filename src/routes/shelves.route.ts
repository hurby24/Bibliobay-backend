import { Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { Environment } from "../../bindings";
import httpStatus from "http-status";
import { getSignedCookie } from "hono/cookie";
import * as sessionService from "../services/session.service";
import * as shelfValidation from "../validations/shelf.validation";
import * as shelfService from "../services/shelf.service";
import { ApiError } from "../utils/ApiError";
import { cache } from "hono/cache";

const shelfRoute = new Hono<Environment>();

shelfRoute.post(
  "/",
  cache({
    cacheName: "bibliobay-shelves",
    cacheControl: "no-store",
  }),
  async (c) => {
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
    const shelf = await shelfService.createShelf(session.values.user_id, body, {
      Bindings: c.env,
    });

    return c.json(shelf, httpStatus.CREATED as StatusCode);
  }
);

shelfRoute.get(
  "/",
  cache({
    cacheName: "bibliobay-shelves",
    cacheControl: "private, max-age=0, must-revalidate",
  }),
  async (c) => {
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

    const queries = c.req.query();
    const queryData = shelfValidation.ShelfQuerySchema.safeParse(queries);

    const shelves = await shelfService.getShelves(
      session.values.user_id,
      queryData.data,
      {
        Bindings: c.env,
      }
    );

    return c.json(shelves, httpStatus.OK as StatusCode);
  }
);

shelfRoute.get(
  "/:id",
  cache({
    cacheName: "bibliobay-shelves",
    cacheControl: "public, max-age=60",
  }),
  async (c) => {
    const sessionID = await getSignedCookie(c, c.env.HMACsecret, "SID");
    let session;
    if (sessionID != null) {
      session = await sessionService.validSession(sessionID.toString(), {
        Bindings: c.env,
      });
    }
    let shelf_id = c.req.param("id");

    let shelf = await shelfService.getShelf(
      shelf_id,
      { Bindings: c.env },
      session?.values.user_id
    );

    return c.json(shelf, httpStatus.OK as StatusCode);
  }
);

shelfRoute.put(
  "/:id",
  cache({
    cacheName: "bibliobay-shelves",
    cacheControl: "no-store",
  }),
  async (c) => {
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
    const shelf = await shelfService.updateShelf(
      session.values.user_id,
      shelf_id,
      body,
      {
        Bindings: c.env,
      }
    );
    return c.json(shelf, httpStatus.OK as StatusCode);
  }
);

shelfRoute.delete(
  "/:id",
  cache({
    cacheName: "bibliobay-shelves",
    cacheControl: "no-store",
  }),
  async (c) => {
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
    await shelfService.deleteShelf(session.values.user_id, shelf_id, {
      Bindings: c.env,
    });

    c.status(httpStatus.NO_CONTENT as StatusCode);
    return c.body(null);
  }
);

shelfRoute.post(
  "/:id/items",
  cache({
    cacheName: "bibliobay-shelves",
    cacheControl: "no-store",
  }),
  async (c) => {
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
    const body = await shelfValidation.addBookToShelf.parseAsync(bodyParse);

    await shelfService.addBookToShelf(
      shelf_id,
      body.book_id,
      session.values.user_id,
      {
        Bindings: c.env,
      }
    );

    c.status(httpStatus.NO_CONTENT as StatusCode);
    return c.body(null);
  }
);

shelfRoute.delete(
  "/:id/items/:book_id",
  cache({
    cacheName: "bibliobay-shelves",
    cacheControl: "no-store",
  }),
  async (c) => {
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
    let book_id = c.req.param("book_id");

    await shelfService.removeBookFromShelf(
      shelf_id,
      book_id,
      session.values.user_id,
      {
        Bindings: c.env,
      }
    );

    c.status(httpStatus.NO_CONTENT as StatusCode);
    return c.body(null);
  }
);

export default shelfRoute;
