import { drizzle } from "drizzle-orm/d1";
import { Environment } from "../../bindings";
import { books, users, shelves, book_shelves } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import httpStatus from "http-status";
import { ApiError } from "../utils/ApiError";
import { toUrlSafeString } from "../utils/utils";

export const getShelf = async (
  shelfId: string,
  Env: Environment,
  userId: string = ""
) => {
  const db = drizzle(Env.Bindings.DB);

  try {
    let shelf: any;
    shelf = await db
      .select()
      .from(shelves)
      .where(eq(shelves.id, shelfId))
      .innerJoin(users, eq(shelves.user_id, users.id));

    if (!shelf || shelf.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, "Shelf not found");
    }
    if (shelf[0].shelves.user_id != userId && shelf[0].shelves.private) {
      throw new ApiError(httpStatus.NOT_FOUND, "Shelf not found");
    }

    let shelfBooks = db
      .select({ books })
      .from(book_shelves)
      .innerJoin(books, eq(book_shelves.book_id, books.id))
      .innerJoin(shelves, eq(book_shelves.shelf_id, shelves.id))
      .where(eq(shelves.id, shelfId))
      .$dynamic();

    if (shelf[0].shelves.user_id != userId) {
      shelfBooks = shelfBooks.where(eq(books.private, false));
    }

    let bookresults = (await db.run(shelfBooks)).results;

    bookresults = bookresults.map((book: any) => ({
      ...book,
      favorite: book.favorite === 1,
      finished: book.finished === 1,
      private: book.private === 1,
    }));
    let user = {
      id: shelf[0].users.id,
      username: shelf[0].users.username,
      avatar: shelf[0].users.avatar,
      current_user: shelf[0].users.id === userId,
    };

    return { shelf: shelf[0].shelves, books: bookresults, user: user };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to get shelf");
  }
};

export const createShelf = async (
  user_id: string,
  shelf: any,
  Env: Environment
) => {
  let result: any;
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const nanoid = customAlphabet(alphabet, 15);
  const id = nanoid();
  const shelfName = toUrlSafeString(shelf.name);
  const shelfData = {
    id: id,
    user_id: user_id,
    slug: `${shelfName}-${id}`,
    name: shelf.name,
    description: shelf.description,
    private: shelf.private,
  };
  try {
    const db = drizzle(Env.Bindings.DB);
    result = await db.insert(shelves).values(shelfData).returning();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create shelf"
    );
  }
  return result[0];
};

export const updateShelf = async (
  user_id: string,
  shelf_id: string,
  shelfData: any,
  Env: Environment
) => {
  let result: any;
  if (Object.keys(shelfData).length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Shelf data is empty");
  }

  const db = drizzle(Env.Bindings.DB);

  try {
    const [shelf] = await db
      .select()
      .from(shelves)
      .where(eq(shelves.id, shelf_id));

    if (!shelf) {
      throw new ApiError(httpStatus.NOT_FOUND, "Shelf not found");
    }

    if (shelf.user_id !== user_id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
    }
    const update: any = {
      name: shelfData.name || shelf.name,
      description: shelfData.description || shelf.description,
      private:
        shelfData.private !== undefined ? shelfData.private : shelf.private,
      updated_at: new Date().toISOString(),
    };
    if (shelfData.name) {
      update.slug = `${toUrlSafeString(shelfData.name)}-${shelf_id}`;
    }
    result = await db
      .update(shelves)
      .set(update)
      .where(eq(shelves.id, shelf_id))
      .returning();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to update shelf"
    );
  }
  return result[0];
};

export const deleteShelf = async (
  user_id: string,
  shelf_id: string,
  Env: Environment
) => {
  const db = drizzle(Env.Bindings.DB);

  try {
    const shelf = await db
      .select()
      .from(shelves)
      .where(eq(shelves.id, shelf_id));

    if (!shelf || shelf.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, "Shelf not found");
    }

    if (shelf[0].user_id !== user_id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
    }

    await db.delete(shelves).where(eq(shelves.id, shelf_id));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to delete shelf"
    );
  }
};

export const addBookToShelf = async (
  shelfId: string,
  bookId: string,
  userId: string,
  Env: Environment
) => {
  const db = drizzle(Env.Bindings.DB);

  try {
    const [shelf] = await db
      .select()
      .from(shelves)
      .where(eq(shelves.id, shelfId));

    if (!shelf) {
      throw new ApiError(httpStatus.NOT_FOUND, "Shelf not found");
    }
    if (shelf.user_id !== userId) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
    }

    const [book] = await db.select().from(books).where(eq(books.id, bookId));

    if (!book) {
      throw new ApiError(httpStatus.NOT_FOUND, "Book not found");
    }
    if (book.user_id !== userId) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
    }

    const [bookShelf] = await db
      .select()
      .from(book_shelves)
      .where(
        and(
          eq(book_shelves.book_id, bookId),
          eq(book_shelves.shelf_id, shelfId)
        )
      );

    if (bookShelf) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Book already in shelf");
    }

    await db
      .insert(book_shelves)
      .values({ book_id: bookId, shelf_id: shelfId });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to add book to shelf"
    );
  }
};

export const removeBookFromShelf = async (
  shelfId: string,
  bookId: string,
  userId: string,
  Env: Environment
) => {
  const db = drizzle(Env.Bindings.DB);

  try {
    const [bookShelf] = await db
      .select()
      .from(book_shelves)
      .innerJoin(shelves, eq(book_shelves.shelf_id, shelves.id))
      .where(
        and(
          eq(book_shelves.book_id, bookId),
          eq(book_shelves.shelf_id, shelfId)
        )
      );

    if (!bookShelf) {
      throw new ApiError(httpStatus.NOT_FOUND, "Book not found in shelf");
    }
    if (bookShelf.shelves.user_id !== userId) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
    }

    await db
      .delete(book_shelves)
      .where(
        and(
          eq(book_shelves.book_id, bookId),
          eq(book_shelves.shelf_id, shelfId)
        )
      );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to remove book from shelf"
    );
  }
};
