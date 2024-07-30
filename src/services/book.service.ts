import { createDatabaseConnection } from "../db/connection";
import { books, users, genres, book_genres } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { customAlphabet } from "nanoid";
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

export const deleteBook = async (
  bookId: string,
  user_id: string,
  databaseConfig: string,
  images: R2Bucket
) => {
  const db = await createDatabaseConnection(databaseConfig);
  try {
    await db.transaction(async (trx) => {
      let book = await trx.select().from(books).where(eq(books.id, bookId));
      if (!book || book.length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, "Book not found");
      }
      if (book[0].user_id != user_id) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
      }
      await trx.delete(books).where(eq(books.id, bookId));
      const deleteUrl: string = book[0].cover_url.split("/").pop() as string;

      await images.delete(deleteUrl);
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to delete book"
    );
  }
};

export const updateBook = async (
  user_id: string,
  bookId: string,
  bookData: any,
  databaseConfig: string,
  images: R2Bucket
) => {
  let result: any;
  if (Object.keys(bookData).length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Book data is empty");
  }

  const db = await createDatabaseConnection(databaseConfig);

  try {
    await db.transaction(async (trx) => {
      const [book] = await trx.select().from(books).where(eq(books.id, bookId));

      if (!book) {
        throw new ApiError(httpStatus.NOT_FOUND, "Book not found");
      }

      if (book.user_id !== user_id) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
      }

      const update: any = {
        title: bookData.title || book.title,
        pages: bookData.pages || book.pages,
        current_page: bookData.current_page || book.current_page,
        author: bookData.author || book.author,
        cover_url: bookData.cover_url || book.cover_url,
        private:
          bookData.private !== undefined ? bookData.private : book.private,
        favorite:
          bookData.favorite !== undefined ? bookData.favorite : book.favorite,
        update_at: new Date(),
      };

      if (bookData.title) {
        update.slug = `${toUrlSafeString(bookData.title)}-${bookId}`;
      }

      if (update.current_page > update.pages) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "Current page cannot be greater than total pages"
        );
      }

      if (update.current_page === update.pages) {
        update.finished = true;
        update.rating =
          bookData.rating !== undefined
            ? Math.round(bookData.rating * 10) / 10
            : book.rating || null;

        if (update.rating === null) {
          throw new ApiError(httpStatus.BAD_REQUEST, "Rating is required");
        }
      } else {
        update.finished = false;
        update.rating = null;
      }
      if (bookData.cover_url) {
        const deleteUrl: string = book.cover_url.split("/").pop() as string;
        await images.delete(deleteUrl);
      }
      let genresList = await trx
        .select({
          id: genres.id,
        })
        .from(genres)
        .innerJoin(
          book_genres,
          and(
            eq(genres.id, book_genres.genre_id),
            eq(book_genres.book_id, bookId)
          )
        );
      const genreIds = genresList.map((genre: { id: number }) => genre.id);
      const newGenreIds = bookData.genres as number[];

      const genresToDelete = genreIds.filter((id) => !newGenreIds.includes(id));
      const genresToAdd = newGenreIds.filter((id) => !genreIds.includes(id));

      if (genresToDelete.length > 0) {
        await trx
          .delete(book_genres)
          .where(
            and(
              eq(book_genres.book_id, bookId),
              inArray(book_genres.genre_id, genresToDelete)
            )
          );
      }

      if (genresToAdd.length > 0) {
        await trx.insert(book_genres).values(
          genresToAdd.map((genreId: number) => ({
            book_id: bookId,
            genre_id: genreId,
          }))
        );
      }
      result = await trx
        .update(books)
        .set(update)
        .where(eq(books.id, bookId))
        .returning();
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.log(error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to update book"
    );
  }
  return result[0];
};
