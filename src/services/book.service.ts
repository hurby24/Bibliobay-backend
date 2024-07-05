import { createDatabaseConnection } from "../db/connection";
import { books, users } from "../db/schema";
import { eq, and, like } from "drizzle-orm";

import { nanoid } from "nanoid";
import httpStatus from "http-status";
import { ApiError } from "../utils/ApiError";

export const getBook = async (
  bookId: string,
  databaseConfig: string,
  user_id: string = ""
) => {
  let result;
  const db = await createDatabaseConnection(databaseConfig);
  try {
    result = await db.transaction(async (trx) => {
      let book: any;
      book = await trx
        .select()
        .from(books)
        .where(eq(books.id, bookId))
        .innerJoin(users, eq(books.user_id, users.id));

      if (!book || book.length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, "Book not found");
      }
      if (book[0].books.user_id != user_id && book[0].books.private) {
        throw new ApiError(httpStatus.NOT_FOUND, "Book not found");
      }

      let user = {
        id: book[0].users.id,
        username: book[0].users.username,
        avatar: book[0].users.avatar,
      };
      return { book: book[0].books, user: user };
    });
    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to get book");
  }
};
