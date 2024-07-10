import { Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { Environment } from "../../bindings";
import httpStatus from "http-status";
import { getSignedCookie } from "hono/cookie";
import * as sessionService from "../services/session.service";
import * as bookValidation from "../validations/book.validation";
import { ApiError } from "../utils/ApiError";
import { getBook, createBook, deleteBook } from "../services/book.service";

const bookRoute = new Hono<Environment>();

export default bookRoute;

// GET /books/:id, POST /books, PUT /books/:id, DELETE /books/:id
// POST /books/:id/cover (multipart/form-data),
bookRoute.get("/:id", async (c) => {
  const sessionID = await getSignedCookie(c, c.env.HMACsecret, "SID");
  let session;
  if (sessionID != null) {
    session = await sessionService.validSession(sessionID.toString(), {
      Bindings: c.env,
    });
  }
  let book_id = c.req.param("id");
  let book = await getBook(
    book_id,
    c.env.DATABASE_URL,
    session?.values.user_id
  );
  return c.json(book, httpStatus.OK as StatusCode);
});

bookRoute.delete("/:id", async (c) => {
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
  await deleteBook(
    book_id,
    session.values.user_id,
    c.env.DATABASE_URL,
    c.env.IMAGES
  );
  c.status(httpStatus.NO_CONTENT as StatusCode);
  return c.body(null);
});

bookRoute.post("/", async (c) => {
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
  const book = await createBook(
    body,
    session.values.user_id,
    c.env.DATABASE_URL
  );
  return c.json(book, httpStatus.CREATED as StatusCode);
});
