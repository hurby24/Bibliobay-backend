import { Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { Environment } from "../../bindings";
import httpStatus from "http-status";
import { getSignedCookie } from "hono/cookie";
import * as sessionService from "../services/session.service";
import { ApiError } from "../utils/ApiError";
import { getBook } from "../services/book.service";

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
