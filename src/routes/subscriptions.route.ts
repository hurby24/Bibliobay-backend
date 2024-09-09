import { Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { Environment } from "../../bindings";
import httpStatus from "http-status";
import { getSignedCookie } from "hono/cookie";
import * as sessionService from "../services/session.service";
import { ApiError } from "../utils/ApiError";
import * as subscriptionService from "../services/subscription.service";
import { HMAC } from "oslo/crypto";
import { cache } from "hono/cache";

const subscriptionRoute = new Hono<Environment>();

subscriptionRoute.get(
  "/",
  cache({
    cacheName: "bibliobay-subscriptions",
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

    const subscription = await subscriptionService.getSubscription(
      session.values.user_id,
      {
        Bindings: c.env,
      }
    );

    return c.json(subscription, httpStatus.OK as StatusCode);
  }
);

subscriptionRoute.post(
  "/",
  cache({
    cacheName: "bibliobay-subscriptions",
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

    const checkoutURL = await subscriptionService.createCheckoutURL(
      session.values.user_id,
      {
        Bindings: c.env,
      }
    );

    return c.json({ checkoutURL }, httpStatus.CREATED as StatusCode);
  }
);

subscriptionRoute.post(
  "/webhook",
  cache({
    cacheName: "bibliobay-subscriptions",
    cacheControl: "no-store",
  }),
  async (c) => {
    const signature = c.req.header("X-Signature");
    if (!signature) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Missing signature header");
    }
    const payload = await c.req.text();
    const secret = c.env.WEBHOOK_SECRET;

    const hs256 = new HMAC("SHA-256");
    const secretData = new TextEncoder().encode(secret);
    const payloadData = new TextEncoder().encode(payload);
    const hash = await hs256.sign(secretData, payloadData);

    const hexHash = Array.prototype.map
      .call(new Uint8Array(hash), (x) => x.toString(16).padStart(2, "0"))
      .join("");

    if (hexHash !== signature) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid signature");
    }

    const event = await c.req.json();

    const success = await subscriptionService.handleEvent(event, {
      Bindings: c.env,
    });

    return c.json({ success: success }, httpStatus.OK as StatusCode);
  }
);

export default subscriptionRoute;
