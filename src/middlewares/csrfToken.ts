//if request has SID cookie make cookie based on that, if already has SID and csrfToken validate based on SID.
//after await createnew crsftoken and set it to cookie
import { createMiddleware } from "hono/factory";
import { Environment } from "../../bindings";
import { ApiError } from "../utils/ApiError";
import { setCookie, getSignedCookie } from "hono/cookie";
import httpStatus from "http-status";
import { createCsrfToken, validateCsrfToken } from "../utils/csrftoken";

const crsftoken = createMiddleware<Environment>(async (c, next) => {
  const sessionID = await getSignedCookie(c, c.env.HMACsecret, "SID");
  const csrfToken = c.req.header("X-CSRF-Token");
  if (sessionID != null) {
    if (csrfToken == null) {
      const newcsrfToken = await createCsrfToken(
        sessionID.toString(),
        c.env.HMACsecret
      );

      setCookie(c, "csrftoken", newcsrfToken, {
        path: "/",
        secure: true,
        sameSite: "Lax",
      });
      throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
    }
    let validToken = await validateCsrfToken(
      sessionID.toString(),
      csrfToken,
      c.env.HMACsecret
    );
    if (!validToken) {
      const newcsrfToken = await createCsrfToken(
        sessionID.toString(),
        c.env.HMACsecret
      );

      setCookie(c, "csrftoken", newcsrfToken, {
        path: "/",
        secure: true,
        sameSite: "Lax",
      });
      throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
    }
  }
  await next();
});

export default crsftoken;
