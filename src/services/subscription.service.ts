import { drizzle } from "drizzle-orm/d1";
import { Environment } from "../../bindings";
import { users } from "../db/schema";
import { eq, and, or } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import httpStatus from "http-status";
import { ApiError } from "../utils/ApiError";

export const createCheckoutURL = async (userId: string, Env: Environment) => {
  const db = drizzle(Env.Bindings.DB);

  try {
    const user = await db
      .select({ user_id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, userId));

    if (user == null) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${Env.Bindings.LEMONSQUEEZY_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: user[0].email,
              custom: {
                user_id: user[0].user_id,
              },
            },
          },
          relationships: {
            store: {
              data: {
                type: "stores",
                id: "75248",
              },
            },
            variant: {
              data: {
                type: "variants",
                id: "488492",
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to create checkout URL"
      );
    }

    const checkout: any = await response.json();

    return checkout.data.attributes.url;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create checkout URL"
    );
  }
};

export const handleEvent = async (event: any, Env: Environment) => {};
