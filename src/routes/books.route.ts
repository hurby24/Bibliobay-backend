import { Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { Environment } from "../../bindings";
import httpStatus from "http-status";
import { getSignedCookie } from "hono/cookie";
import * as sessionService from "../services/session.service";
import { ApiError } from "../utils/ApiError";
import { getUserProfile, searchUsers } from "../services/user.service";

const bookRoute = new Hono<Environment>();

export default bookRoute;

// GET /books/:id, POST /books, PUT /books/:id, DELETE /books/:id
// POST /books/:id/cover (multipart/form-data),
