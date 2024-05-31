import { Hono } from "hono";
import { Environment } from "../bindings";
import httpStatus from "http-status";
import { ApiError } from "./utils/ApiError";
import { errorHandler } from "./middlewares/error";
import crsftoken from "./middlewares/csrfToken";
import rateLimit from "./middlewares/ratelimit";
import { defaultRoutes } from "./routes";

const app = new Hono<Environment>();

app.notFound(() => {
  throw new ApiError(httpStatus.NOT_FOUND, "Not found");
});
app.onError(errorHandler);

app.use(crsftoken);
app.on("GET", "*", async (c, next) => {
  return rateLimit(c, next);
});
app.get("/", (c) => {
  return c.text("Hello Hono!");
});

defaultRoutes.forEach((route) => {
  app.route(`${route.path}`, route.route);
});
export default app;
