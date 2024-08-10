import { Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { Environment } from "../../bindings";
import httpStatus from "http-status";
import { getSignedCookie } from "hono/cookie";
import { ApiError } from "../utils/ApiError";
import * as sessionService from "../services/session.service";
import * as goalValidation from "../validations/goal.validation";
import {
  createGoal,
  getGoal,
  updateGoal,
  deleteGoal,
} from "../services/goal.service";

const goalRoute = new Hono<Environment>();

export default goalRoute;

goalRoute.post("/", async (c) => {
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

  const goal = await createGoal(session.values.user_id, body, {
    Bindings: c.env,
  });

  return c.json(goal, httpStatus.CREATED as StatusCode);
});

goalRoute.get("/", async (c) => {
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

  const goal = await getGoal(session.values.user_id, {
    Bindings: c.env,
  });

  return c.json(goal, httpStatus.OK as StatusCode);
});

goalRoute.put("/:id", async (c) => {
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

  const goal = await updateGoal(session.values.user_id, goal_id, body, {
    Bindings: c.env,
  });

  return c.json(goal, httpStatus.OK as StatusCode);
});

goalRoute.delete("/:id", async (c) => {
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

  await deleteGoal(session.values.user_id, goal_id, {
    Bindings: c.env,
  });

  c.status(httpStatus.NO_CONTENT as StatusCode);
  return c.body(null);
});
