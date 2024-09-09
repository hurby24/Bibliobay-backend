import { Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { Environment } from "../../bindings";
import httpStatus from "http-status";
import {
  Google,
  generateState,
  generateCodeVerifier,
  OAuth2RequestError,
} from "arctic";
import * as userValidation from "../validations/user.validation";
import * as userServices from "../services/user.service";
import * as sessionService from "../services/session.service";
import { ApiError } from "../utils/ApiError";
import {
  setSignedCookie,
  getSignedCookie,
  setCookie,
  getCookie,
} from "hono/cookie";
import { createCsrfToken } from "../utils/csrftoken";
import { sendOtpEmail } from "../services/email.service";
import { formatUserAgent, validateCaptcha } from "../utils/utils";
import { cache } from "hono/cache";

const authRoute = new Hono<Environment>();

authRoute.all(
  "*",
  cache({
    cacheName: "bibliobay-auth",
    cacheControl: "no-store",
  })
);

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
  const user = await userServices.CreateUser(email, { Bindings: c.env });
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
  const otp = await sessionService.createOTP(user, { Bindings: c.env });
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
  c.status(httpStatus.NO_CONTENT as StatusCode);
  return c.body(null);
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
  const user = await userServices.loginUser(email, { Bindings: c.env });
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
  const otp = await sessionService.createOTP(user, { Bindings: c.env });
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
  c.status(httpStatus.NO_CONTENT as StatusCode);
  return c.body(null);
});

authRoute.post("/logout", async (c) => {
  const sessionID = await getSignedCookie(c, c.env.HMACsecret, "SID");
  if (sessionID == null) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
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
  const user = await userServices.getUser(session.values.user_id, {
    Bindings: c.env,
  });
  const otp = await sessionService.createOTP(user, { Bindings: c.env });

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

  c.status(httpStatus.NO_CONTENT as StatusCode);
  return c.body(null);
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
  const verified = await sessionService.verifyOTP(session.values.user_id, otp, {
    Bindings: c.env,
  });
  if (!verified.success) {
    if (
      verified.message ===
      "Verification attempts exceeded. Please request a new code."
    ) {
      throw new ApiError(httpStatus.TOO_MANY_REQUESTS, verified.message);
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, verified.message);
    }
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

authRoute.get("/google", async (c) => {
  const sessionID = await getSignedCookie(c, c.env.HMACsecret, "SID");
  if (sessionID != null) {
    const session = await sessionService.validSession(sessionID.toString(), {
      Bindings: c.env,
    });
    if (session != null) {
      throw new ApiError(httpStatus.BAD_REQUEST, "User already logged in");
    }
  }
  const google = new Google(
    c.env.GOOGLE_CLIENT_ID,
    c.env.GOOGLE_CLIENT_SECRET,
    "https://bibliobay.net/auth/google"
  );

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = await google.createAuthorizationURL(state, codeVerifier, {
    scopes: ["profile", "email"],
  });

  setCookie(c, "state", state, {
    path: "/",
    secure: true,
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "Lax",
  });
  setCookie(c, "codeVerifier", codeVerifier, {
    path: "/",
    secure: true,
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "Lax",
  });

  return c.json({ url: url }, httpStatus.OK as StatusCode);
});

authRoute.get("/google/callback", async (c) => {
  const sessionID = await getSignedCookie(c, c.env.HMACsecret, "SID");
  if (sessionID != null) {
    const session = await sessionService.validSession(sessionID.toString(), {
      Bindings: c.env,
    });
    if (session != null) {
      throw new ApiError(httpStatus.BAD_REQUEST, "User already logged in");
    }
  }
  const { code, state } = c.req.query();
  const savedState = getCookie(c, "state");
  const codeVerifier = getCookie(c, "codeVerifier");

  if (!code || !state || !savedState || !codeVerifier || state !== savedState) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid request");
  }

  const google = new Google(
    c.env.GOOGLE_CLIENT_ID,
    c.env.GOOGLE_CLIENT_SECRET,
    "https://bibliobay.net/auth/google"
  );
  try {
    const { accessToken } = await google.validateAuthorizationCode(
      code,
      codeVerifier
    );
    console.log(accessToken);
    const googleResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const googleData = (await googleResponse.json()) as {
      id: string;
      email: string;
      picture: string;
    };
    const data = {
      provider: "google",
      provider_id: googleData.id,
      email: googleData.email,
      avatar: googleData.picture,
    };

    const user = await userServices.oauthLink(data, { Bindings: c.env });

    const newSession = await sessionService.CreateSession(user, {
      Bindings: c.env,
    });
    let cookieData = await sessionService.sessionCookie(10);
    await setSignedCookie(c, "SID", newSession.id, c.env.HMACsecret, {
      path: "/",
      secure: true,
      httpOnly: true,
      maxAge: cookieData.maxAge,
      expires: cookieData.expires,
      sameSite: "Lax",
    });

    const newcsrfToken = await createCsrfToken(newSession.id, c.env.HMACsecret);

    setCookie(c, "csrftoken", newcsrfToken, {
      path: "/",
      secure: true,
      sameSite: "Lax",
    });

    c.status(httpStatus.NO_CONTENT as StatusCode);
    return c.body(null);
  } catch (error) {
    if (error instanceof OAuth2RequestError) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid request");
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Internal server error"
    );
  }
});

export default authRoute;
