import { createMiddleware } from "hono/factory";
import { Environment } from "../../bindings";
import { ApiError } from "../utils/ApiError";
import { getSignedCookie } from "hono/cookie";
import httpStatus from "http-status";

const crsftoken = createMiddleware<Environment>(async (c, next) => {
  let key = await getSignedCookie(c, c.env.HMACsecret, "SID");
  if (key == null) {
    key = c.req.header("CF-Connecting-IP");
  }
  const { success } = await c.env.MY_RATE_LIMITER.limit({ key: key });
  if (!success) {
    throw new ApiError(httpStatus.TOO_MANY_REQUESTS, "Too many requests");
  }
  await next();
});

export default crsftoken;
