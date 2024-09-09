import { Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { Environment } from "../../bindings";
import httpStatus from "http-status";
import { getSignedCookie } from "hono/cookie";
import * as sessionService from "../services/session.service";
import * as bookValidation from "../validations/book.validation";
import { ApiError } from "../utils/ApiError";
import * as bookService from "../services/book.service";
import { bodyLimit } from "hono/body-limit";
import { cache } from "hono/cache";
import { sha256 } from "hono/utils/crypto";

const bookRoute = new Hono<Environment>();

bookRoute.get(
  "/",
  cache({
    cacheName: "bibliobay-books",
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
    const queryData = bookValidation.BookQuerySchema.safeParse(queries);

    let books = await bookService.getBooks(
      session?.values.user_id,
      queryData.data,
      {
        Bindings: c.env,
      }
    );

    return c.json(books, httpStatus.OK as StatusCode);
  }
);

bookRoute.get(
  "/:id",
  cache({
    cacheName: "bibliobay-books",
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
    let book_id = c.req.param("id");
    let book = await bookService.getBook(
      book_id,
      { Bindings: c.env },
      session?.values.user_id
    );
    return c.json(book, httpStatus.OK as StatusCode);
  }
);

bookRoute.put(
  "/:id",
  cache({
    cacheName: "bibliobay-books",
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
    let book_id = c.req.param("id");
    const bodyParse = await c.req.json();
    const body = await bookValidation.updateBook.parseAsync(bodyParse);
    const book = await bookService.updateBook(
      session.values.user_id,
      book_id,
      body,
      { Bindings: c.env },
      c.env.IMAGES
    );
    return c.json(book, httpStatus.OK as StatusCode);
  }
);

bookRoute.delete(
  "/:id",
  cache({
    cacheName: "bibliobay-books",
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
    let book_id = c.req.param("id");
    await bookService.deleteBook(
      book_id,
      session.values.user_id,
      { Bindings: c.env },
      c.env.IMAGES
    );
    c.status(httpStatus.NO_CONTENT as StatusCode);
    return c.body(null);
  }
);

bookRoute.post(
  "/",
  cache({
    cacheName: "bibliobay-books",
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
    const body = await bookValidation.createBook.parseAsync(bodyParse);
    const book = await bookService.createBook(body, session.values.user_id, {
      Bindings: c.env,
    });
    return c.json(book, httpStatus.CREATED as StatusCode);
  }
);

bookRoute.post(
  "/cover",
  cache({
    cacheName: "bibliobay-books",
    cacheControl: "no-store",
  }),
  bodyLimit({
    maxSize: 1024 * 1024,
    onError: (c) => {
      return c.text("File size exceeds the limit of 1MB", 413);
    },
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

    const body = await c.req.parseBody();
    const file = body["file"] as File;
    let width = body["width"] ? parseInt(body["width"].toString()) : 0;
    let height = body["height"] ? parseInt(body["height"].toString()) : 0;

    if (!file) {
      return c.text("No file uploaded", 400);
    }
    if (!bookValidation.allowedImageTypes.includes(file.type)) {
      return c.text("Unsupported file type", 415);
    }
    if (width !== 140 || height !== 200) {
      return c.text("Invalid image dimensions", 400);
    }
    const content = await file.arrayBuffer();

    const buffer = new Uint8Array(content);
    const hash = await sha256(buffer);
    const extension = file.type.split("/")[1];
    const key = `${hash}.${extension}`;

    await c.env.IMAGES.put(key, buffer, {
      httpMetadata: { contentType: file.type },
    });

    let url = `https://images.bibliobay.net/${key}`;

    return c.json({ cover_url: url }, httpStatus.CREATED as StatusCode);
  }
);

export default bookRoute;
