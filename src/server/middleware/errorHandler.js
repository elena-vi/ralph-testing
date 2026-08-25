/**
 * Celebrate Validation Error Handler Middleware
 * ==============================================
 *
 * Converts celebrate validation errors to the standard errorResponse format.
 * Must be positioned after route handlers so Express dispatches errors to it.
 */

import { errorResponse } from "../utils/response.js";

/**
 * Express error middleware for handling celebrate validation errors.
 * Converts celebrate error details (Map) to a standard errorResponse envelope.
 *
 * @param {Error} err - The error object from celebrate
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export function celebrateErrorHandler(err, req, res, next) {
  // Check if this is a celebrate validation error
  if (err.details && err.details instanceof Map) {
    // Extract the first validation error message from the details Map
    let message = "Validation failed";
    for (const [_segment, details] of err.details.entries()) {
      if (details && details.message) {
        message = details.message;
        break;
      }
    }

    return res.status(400).json(errorResponse(message));
  }

  // If not a celebrate error, pass to next error handler
  next(err);
}
