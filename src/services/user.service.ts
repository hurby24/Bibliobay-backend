import { createDatabaseConnection } from "../db/connection";
import { books, users, shelves, book_genres, genres } from "../db/schema";
import {
  PgSelectQueryBuilder,
  QueryBuilder,
  PgSelectQueryBuilderBase,
} from "drizzle-orm/pg-core";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import httpStatus from "http-status";
import { ApiError } from "../utils/ApiError";
import { spaceSlug, verb, digits, noun } from "space-slug";

export const CreateUser = async (email: string, databaseConfig: string) => {
  let result;
  const db = await createDatabaseConnection(databaseConfig);
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

export const loginUser = async (email: string, databaseConfig: string) => {
  let result;
  const db = await createDatabaseConnection(databaseConfig);
  try {
    result = await db
      .update(users)
      .set({ last_sign_in_at: new Date() })
      .where(eq(users.email, email))
      .returning();
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to login");
  }
  if (result.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User does not exist");
  }
  return result[0];
};

export const getUser = async (id: string, databaseConfig: string) => {
  let result;
  const db = await createDatabaseConnection(databaseConfig);
  try {
    result = await db.select().from(users).where(eq(users.id, id));
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to get user");
  }

  return result[0];
};

export const getUserProfile = async (
  id: string,
  databaseConfig: string,
  username: string = ""
) => {
  const db = await createDatabaseConnection(databaseConfig);
  try {
    const result = await db.transaction(async (trx) => {
      let user: any;
      if (username !== "") {
        user = await trx
          .select()
          .from(users)
          .where(eq(users.username, username));
      } else {
        user = await trx.select().from(users).where(eq(users.id, id));
      }

      if (!user || user.length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
      }

      user = user[0];
      const isCurrentUser = user.id === id;

      if (!isCurrentUser && user.private) {
        return {
          user: {
            id: user.id,
            username: user.username,
            bio: user.bio,
            avatar: user.avatar,
            banner: user.banner,
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

      let userShelves = await trx
        .select()
        .from(shelves)
        .where(eq(shelves.user_id, user.id));

      function ByStatus<T extends PgSelectQueryBuilder>(
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

      if (!isCurrentUser && !user.isPrivate) {
        ByStatus(userBooks, "reading", false);
        let reading = (await trx.execute(userBooks)).rows;
        ByStatus(userBooks, "read", false);
        let read = (await trx.execute(userBooks)).rows;
        ByStatus(userBooks, "favorites", false);
        let favorite = (await trx.execute(userBooks)).rows;

        userShelves = userShelves.filter((shelf: any) => !shelf.isPrivate);
        return {
          user: {
            id: user.id,
            username: user.username,
            bio: user.bio,
            avatar: user.avatar,
            banner: user.banner,
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
        let reading = (await trx.execute(userBooks)).rows;
        ByStatus(userBooks, "read", true);
        let read = (await trx.execute(userBooks)).rows;
        ByStatus(userBooks, "favorites", true);
        let favorite = (await trx.execute(userBooks)).rows;
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
    });

    return result;
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.statusCode === httpStatus.NOT_FOUND
    ) {
      throw error;
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to get user");
  }
};
