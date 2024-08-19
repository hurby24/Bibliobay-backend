import { drizzle } from "drizzle-orm/d1";
import { Environment } from "../../bindings";
import { books, users, genres, book_genres, friends } from "../db/schema";
import { eq, or, and, inArray, sql, asc, desc } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/sqlite-core";
import { customAlphabet } from "nanoid";
import httpStatus from "http-status";
import { ApiError } from "../utils/ApiError";
import { toUrlSafeString, withPagination } from "../utils/utils";

export const getBook = async (
  bookId: string,
  Env: Environment,
  user_id: string = ""
) => {
  const db = drizzle(Env.Bindings.DB);

  try {
    let book: any;
    book = await db
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
    let genre = await db
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
      current_user: book[0].users.id === user_id,
    };
    return { book: book[0].books, genrse: genre, user: user };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to get book");
  }
};

export const getBooks = async (
  user_id: string,
  queries: any,
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

    const userData = {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      banner: user.banner,
      private: user.private,
      supporter: user.supporter,
      friend: isFriend,
    };
    if (!isCurrentUser && !isFriend && user.private) {
      return {
        user: userData,
        books: [],
      };
    }

    const qb = new QueryBuilder();
    const result = qb
      .select({
        book: books,
        genres: sql`
      (
        SELECT json_group_array(
          json_object('id', ${genres}.id, 'name', ${genres}.name)
        ) 
        FROM ${book_genres} 
        JOIN ${genres} ON ${book_genres}.genre_id = ${genres}.id 
        WHERE ${book_genres}.book_id = ${books}.id
      )`.as("genres"),
      })
      .from(books)
      .limit(20)
      .offset(0)
      .$dynamic();

    result.where(
      and(
        eq(books.user_id, user.id),
        !isCurrentUser ? eq(books.private, false) : undefined,
        queries?.state === "read" ? eq(books.finished, true) : undefined,
        queries?.state === "reading" ? eq(books.finished, false) : undefined,
        queries?.state === "favorite" ? eq(books.favorite, true) : undefined,
        queries?.genre && queries.genre <= 30
          ? inArray(
              books.id,
              db
                .select({
                  book_id: book_genres.book_id,
                })
                .from(book_genres)
                .where(eq(book_genres.genre_id, queries.genre))
            )
          : undefined
      )
    );
    if (queries?.sort) {
      switch (queries.sort) {
        case "created_at":
          result.orderBy(
            queries.order === "asc"
              ? asc(books.created_at)
              : desc(books.created_at)
          );
          break;
        case "finished_at":
          result.orderBy(
            queries.order === "asc"
              ? asc(books.finished_at)
              : desc(books.finished_at)
          );
          break;
        case "title":
          result.orderBy(
            queries.order === "asc" ? asc(books.title) : desc(books.title)
          );
          break;
        case "author":
          result.orderBy(
            queries.order === "asc" ? asc(books.author) : desc(books.author)
          );
          break;
        case "pages":
          result.orderBy(
            queries.order === "asc" ? asc(books.pages) : desc(books.pages)
          );
          break;
      }
    }
    if (queries?.page) {
      withPagination(result, 20, queries.page, queries.limit);
    }

    let results = (await db.run(result)).results;
    const userBooks = results.map((book: any) => {
      return {
        ...book,
        genres: JSON.parse(book.genres),
        favorite: book.favorite === 1,
        finished: book.finished === 1,
        private: book.private === 1,
      };
    });

    return {
      user: userData,
      books: userBooks,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to get books");
  }
};

export const createBook = async (
  book: any,
  user_id: string,
  Env: Environment
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
      book.finished_at = new Date().toISOString();
      if (!book.rating) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Rating is required");
      }
      book.rating = Math.round(book.rating * 2) / 2;
    } else {
      book.finished = false;
      book.rating = null;
    }
    const bookComplete = { ...bookBody, ...book };
    const db = drizzle(Env.Bindings.DB);

    result = await db.insert(books).values(bookComplete).returning();

    await db.batch(
      genreIds.map((genreId: number) =>
        db
          .insert(book_genres)
          .values({ book_id: result[0].id, genre_id: genreId })
      )
    );
  } catch (error) {
    console.log(error);
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
  Env: Environment,
  images: R2Bucket
) => {
  const db = drizzle(Env.Bindings.DB);

  try {
    let book = await db.select().from(books).where(eq(books.id, bookId));

    if (!book || book.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, "Book not found");
    }
    if (book[0].user_id != user_id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
    }

    await db.delete(books).where(eq(books.id, bookId));
    const deleteUrl: string = book[0].cover_url.split("/").pop() as string;

    await images.delete(deleteUrl);
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
  Env: Environment,
  images: R2Bucket
) => {
  let result: any;
  if (Object.keys(bookData).length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Book data is empty");
  }

  const db = drizzle(Env.Bindings.DB);

  try {
    const [book] = await db.select().from(books).where(eq(books.id, bookId));

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
      private: bookData.private !== undefined ? bookData.private : book.private,
      favorite:
        bookData.favorite !== undefined ? bookData.favorite : book.favorite,
      updated_at: new Date().toISOString(),
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
      update.finished_at = new Date().toISOString();
      update.rating =
        bookData.rating !== undefined
          ? Math.round(bookData.rating * 2) / 2
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
    let genresList = await db
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
    if (newGenreIds === undefined) {
      result = await db
        .update(books)
        .set(update)
        .where(eq(books.id, bookId))
        .returning();
    } else {
      const genresToDelete = genreIds.filter((id) => !newGenreIds.includes(id));
      const genresToAdd = newGenreIds.filter((id) => !genreIds.includes(id));

      if (genresToDelete.length > 0) {
        await db
          .delete(book_genres)
          .where(
            and(
              eq(book_genres.book_id, bookId),
              inArray(book_genres.genre_id, genresToDelete)
            )
          );
      }

      if (genresToAdd.length > 0) {
        await db.insert(book_genres).values(
          genresToAdd.map((genreId: number) => ({
            book_id: bookId,
            genre_id: genreId,
          }))
        );
      }
      result = await db
        .update(books)
        .set(update)
        .where(eq(books.id, bookId))
        .returning();
    }
  } catch (error) {
    console.log(error);
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to update book"
    );
  }
  return result[0];
};
