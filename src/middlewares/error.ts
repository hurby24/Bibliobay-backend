import type { ErrorHandler } from "hono";
import { StatusCode } from "hono/utils/http-status";
import httpStatus from "http-status";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError";
import { generateZodErrorMessage } from "../utils/zod";

const genericJSONErrMsg = "Unexpected end of JSON input";

export const errorConverter = (err: unknown): ApiError => {
  let error = err;
  if (error instanceof ZodError) {
    const errorMessage = generateZodErrorMessage(error);
    error = new ApiError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "Validation failed",
      errorMessage
    );
  } else if (
    error instanceof SyntaxError &&
    error.message.includes(genericJSONErrMsg)
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid JSON payload");
  } else if (!(error instanceof ApiError)) {
    const castedErr = (typeof error === "object" ? error : {}) as Record<
      string,
      unknown
    >;
    const statusCode: number =
      typeof castedErr.statusCode === "number"
        ? castedErr.statusCode
        : httpStatus.INTERNAL_SERVER_ERROR;
    const message = (castedErr.description ||
      castedErr.message ||
      httpStatus[statusCode as keyof typeof httpStatus]) as string;
    error = new ApiError(statusCode, message, false);
  }
  return error as ApiError;
};

export const errorHandler: ErrorHandler = async (err, c) => {
  const error = errorConverter(err);
  if (!error.isOperational) {
    error.statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    error.message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR].toString();
  }
  const response = {
    code: error.statusCode,
    message: error.message,
    details: error.details,
  };
  delete c.error;
  return c.json(response, error.statusCode as StatusCode);
};
