import authRoute from "./auth.route";
import userRoute from "./users.route";
import settingRoute from "./settings.route";
import bookRoute from "./books.route";
import shelfRoute from "./shelves.route";
import goalRoute from "./goals.route";
import friendRoute from "./friends.route";

const base_path = "v0";

export const defaultRoutes = [
  {
    path: `/${base_path}/auth`,
    route: authRoute,
  },
  {
    path: `/${base_path}/users`,
    route: userRoute,
  },
  {
    path: `/${base_path}/settings`,
    route: settingRoute,
  },
  {
    path: `/${base_path}/books`,
    route: bookRoute,
  },
  {
    path: `/${base_path}/shelves`,
    route: shelfRoute,
  },
  {
    path: `/${base_path}/goals`,
    route: goalRoute,
  },
  {
    path: `/${base_path}`,
    route: friendRoute,
  },
];
