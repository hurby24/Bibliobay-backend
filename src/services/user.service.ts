import { drizzle } from "drizzle-orm/d1";
import { Environment } from "../../bindings";
import { books, users, shelves } from "../db/schema";
import {
  SQLiteSelectQueryBuilder,
  QueryBuilder,
} from "drizzle-orm/sqlite-core";
import { eq, and, like, count, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import httpStatus from "http-status";
import { ApiError } from "../utils/ApiError";
import { spaceSlug, verb, digits, noun } from "space-slug";
import { withPagination } from "../utils/utils";

export const CreateUser = async (email: string, Env: Environment) => {
  let result;
  const db = drizzle(Env.Bindings.DB);
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
    avatar: `https://ui-avatars.com/api/?name=${username}&size=300&bold=true&background=random`,
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

export const getUserProfile = async (
  id: string,
  Env: Environment,
  username: string = ""
) => {
  const db = drizzle(Env.Bindings.DB);

  try {
    let user: any;
    if (username !== "") {
      user = await db.select().from(users).where(eq(users.username, username));
    } else {
      user = await db.select().from(users).where(eq(users.id, id));
    }

    if (!user || user.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    user = user[0];
    const isCurrentUser = user.id === id;

    let counts = await db.batch([
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
    ]);

    let bookCount = counts[0];
    let bookThisYear = counts[1];
    let shelfCount = counts[2];

    if (!isCurrentUser && user.private) {
      return {
        user: {
          id: user.id,
          username: user.username,
          bio: user.bio,
          avatar: user.avatar,
          banner: user.banner,
          bookCount: bookCount[0].count,
          bookThisYear: bookThisYear[0].count,
          shelfCount: shelfCount[0].count,
          private: user.isPrivate,
          created_at: user.createdAt,
        },
        books: {
          favorites: [],
          reading: [],
          read: [],
        },
        shelves: [],
      };
    }

    const qb = new QueryBuilder();
    let userBooks = qb
      .select()
      .from(books)
      .where(eq(books.user_id, user.id))
      .$dynamic();

    let userShelves = await db
      .select()
      .from(shelves)
      .where(eq(shelves.user_id, user.id));

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

    if (!isCurrentUser && !user.isPrivate) {
      ByStatus(userBooks, "reading", false);
      let reading = (await db.run(userBooks)).results.map(convertToBoolean);
      ByStatus(userBooks, "read", false);
      let read = (await db.run(userBooks)).results.map(convertToBoolean);
      ByStatus(userBooks, "favorites", false);
      let favorite = (await db.run(userBooks)).results.map(convertToBoolean);

      userShelves = userShelves.filter((shelf: any) => !shelf.private);
      return {
        user: {
          id: user.id,
          username: user.username,
          bio: user.bio,
          avatar: user.avatar,
          banner: user.banner,
          bookCount: bookCount[0].count,
          bookThisYear: bookThisYear[0].count,
          shelfCount: shelfCount[0].count,
          private: user.isPrivate,
          created_at: user.createdAt,
        },
        books: {
          favorites: favorite,
          reading: reading,
          read: read,
        },
        shelves: userShelves,
      };
    }
    if (isCurrentUser) {
      ByStatus(userBooks, "reading", true);
      let reading = (await db.run(userBooks)).results.map(convertToBoolean);
      ByStatus(userBooks, "read", true);
      let read = (await db.run(userBooks)).results.map(convertToBoolean);
      ByStatus(userBooks, "favorites", true);
      let favorite = (await db.run(userBooks)).results.map(convertToBoolean);
      user = {
        ...user,
        bookCount: bookCount[0].count,
        bookThisYear: bookThisYear[0].count,
        shelfCount: shelfCount[0].count,
      };
      return {
        user: user,
        books: {
          favorites: favorite,
          reading: reading,
          read: read,
        },
        shelves: userShelves,
      };
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to get user");
  }
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
