import { Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { Environment } from "../../bindings";
import httpStatus from "http-status";
import { getSignedCookie } from "hono/cookie";
import * as sessionService from "../services/session.service";
import { ApiError } from "../utils/ApiError";
import { getUser, updateUser } from "../services/user.service";
import { userUpdate, allowedImageTypes } from "../validations/user.validation";
import { bodyLimit } from "hono/body-limit";
import { sha256 } from "hono/utils/crypto";

const settingRoute = new Hono<Environment>();

export default settingRoute;

settingRoute.get("/", async (c) => {
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
  const user = await getUser(session.values.user_id, c.env.DATABASE_URL);

  return c.json(user, httpStatus.OK as StatusCode);
});

settingRoute.put("/", async (c) => {
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
  const body = await userUpdate.parseAsync(bodyParse);

  const user = await updateUser(
    session.values.user_id,
    body,
    c.env.DATABASE_URL
  );

  return c.json(user, httpStatus.OK as StatusCode);
});

settingRoute.put(
  "/avatar",
  bodyLimit({
    maxSize: 1024 * 1024,
    onError: (c) => {
      return c.text("File size exceeds the limit of 1MB", 413);
    },
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

    const body = await c.req.parseBody();
    const file = body["file"] as File;
    let width = body["width"] ? parseInt(body["width"].toString()) : 0;
    let height = body["height"] ? parseInt(body["height"].toString()) : 0;

    if (!file) {
      return c.text("No file uploaded", 400);
    }
    if (!allowedImageTypes.includes(file.type)) {
      return c.text("Unsupported file type", 415);
    }
    if (width !== 300 || height !== 300) {
      return c.text("Image dimensions must be 300x300 pixels", 400);
    }
    const content = await file.arrayBuffer();

    const buffer = new Uint8Array(content);
    const hash = await sha256(buffer);
    const extension = file.type.split("/")[1];
    const key = `${hash}.${extension}`;

    await c.env.IMAGES.put(key, buffer, {
      httpMetadata: { contentType: file.type },
    });

    let url = `https://images.bibliobay.net/${key}`;
    const updatebody = { avatar: url };
    const user = await updateUser(
      session.values.user_id,
      updatebody,
      c.env.DATABASE_URL
    );

    return c.json(user, httpStatus.OK as StatusCode);
  }
);

settingRoute.put(
  "/banner",
  bodyLimit({
    maxSize: 1024 * 1024,
    onError: (c) => {
      return c.text("File size exceeds the limit of 1MB", 413);
    },
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

    const body = await c.req.parseBody();
    const file = body["file"] as File;
    let width = body["width"] ? parseInt(body["width"].toString()) : 0;
    let height = body["height"] ? parseInt(body["height"].toString()) : 0;

    if (!file) {
      return c.text("No file uploaded", 400);
    }
    if (!allowedImageTypes.includes(file.type)) {
      return c.text("Unsupported file type", 415);
    }
    if (width !== 700 || height !== 400) {
      return c.text("Image dimensions must be 700x400 pixels", 400);
    }
    const content = await file.arrayBuffer();

    const buffer = new Uint8Array(content);
    const hash = await sha256(buffer);
    const extension = file.type.split("/")[1];
    const key = `${hash}.${extension}`;

    await c.env.IMAGES.put(key, buffer, {
      httpMetadata: { contentType: file.type },
    });

    let url = `https://images.bibliobay.net/${key}`;
    const updatebody = { banner: url };
    const user = await updateUser(
      session.values.user_id,
      updatebody,
      c.env.DATABASE_URL
    );

    return c.json(user, httpStatus.OK as StatusCode);
  }
);

settingRoute.delete("/avatar", async (c) => {
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
  const user = await getUser(session.values.user_id, c.env.DATABASE_URL);
  if (
    user.avatar ==
    "https://ui-avatars.com/api/?name=${user.username}&size=300&bold=true&background=random"
  ) {
    return c.json(user, httpStatus.OK as StatusCode);
  }
  const updatebody = {
    avatar:
      "https://ui-avatars.com/api/?name=${user.username}&size=300&bold=true&background=random",
  };
  const deleteUrl: string = user.avatar.split("/").pop() as string;
  await c.env.IMAGES.delete(deleteUrl);
  const updatedUser = await updateUser(
    session.values.user_id,
    updatebody,
    c.env.DATABASE_URL
  );
  return c.json(updatedUser, httpStatus.OK as StatusCode);
});

settingRoute.delete("/banner", async (c) => {
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
  const user = await getUser(session.values.user_id, c.env.DATABASE_URL);
  if (!user.banner) {
    return c.json(user, httpStatus.OK as StatusCode);
  }
  const updatebody = {
    banner: null,
  };
  if (!user.banner) {
    return c.json(user, httpStatus.OK as StatusCode);
  }
  const deleteUrl: string = user.banner.split("/").pop() as string;
  await c.env.IMAGES.delete(deleteUrl);
  const updatedUser = await updateUser(
    session.values.user_id,
    updatebody,
    c.env.DATABASE_URL
  );
  return c.json(updatedUser, httpStatus.OK as StatusCode);
});
