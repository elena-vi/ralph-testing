/**
 * Express Application Factory
 * ============================
 *
 * Exports a configured Express app instance.
 * Separated from startup logic to enable testing and clean imports.
 *
 * This file:
 * - Initializes Express with security middleware
 * - Sets up API routes
 * - Configures static file serving for production
 * - Handles error responses
 *
 * Used by:
 *   - src/server/index.js (startup and graceful shutdown)
 *   - Test files (integration testing without starting server)
 */

import path from "path";
import express from "express";
import cors from "cors";
import routes from "./routes/v1/index.js";
import { securityMiddleware, requestLogger } from "./middleware/security.js";
import config from "./config/index.js";

// ============================================================================
// Express App Setup
// ============================================================================

const app = express();

// Apply security middleware (helmet, rate limiting)
app.use(securityMiddleware);

// Request logging (development only shows in console)
app.use(requestLogger);

// Parse JSON request bodies
app.use(express.json());

// Enable CORS for all routes
app.use(cors());

// Serve static files from the built frontend
app.use(express.static("dist"));

// ============================================================================
// API Routes
// ============================================================================

// Mount all API routes under /api/v1
app.use("/api/v1/", routes);

// ============================================================================
// Frontend Routes (SPA Support)
// ============================================================================

/**
 * Redirect root to frontend in development
 * In production, the static file server handles this
 */
app.get("/", (req, res) => {
  if (config.isDevelopment) {
    // In development, redirect to Vite dev server
    res.redirect("http://localhost:3000");
  } else {
    // In production, serve the built index.html
    res.sendFile(path.resolve("dist", "index.html"));
  }
});

/**
 * Catch-all route for SPA client-side routing
 * Serves index.html for any route not handled by API
 * Note: Express 5 requires named wildcard parameter
 */
app.get("/*splat", (req, res) => {
  res.sendFile(path.resolve("dist", "index.html"));
});

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Global error handler
 * Catches any unhandled errors and returns a consistent JSON response
 */
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: config.isDevelopment ? err.message : "An unexpected error occurred",
    // Only include stack trace in development
    ...(config.isDevelopment && { stack: err.stack }),
  });
});

// ============================================================================
// Export app for testing and startup
// ============================================================================

export default app;
