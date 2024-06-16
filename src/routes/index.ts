import authRoute from "./auth.route";
import userRoute from "./users.route";

const base_path = "v0";

export const defaultRoutes = [
  {
    path: `/${base_path}/auth`,
    route: authRoute,
  },
  {
    path: `/${base_path}`,
    route: userRoute,
  },
];
