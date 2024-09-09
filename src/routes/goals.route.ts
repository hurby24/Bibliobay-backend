import { Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { Environment } from "../../bindings";
import httpStatus from "http-status";
import { getSignedCookie } from "hono/cookie";
import { ApiError } from "../utils/ApiError";
import * as sessionService from "../services/session.service";
import * as goalValidation from "../validations/goal.validation";
import * as goalService from "../services/goal.service";
import { cache } from "hono/cache";

const goalRoute = new Hono<Environment>();

goalRoute.post(
  "/",
  cache({
    cacheName: "bibliobay-goals",
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
    const body = await goalValidation.createGoal.parseAsync(bodyParse);

    const goal = await goalService.createGoal(session.values.user_id, body, {
      Bindings: c.env,
    });

    return c.json(goal, httpStatus.CREATED as StatusCode);
  }
);

goalRoute.get(
  "/",
  cache({
    cacheName: "bibliobay-goals",
    cacheControl: "private, max-age=60",
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

    const goal = await goalService.getGoal(session.values.user_id, {
      Bindings: c.env,
    });

    return c.json(goal, httpStatus.OK as StatusCode);
  }
);

goalRoute.put(
  "/:id",
  cache({
    cacheName: "bibliobay-goals",
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
    const body = await goalValidation.updateGoal.parseAsync(bodyParse);
    const goal_id = c.req.param("id");

    const goal = await goalService.updateGoal(
      session.values.user_id,
      goal_id,
      body,
      {
        Bindings: c.env,
      }
    );

    return c.json(goal, httpStatus.OK as StatusCode);
  }
);

goalRoute.delete(
  "/:id",
  cache({
    cacheName: "bibliobay-goals",
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

    const goal_id = c.req.param("id");

    await goalService.deleteGoal(session.values.user_id, goal_id, {
      Bindings: c.env,
    });

    c.status(httpStatus.NO_CONTENT as StatusCode);
    return c.body(null);
  }
);

export default goalRoute;
