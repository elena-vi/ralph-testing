/**
 * Celebrate Validation Error Handler
 * ==================================
 *
 * Converts celebrate validation errors to our standard response format.
 * Uses the public celebrate API (isCelebrateError) rather than coupling
 * to internal error structure.
 *
 * Celebrate's errors() middleware catches validation failures and returns
 * a structured error with details. This handler extracts the first error
 * message and returns it through our standard errorResponse format.
 */

import { isCelebrateError } from "celebrate";
import { errorResponse } from "../utils/response.js";

/**
 * Create a middleware that handles celebrate validation errors
 * Converts celebrate's structured validation errors to our response format
 * @returns {Function} Express error handler middleware
 */
export const createCelebrateErrorHandler = () => {
  return (err, req, res, next) => {
    // Check if this is a celebrate validation error
    if (isCelebrateError(err)) {
      // Extract the first error message from the validation details
      let message = "Validation failed";

      // details is a Map keyed by segment: "body", "params", "query", "headers", etc.
      if (err.details instanceof Map) {
        // Use the first validation error found in any segment
        for (const joiError of err.details.values()) {
          if (joiError?.message) {
            message = joiError.message;
            break;
          }
        }
      }

      return res.status(400).json(errorResponse(message));
    }

    // Not a celebrate error, pass to next handler
    next(err);
  };
};
