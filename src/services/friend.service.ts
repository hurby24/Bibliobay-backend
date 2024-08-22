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
            and(eq(friends.user_id, users.id), eq(friends.friend_id, users.id)),
            and(eq(friends.friend_id, users.id), eq(friends.user_id, users.id))
          )
        )
        .where(eq(users.username, username))
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

export const getFriendRequests = async (
  user_id: string,
  Env: Environment,
  type = "incoming"
) => {
  const db = drizzle(Env.Bindings.DB);

  if (type !== "incoming" && type !== "sent") {
    type = "incoming";
  }
  try {
    let friendRequests: any;
    if (type === "incoming") {
      friendRequests = await db
        .select({
          request_id: friend_requests.id,
          user_id: users.id,
          username: users.username,
          avatar: users.avatar,
        })
        .from(friend_requests)
        .leftJoin(users, eq(friend_requests.sender_id, users.id))
        .where(eq(friend_requests.receiver_id, user_id));
    }
    if (type === "sent") {
      friendRequests = await db
        .select({
          request_id: friend_requests.id,
          user_id: users.id,
          username: users.username,
          avatar: users.avatar,
        })
        .from(friend_requests)
        .leftJoin(users, eq(friend_requests.receiver_id, users.id))
        .where(eq(friend_requests.sender_id, user_id));
    }

    return friendRequests;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to get friend requests"
    );
  }
};

export const addFriend = async (
  user_id: string,
  friend_id: string,
  Env: Environment
) => {
  if (user_id === friend_id) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Cannot add yourself as friend");
  }
  const db = drizzle(Env.Bindings.DB);

  try {
    const friendRequest = await db
      .select()
      .from(friend_requests)
      .where(
        and(
          eq(friend_requests.sender_id, user_id),
          eq(friend_requests.receiver_id, friend_id)
        )
      );

    if (friendRequest && friendRequest.length > 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Friend request already sent");
    }

    const friend = await db
      .select()
      .from(friends)
      .where(
        or(
          and(eq(friends.user_id, user_id), eq(friends.friend_id, friend_id)),
          and(eq(friends.user_id, friend_id), eq(friends.friend_id, user_id))
        )
      );

    if (friend && friend.length > 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Already friends");
    }
    const alphabet =
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const nanoid = customAlphabet(alphabet, 15);
    const id = nanoid();
    await db.insert(friend_requests).values({
      id: id,
      sender_id: user_id,
      receiver_id: friend_id,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to add friend"
    );
  }
};

export const handleFriendRequest = async (
  user_id: string,
  request_id: string,
  accept: boolean,
  Env: Environment
) => {
  const db = drizzle(Env.Bindings.DB);

  try {
    const friendRequest = await db
      .select()
      .from(friend_requests)
      .where(eq(friend_requests.id, request_id));

    if (!friendRequest || friendRequest.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, "Friend request not found");
    }

    if (friendRequest[0].receiver_id !== user_id) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You are not authorized to handle this request"
      );
    }
    const alphabet =
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const nanoid = customAlphabet(alphabet, 15);
    const id = nanoid();
    if (accept) {
      await db.insert(friends).values({
        id: id,
        user_id: friendRequest[0].sender_id,
        friend_id: friendRequest[0].receiver_id,
      });
    }

    await db
      .delete(friend_requests)
      .where(
        or(
          and(
            eq(friend_requests.sender_id, friendRequest[0].sender_id),
            eq(friend_requests.receiver_id, friendRequest[0].receiver_id)
          ),
          and(
            eq(friend_requests.sender_id, friendRequest[0].receiver_id),
            eq(friend_requests.receiver_id, friendRequest[0].sender_id)
          )
        )
      );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to handle friend request"
    );
  }
};

export const deleteFriendRequest = async (
  user_id: string,
  request_id: string,
  Env: Environment
) => {
  const db = drizzle(Env.Bindings.DB);

  try {
    const friendRequest = await db
      .select()
      .from(friend_requests)
      .where(eq(friend_requests.id, request_id));

    if (!friendRequest || friendRequest.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, "Friend request not found");
    }

    if (friendRequest[0].sender_id !== user_id) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You are not authorized to delete this request"
      );
    }

    await db
      .delete(friend_requests)
      .where(eq(friend_requests.id, friendRequest[0].id));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to delete friend request"
    );
  }
};
