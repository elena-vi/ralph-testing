import helmet from "helmet";
import rateLimit from "express-rate-limit";
import config from "../config/index.js";

/**
 * Health and readiness paths that should bypass rate limiting
 * Only the exact health and ready endpoints are exempt
 * @constant {Array<string>}
 */
const HEALTH_AND_READINESS_PATHS = ["/api/v1/health", "/api/v1/ready"];

/**
 * Normalize a request path for comparison
 * Removes trailing slashes and converts to lowercase to account for
 * Express's default case-insensitive and non-strict routing modes
 * @param {string} path - The path to normalize
 * @returns {string} The normalized path
 */
function normalizePath(path) {
  return path.toLowerCase().replace(/\/$/, "");
}

/**
 * Array of security middleware functions
 * Includes helmet for HTTP headers and rate limiting
 * @constant {Array<Function>}
 */
export const securityMiddleware = [
  // Helmet middleware for securing HTTP headers
  helmet(),

  // Rate limiting to prevent abuse
  // Health and ready endpoints are skipped to allow continuous monitoring
  rateLimit({
    windowMs: config.security.rateLimitWindowMs,
    max: config.security.rateLimitMax,
    message: "Too many requests from this IP, please try again later",
    skip: (req) => {
      // Skip rate limiting for health and ready endpoint paths
      // Normalize the path to handle case-insensitive and trailing slash variations
      const normalizedPath = normalizePath(req.path);
      const normalizedHealthPaths = HEALTH_AND_READINESS_PATHS.map(normalizePath);
      return normalizedHealthPaths.includes(normalizedPath);
    },
  }),
];

/**
 * Middleware for logging incoming requests
 * Logs timestamp, HTTP method, and URL path
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const requestLogger = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
};
