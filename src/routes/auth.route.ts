import { Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { Environment } from "../../bindings";
import httpStatus from "http-status";
import * as userValidation from "../validations/user.validation";
import { CreateUser, loginUser, getUser } from "../services/user.service";
import * as sessionService from "../services/session.service";
import { ApiError } from "../utils/ApiError";
import { setSignedCookie, getSignedCookie, setCookie } from "hono/cookie";
import { createCsrfToken } from "../utils/csrftoken";
import { sendOtpEmail } from "../services/email.service";
import { formatUserAgent, validateCaptcha } from "../utils/utils";

const authRoute = new Hono<Environment>();

authRoute.post("/signup", async (c) => {
  const sessionID = await getSignedCookie(c, c.env.HMACsecret, "SID");
  if (sessionID != null) {
    const session = await sessionService.validSession(sessionID.toString(), {
      Bindings: c.env,
    });
    if (session != null) {
      throw new ApiError(httpStatus.BAD_REQUEST, "User already logged in");
    }
  }

  const bodyParse = await c.req.json();
  const body = await userValidation.userAuth.parseAsync(bodyParse);
  const { email, "cf-turnstile-response": cfTurnstileResponse } = body;
  const ip = c.req.header("CF-Connecting-IP");
  const captcha = await validateCaptcha(
    cfTurnstileResponse,
    c.env.TURNSTILE_SECRET,
    ip
  );
  if (!captcha) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid captcha");
  }
  const user = await CreateUser(email, c.env.DATABASE_URL);
  const session = await sessionService.CreateSession(
    user.id,
    { Bindings: c.env },
    true
  );
  let cookieData = await sessionService.sessionCookie(1);
  await setSignedCookie(c, "SID", session.id, c.env.HMACsecret, {
    path: "/",
    secure: true,
    httpOnly: true,
    maxAge: cookieData.maxAge,
    expires: cookieData.expires,
    sameSite: "Lax",
  });
  const otp = await sessionService.createOTP(user, c.env.DATABASE_URL);
  let userAgent = c.req.header("user-agent");
  userAgent = formatUserAgent(userAgent);
  await sendOtpEmail(
    user.email,
    {
      Mode: "Signup",
      code: otp.code,
      Device: userAgent,
      Date: new Date().toISOString(),
    },
    c.env.AWS_ACCESS_KEY_ID,
    c.env.AWS_SECRET_ACCESS_KEY
  );
  const newcsrfToken = await createCsrfToken(session.id, c.env.HMACsecret);

  setCookie(c, "csrftoken", newcsrfToken, {
    path: "/",
    secure: true,
    sameSite: "Lax",
  });
  return c.json(user, httpStatus.CREATED as StatusCode);
});

authRoute.post("/login", async (c) => {
  const sessionID = await getSignedCookie(c, c.env.HMACsecret, "SID");
  if (sessionID != null) {
    const session = await sessionService.validSession(sessionID.toString(), {
      Bindings: c.env,
    });
    if (session != null) {
      throw new ApiError(httpStatus.BAD_REQUEST, "User already logged in");
    }
  }
  const bodyParse = await c.req.json();
  const body = await userValidation.userAuth.parseAsync(bodyParse);
  const { email, "cf-turnstile-response": cfTurnstileResponse } = body;
  const ip = c.req.header("CF-Connecting-IP");
  const captcha = await validateCaptcha(
    cfTurnstileResponse,
    c.env.TURNSTILE_SECRET,
    ip
  );
  if (!captcha) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid captcha");
  }
  const user = await loginUser(email, c.env.DATABASE_URL);
  const session = await sessionService.CreateSession(
    user.id,
    { Bindings: c.env },
    true
  );
  let cookieData = await sessionService.sessionCookie(1);
  await setSignedCookie(c, "SID", session.id, c.env.HMACsecret, {
    path: "/",
    secure: true,
    httpOnly: true,
    maxAge: cookieData.maxAge,
    expires: cookieData.expires,
    sameSite: "Lax",
  });
  const otp = await sessionService.createOTP(user, c.env.DATABASE_URL);
  let userAgent = c.req.header("user-agent");
  userAgent = formatUserAgent(userAgent);
  await sendOtpEmail(
    user.email,
    {
      Mode: "Login",
      code: otp.code,
      Device: userAgent,
      Date: new Date().toISOString(),
    },
    c.env.AWS_ACCESS_KEY_ID,
    c.env.AWS_SECRET_ACCESS_KEY
  );
  const newcsrfToken = await createCsrfToken(session.id, c.env.HMACsecret);

  setCookie(c, "csrftoken", newcsrfToken, {
    path: "/",
    secure: true,
    sameSite: "Lax",
  });
  return c.json(user, httpStatus.CREATED as StatusCode);
});

authRoute.post("/logout", async (c) => {
  const sessionID = await getSignedCookie(c, c.env.HMACsecret, "SID");
  if (sessionID == null) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User not logged in");
  }
  await sessionService.deleteSession(sessionID.toString(), { Bindings: c.env });
  await setCookie(c, "SID", "", {
    path: "/",
    secure: true,
    httpOnly: true,
    maxAge: 0,
    expires: new Date(0),
    sameSite: "Lax",
  });
  c.status(httpStatus.NO_CONTENT as StatusCode);
  return c.body(null);
});

authRoute.post("/otp", async (c) => {
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
  if (session.values.email_verified) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "User is already verified. OTP cannot be sent again."
    );
  }
  const user = await getUser(session.values.user_id, c.env.DATABASE_URL);
  const otp = await sessionService.createOTP(user, c.env.DATABASE_URL);

  let userAgent = c.req.header("user-agent");
  userAgent = formatUserAgent(userAgent);
  await sendOtpEmail(
    user.email,
    {
      Mode: "Login",
      code: otp.code,
      Device: userAgent,
      Date: new Date().toISOString(),
    },
    c.env.AWS_ACCESS_KEY_ID,
    c.env.AWS_SECRET_ACCESS_KEY
  );

  return c.json(
    "New OTP has been created and sent successfully.",
    httpStatus.CREATED as StatusCode
  );
});
authRoute.post("/verify", async (c) => {
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
  if (session.values.email_verified) {
    throw new ApiError(httpStatus.FORBIDDEN, "User is already verified.");
  }
  const bodyParse = await c.req.json();
  const body = await userValidation.otpAuth.parseAsync(bodyParse);
  const { otp } = body;
  const veified = await sessionService.verifyOTP(
    session.values.user_id,
    otp,
    c.env.DATABASE_URL
  );
  if (!veified) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid OTP");
  }
  const newSession = await sessionService.CreateSession(
    session.values.user_id,
    { Bindings: c.env }
  );
  let cookieData = await sessionService.sessionCookie(10);
  await setSignedCookie(c, "SID", newSession.id, c.env.HMACsecret, {
    path: "/",
    secure: true,
    httpOnly: true,
    maxAge: cookieData.maxAge,
    expires: cookieData.expires,
    sameSite: "Lax",
  });
  await sessionService.deleteSession(sessionID.toString(), {
    Bindings: c.env,
  });

  const newcsrfToken = await createCsrfToken(newSession.id, c.env.HMACsecret);

  setCookie(c, "csrftoken", newcsrfToken, {
    path: "/",
    secure: true,
    sameSite: "Lax",
  });
  c.status(httpStatus.NO_CONTENT as StatusCode);
  return c.body(null);
});
export default authRoute;
