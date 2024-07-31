import { createDatabaseConnection } from "../db/connection";
import { books, users, shelves } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import httpStatus from "http-status";
import { ApiError } from "../utils/ApiError";
import { toUrlSafeString } from "../utils/utils";

export const createShelf = async (
  user_id: string,
  shelf: any,
  databaseConfig: string
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
    const db = await createDatabaseConnection(databaseConfig);
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
  databaseConfig: string
) => {
  let result: any;
  if (Object.keys(shelfData).length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Shelf data is empty");
  }

  const db = await createDatabaseConnection(databaseConfig);

  try {
    await db.transaction(async (trx) => {
      const [shelf] = await trx
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
        updated_at: new Date(),
      };
      if (shelfData.name) {
        update.slug = `${toUrlSafeString(shelfData.name)}-${shelf_id}`;
      }
      result = await trx
        .update(shelves)
        .set(update)
        .where(eq(shelves.id, shelf_id))
        .returning();
    });
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
  databaseConfig: string
) => {
  const db = await createDatabaseConnection(databaseConfig);
  try {
    await db.transaction(async (trx) => {
      const shelf = await trx
        .select()
        .from(shelves)
        .where(eq(shelves.id, shelf_id));

      if (!shelf || shelf.length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, "Shelf not found");
      }

      if (shelf[0].user_id !== user_id) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
      }

      await trx.delete(shelves).where(eq(shelves.id, shelf_id));
    });
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
