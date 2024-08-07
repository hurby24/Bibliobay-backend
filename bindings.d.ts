export type Environment = {
  Bindings: {
    DATABASE_URL: string;
    DB: D1Database;
    IMAGES: R2Bucket;
    HMACsecret: string;
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
    UPSTASH_REDIS_REST_URL: string;
    UPSTASH_REDIS_REST_TOKEN: string;
    TURNSTILE_SECRET: string;
    MY_RATE_LIMITER: any;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
  };
};
