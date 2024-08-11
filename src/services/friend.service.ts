import { drizzle } from "drizzle-orm/d1";
import { Environment } from "../../bindings";
import { users, friends, friend_requests } from "../db/schema";
import { QueryBuilder } from "drizzle-orm/sqlite-core";
import { eq, and, ne, or } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import httpStatus from "http-status";
import { ApiError } from "../utils/ApiError";
import { withPagination } from "../utils/utils";

export const getFriends = async (
  user_id: string,
  Env: Environment,
  page: string = "1",
  limit: string = "10",
  username: string = ""
) => {
  const db = drizzle(Env.Bindings.DB);

  try {
    let friendsList: any;
    console.log("username", user_id);
    const qb = new QueryBuilder();
    if (username !== "") {
      friendsList = qb
        .select({
          id: users.id,
          username: users.username,
          avatar: users.avatar,
        })
        .from(friends)
        .innerJoin(
          users,
          or(
            and(eq(friends.user_id, users.id), eq(users.username, username)),
            and(eq(friends.friend_id, users.id), eq(users.username, username))
          )
        )
        .where(ne(users.username, username))
        .$dynamic();
    } else {
      friendsList = qb
        .select({
          id: users.id,
          username: users.username,
          avatar: users.avatar,
        })
        .from(friends)
        .innerJoin(
          users,
          or(
            and(eq(friends.user_id, user_id), eq(friends.friend_id, users.id)),
            and(eq(friends.friend_id, user_id), eq(friends.user_id, users.id))
          )
        )
        .where(ne(users.id, user_id))
        .$dynamic();
    }
    withPagination(friendsList, 25, page, limit);
    const result = (await db.run(friendsList)).results;
    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to get friends"
    );
  }
};

export const removeFriend = async (
  user_id: string,
  friend_id: string,
  Env: Environment
) => {
  const db = drizzle(Env.Bindings.DB);

  try {
    const result = await db
      .delete(friends)
      .where(
        or(
          and(eq(friends.user_id, user_id), eq(friends.friend_id, friend_id)),
          and(eq(friends.user_id, friend_id), eq(friends.friend_id, user_id))
        )
      );

    if (result.meta.changes === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, "Friend not found");
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to remove friend"
    );
  }
};
