import { drizzle } from "drizzle-orm/d1";
import { Environment } from "../../bindings";
import { books, users, shelves, oauth_accounts, friends } from "../db/schema";
import {
  SQLiteSelectQueryBuilder,
  QueryBuilder,
} from "drizzle-orm/sqlite-core";
import { eq, and, like, count, sql, or } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import httpStatus from "http-status";
import { ApiError } from "../utils/ApiError";
import { spaceSlug, verb, digits, noun } from "space-slug";
import { withPagination } from "../utils/utils";

export const CreateUser = async (
  email: string,
  Env: Environment,
  profile: string = "",
  confirmed = false
) => {
  let result;
  const db = drizzle(Env.Bindings.DB);
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const nanoid = customAlphabet(alphabet, 15);
  const id = nanoid();
  const username = spaceSlug([verb(1), noun(1), digits(5)], {
    separator: "-",
    cleanString(word) {
      word = word.toLowerCase();
      if (word.length > 25) {
        word = word.slice(0, 25);
      }
      return word;
    },
  });
  const user = {
    id: id,
    username: username,
    email: email,
    bio: "",
    avatar: !profile
      ? `https://ui-avatars.com/api/?name=${username}&size=300&bold=true&background=random`
      : profile,
    email_confirmed_at: confirmed ? new Date().toISOString() : null,
  };
  try {
    result = await db.insert(users).values(user).returning();
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User already exists");
  }
  return result[0];
};

export const loginUser = async (email: string, Env: Environment) => {
  let result;
  const db = drizzle(Env.Bindings.DB);

  try {
    result = await db
      .update(users)
      .set({ last_sign_in_at: new Date().toISOString() })
      .where(eq(users.email, email))
      .returning();
  } catch (error) {
    console.log(error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to login");
  }
  if (result.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User does not exist");
  }
  return result[0];
};

export const oauthLink = async (oauthData: any, Env: Environment) => {
  let result;
  const db = drizzle(Env.Bindings.DB);

  try {
    const existingAccount = await db
      .select()
      .from(oauth_accounts)
      .where(
        and(
          eq(oauth_accounts.provider_id, oauthData.provider),
          eq(oauth_accounts.provider_user_id, oauthData.provider_id)
        )
      );

    if (existingAccount.length > 0) {
      return existingAccount[0].user_id;
    }
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, oauthData.email));

    if (existingUser.length > 0) {
      await db.insert(oauth_accounts).values({
        user_id: existingUser[0].id,
        provider_id: oauthData.provider,
        provider_user_id: oauthData.provider_id,
      });

      return existingUser[0].id;
    }

    const newUser = await CreateUser(
      oauthData.email,
      Env,
      oauthData.avatar,
      true
    );
    await db.insert(oauth_accounts).values({
      user_id: newUser.id,
      provider_id: oauthData.provider,
      provider_user_id: oauthData.provider_id,
    });
    return newUser.id;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to link oauth"
    );
  }
};

export const getUser = async (id: string, Env: Environment) => {
  let result;
  const db = drizzle(Env.Bindings.DB);
  try {
    result = await db.select().from(users).where(eq(users.id, id));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to get user");
  }

  return result[0];
};

export const updateUser = async (
  id: string,
  userData: any,
  Env: Environment
) => {
  let result;
  const db = drizzle(Env.Bindings.DB);
  if (Object.keys(userData).length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User data is empty");
  }
  userData.updated_at = new Date().toISOString();
  try {
    result = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to update user"
    );
  }
  return result[0];
};

export const searchUsers = async (
  username: string,
  page: string = "1",
  limit: string = "10",
  Env: Environment
) => {
  let result;
  let sanitizedUsername = username.trim().toLocaleLowerCase();
  const db = drizzle(Env.Bindings.DB);
  const qb = new QueryBuilder();
  let query = qb
    .select({
      id: users.id,
      username: users.username,
      bio: users.bio,
      avatar: users.avatar,
      banner: users.banner,
      private: users.private,
    })
    .from(users)
    .where(
      and(
        like(users.username, `%${sanitizedUsername}%`),
        eq(users.private, false)
      )
    )
    .orderBy(users.username)
    .limit(10)
    .offset(0)
    .$dynamic();
  withPagination(query, 10, page, limit);
  result = (await db.run(query)).results;
  return result;
};

