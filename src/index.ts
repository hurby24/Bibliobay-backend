import { Hono } from "hono";
import { Environment } from "../bindings";
import httpStatus from "http-status";
import { ApiError } from "./utils/ApiError";
import { errorHandler } from "./middlewares/error";
import crsftoken from "./middlewares/csrfToken";
import rateLimit from "./middlewares/ratelimit";
import { cors } from "hono/cors";
import { etag } from "hono/etag";
import { prettyJSON } from "hono/pretty-json";
import { defaultRoutes } from "./routes";

const app = new Hono<Environment>();

app.notFound(() => {
  throw new ApiError(httpStatus.NOT_FOUND, "Not found");
});
app.onError(errorHandler);

app.use(crsftoken);
app.use(rateLimit);
app.use(
  "/v0/*",
  cors({
    origin: "https://bibliobay.net",
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
  })
);
app.get("*", etag());
app.use(prettyJSON());

app.get("/", (c) => {
  return c.text("shit works");
});

defaultRoutes.forEach((route) => {
  app.route(`${route.path}`, route.route);
});
export default app;
