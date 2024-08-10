import { drizzle } from "drizzle-orm/d1";
import { Environment } from "../../bindings";
import { books, goals } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import httpStatus from "http-status";
import { ApiError } from "../utils/ApiError";

export const createGoal = async (
  user_id: string,
  goalData: any,
  Env: Environment
) => {
  const db = drizzle(Env.Bindings.DB);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  try {
    let currentGoal = await db
      .select()
      .from(goals)
      .where(
        and(eq(goals.user_id, user_id), eq(goals.goal_type, goalData.goal_type))
      );

    if (currentGoal && currentGoal.length > 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "User already has a goal for the same time period"
      );
    }
    const alphabet =
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const nanoid = customAlphabet(alphabet, 15);
    const id = nanoid();
    let goal = {
      id: id,
      user_id: user_id,
      goal_type: goalData.goal_type,
      target: goalData.target,
      time: "",
    };

    if (goalData.goal_type === "annual") {
      goal.time = currentYear.toString();
    }
    if (goalData.goal_type === "monthly") {
      goal.time = `${currentYear}-${currentMonth.toString().padStart(2, "0")}`;
    }
    let result = await db.insert(goals).values(goal).returning();

    return result[0];
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create goal"
    );
  }
};

export const getGoal = async (user_id: string, Env: Environment) => {
  const db = drizzle(Env.Bindings.DB);
  const currentYear = new Date().getFullYear();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, "0");
  try {
    let goal = await db.select().from(goals).where(eq(goals.user_id, user_id));

    let current_goals = [];
    for (let item of goal) {
      if (
        (item.goal_type === "monthly" &&
          item.time === `${currentYear}-${currentMonth}`) ||
        (item.goal_type === "annual" &&
          item.time == `${currentYear.toString()}`)
      ) {
        current_goals.push(item);
      } else {
        await db.delete(goals).where(eq(goals.id, item.id));
      }
    }
    let counts = await db.batch([
      db
        .select({
          count: sql`COUNT(*)`,
        })
        .from(books)
        .where(
          and(
            eq(books.user_id, user_id),
            eq(books.finished, true),
            sql`strftime('%Y-%m', books.finished_at) = ${sql`strftime('%Y-%m', CURRENT_DATE)`}`
          )
        ),
      db
        .select({
          count: sql`COUNT(*)`,
        })
        .from(books)
        .where(
          and(
            eq(books.user_id, user_id),
            eq(books.finished, true),
            sql`strftime('%Y', books.finished_at) = ${sql`strftime('%Y', CURRENT_DATE)`}`
          )
        ),
    ]);
    let current_books = {
      monthly: counts[0][0].count,
      annual: counts[1][0].count,
    };

    return { current_goals, current_books };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to get goals");
  }
};

export const updateGoal = async (
  user_id: string,
  goal_id: string,
  goalData: any,
  Env: Environment
) => {
  let result: any;
  if (Object.keys(goalData).length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, " data is empty");
  }

  const db = drizzle(Env.Bindings.DB);

  try {
    const [goal] = await db.select().from(goals).where(eq(goals.id, goal_id));

    if (!goal) {
      throw new ApiError(httpStatus.NOT_FOUND, "Book not found");
    }
    if (goal.user_id !== user_id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
    }
    const update: any = {
      target: goalData.target,
      updated_at: new Date().toISOString(),
    };

    result = await db
      .update(goals)
      .set(update)
      .where(eq(goals.id, goal_id))
      .returning();

    return result[0];
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to update goal"
    );
  }
};

export const deleteGoal = async (
  user_id: string,
  goal_id: string,
  Env: Environment
) => {
  const db = drizzle(Env.Bindings.DB);

  try {
    let goal = await db.select().from(goals).where(eq(goals.id, goal_id));

    if (!goal || goal.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, "Goal not found");
    }
    if (goal[0].user_id !== user_id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
    }

    await db.delete(goals).where(eq(goals.id, goal_id));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to delete goal"
    );
  }
};
