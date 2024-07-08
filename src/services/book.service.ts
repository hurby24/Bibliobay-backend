import { createDatabaseConnection } from "../db/connection";
import { books, users, genres, book_genres } from "../db/schema";
import { eq, and, like } from "drizzle-orm";
import { nanoid, customAlphabet } from "nanoid";
import httpStatus from "http-status";
import { ApiError } from "../utils/ApiError";
import { toUrlSafeString } from "../utils/utils";

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
      let genre = await trx
        .select({
          id: genres.id,
          name: genres.name,
        })
        .from(genres)
        .innerJoin(
          book_genres,
          and(
            eq(genres.id, book_genres.genre_id),
            eq(book_genres.book_id, bookId)
          )
        );
      let user = {
        id: book[0].users.id,
        username: book[0].users.username,
        avatar: book[0].users.avatar,
      };
      return { book: book[0].books, genrse: genre, user: user };
    });
    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to get book");
  }
};

export const createBook = async (
  book: any,
  user_id: string,
  databaseConfig: string
) => {
  let result: any;
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const nanoid = customAlphabet(alphabet, 15);
  const id = nanoid();
  const bookTitle = toUrlSafeString(book.title);
  let bookBody = {
    id: id,
    slug: `${bookTitle}-${id}`,
    user_id: user_id,
  };
  try {
    const genreIds = book.genres || [];
    if (book.pages < book.current_page) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Current page cannot be greater than total pages"
      );
    }
    if (book.pages == book.current_page) {
      book.finished = true;
      if (!book.rating) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Rating is required");
      }
      book.rating = Math.round(book.rating * 10) / 10;
    } else {
      book.finished = false;
      book.rating = null;
    }
    const bookComplete = { ...bookBody, ...book };
    const db = await createDatabaseConnection(databaseConfig);
    await db.transaction(async (trx: any) => {
      result = await trx.insert(books).values(bookComplete).returning();

      if (genreIds.length > 0) {
        const insertPromises = genreIds.map(async (genreId: number) => {
          await trx
            .insert(book_genres)
            .values({ book_id: result[0].id, genre_id: genreId })
            .returning();
        });

        await Promise.all(insertPromises);
      }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create book"
    );
  }
  return result[0];
};