export const getUserProfile = async (
  user_id: string,
  Env: Environment,
  username: string = ""
) => {
  const db = drizzle(Env.Bindings.DB);

  try {
    let userQuery;
    if (username !== "") {
      userQuery = db.select().from(users).where(eq(users.username, username));
    } else {
      userQuery = db.select().from(users).where(eq(users.id, user_id));
    }
    const user = (await userQuery)[0];

    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    let isCurrentUser = false;
    if (user_id) {
      isCurrentUser = user.id === user_id;
    }

    let isFriend = false;
    if (!isCurrentUser && user_id) {
      const friend = await db
        .select()
        .from(friends)
        .where(
          or(
            and(eq(friends.user_id, user_id), eq(friends.friend_id, user.id)),
            and(eq(friends.user_id, user.id), eq(friends.friend_id, user_id))
          )
        );
      isFriend = friend.length > 0;
    }

    const [bookCount, bookThisYear, shelfCount, friendCount] = await db.batch([
      db
        .select({ count: count() })
        .from(books)
        .where(eq(books.user_id, user.id)),
      db
        .select({ count: count() })
        .from(books)
        .where(
          and(
            eq(books.user_id, user.id),
            eq(
              sql`strftime('%Y', ${books.created_at})`,
              new Date().getFullYear().toString()
            )
          )
        ),
      db
        .select({ count: count() })
        .from(shelves)
        .where(eq(shelves.user_id, user.id)),
      db
        .select({ count: count() })
        .from(friends)
        .where(
          or(eq(friends.user_id, user.id), eq(friends.friend_id, user.id))
        ),
    ]);

    const userData = {
      id: user.id,
      username: user.username,
      bio: user.bio,
      avatar: user.avatar,
      banner: user.banner,
      book_count: bookCount[0].count,
      book_this_year: bookThisYear[0].count,
      shelf_count: shelfCount[0].count,
      friend_count: friendCount[0].count,
      private: user.private,
      supporter: user.supporter,
      created_at: user.created_at,
      friend: isFriend,
    };
    if (!isCurrentUser && !isFriend && user.private) {
      return {
        user: userData,
        books: { favorites: [], reading: [], read: [] },
        shelves: [],
      };
    }

    const qb = new QueryBuilder();
    const userBooks = qb
      .select()
      .from(books)
      .where(eq(books.user_id, user.id))
      .$dynamic();
    const userShelves = qb
      .select()
      .from(shelves)
      .where(eq(shelves.user_id, user.id))
      .$dynamic();

    function ByStatus<T extends SQLiteSelectQueryBuilder>(
      qb: T,
      status: string,
      privateBooks: boolean = false
    ) {
      if (status === "favorites") {
        if (privateBooks) {
          return qb.where(eq(books.favorite, true)).limit(5);
        } else {
          return qb
            .where(and(eq(books.favorite, true), eq(books.private, false)))
            .limit(5);
        }
      }
      if (status === "reading") {
        if (privateBooks) {
          return qb.where(eq(books.finished, false)).limit(5);
        } else {
          return qb
            .where(and(eq(books.finished, false), eq(books.private, false)))
            .limit(5);
        }
      }
      if (status === "read") {
        if (privateBooks) {
          return qb.where(eq(books.finished, true)).limit(5);
        } else {
          return qb
            .where(and(eq(books.finished, true), eq(books.private, false)))
            .limit(5);
        }
      }
    }

    const convertToBoolean = (book: any) => ({
      ...book,
      favorite: book.favorite === 1,
      finished: book.finished === 1,
      private: book.private === 1,
    });

    ByStatus(userBooks, "reading", isCurrentUser);
    let reading = (await db.run(userBooks)).results.map(convertToBoolean);
    ByStatus(userBooks, "read", isCurrentUser);
    let read = (await db.run(userBooks)).results.map(convertToBoolean);
    ByStatus(userBooks, "favorites", isCurrentUser);
    let favorite = (await db.run(userBooks)).results.map(convertToBoolean);

    if (!isCurrentUser && !isFriend) {
      userShelves.where(eq(shelves.private, false));
    }
    let filteredShelves = (await db.run(userShelves)).results.map(
      (shelf: any) => ({
        ...shelf,
        private: shelf.private === 1,
      })
    );

    return {
      user: userData,
      books: {
        favorites: favorite,
        reading: reading,
        read: read,
      },
      shelves: filteredShelves,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to get user");
  }
};
