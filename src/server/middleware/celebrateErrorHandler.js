import { errors as celebrateErrors } from "celebrate";
import { errorResponse } from "../utils/response.js";

/**
 * Create a wrapper around Celebrate's error handler that returns our standard response format
 * @returns {Function} Express error handler middleware
 */
export const createCelebrateErrorHandler = () => {
  const handleCelebrateErrors = celebrateErrors();

  return (err, req, res, next) => {
    // Call celebrate's error handler first, but intercept the response
    const originalJson = res.json;

    res.json = function (data) {
      // If celebrate returned an error with validation details, convert to our format
      if (data && data.validation) {
        // Extract the first error message from celebrate's validation details
        let message = "Validation failed";

        // Find the first error message from any validation source
        if (data.validation && typeof data.validation === "object") {
          for (const key of Object.keys(data.validation)) {
            const validation = data.validation[key];
            if (validation && validation.message) {
              message = validation.message;
              break;
            }
          }
        }

        // Return using our standard error response format
        return originalJson.call(this, errorResponse(message));
      }

      // For non-validation errors, return as-is
      return originalJson.call(this, data);
    };

    // Call celebrate's error handler
    handleCelebrateErrors(err, req, res, next);
  };
};

// Export a singleton instance for convenience
export const celebrateErrorHandler = createCelebrateErrorHandler();
