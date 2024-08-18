import { drizzle } from "drizzle-orm/d1";
import { Environment } from "../../bindings";
import { users, subscriptions } from "../db/schema";
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

    const subscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, userId));

    if (subscription.length > 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "User already has a subscription"
      );
    }
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

export const handleEvent = async (event: any, Env: Environment) => {
  const user_id = event.meta.custom_data.user_id;
  const db = drizzle(Env.Bindings.DB);
  try {
    if (event.meta.event_name === "subscription_created") {
      await db.batch([
        db.update(users).set({ supporter: true }).where(eq(users.id, user_id)),
        db.insert(subscriptions).values({
          id: event.data.id,
          user_id: user_id,
          order_id: event.data.attributes.order_id,
          product_id: event.data.attributes.product_id,
          variant_id: event.data.attributes.variant_id,
          status: event.data.attributes.status,
          renews_at: event.data.attributes.renews_at,
          ends_at: event.data.attributes.ends_at,
          card_brand: event.data.attributes.card_brand,
          card_last_four: event.data.attributes.card_last_four,
        }),
      ]);

      return true;
    }
    if (event.meta.event_name === "subscription_updated") {
      await db
        .update(subscriptions)
        .set({
          status: event.data.attributes.status,
          renews_at: event.data.attributes.renews_at,
          ends_at: event.data.attributes.ends_at,
          card_brand: event.data.attributes.card_brand,
          card_last_four: event.data.attributes.card_last_four,
          updated_at: new Date().toISOString(),
        })
        .where(eq(subscriptions.id, event.data.id));

      if (event.data.attributes.status === "expired") {
        await db.batch([
          db
            .update(users)
            .set({ supporter: false })
            .where(eq(users.id, user_id)),
          db.delete(subscriptions).where(eq(subscriptions.id, event.data.id)),
        ]);
      }

      return true;
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to proccess event"
    );
  }
};

export const getSubscription = async (userId: string, Env: Environment) => {
  const db = drizzle(Env.Bindings.DB);

  try {
    const subscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, userId));

    if (subscription.length !== 0) {
      const response = await fetch(
        "https://api.lemonsqueezy.com/v1/subscriptions/" + subscription[0].id,
        {
          method: "GET",
          headers: {
            Accept: "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
            Authorization: `Bearer ${Env.Bindings.LEMONSQUEEZY_API_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          "Failed to get subscription"
        );
      }

      const subscriptionData: any = await response.json();

      return {
        ...subscription[0],
        customer_portal: subscriptionData.data.attributes.urls.customer_portal,
        update_payment_method:
          subscriptionData.data.attributes.urls.update_payment_method,
      };
    }
    return {};
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to proccess event"
    );
  }
};
