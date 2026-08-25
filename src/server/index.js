/**
 * Express Server Entry Point
 * ============================
 *
 * Main server configuration and startup.
 * This file:
 * - Initializes Express with security middleware
 * - Sets up API routes
 * - Configures static file serving for production
 * - Handles graceful shutdown
 *
 * Start the server:
 *   npm run server       # Development with auto-reload
 *   npm run server:debug # Development with debugging
 *   npm start            # Production
 */

import path from "path";
import express from "express";
import cors from "cors";
import http from "http";
import { errors } from "celebrate";
import routes from "./routes/v1/index.js";
import { securityMiddleware, requestLogger } from "./middleware/security.js";
import config from "./config/index.js";
import { errorResponse } from "./utils/response.js";

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

// Handle Celebrate validation errors (must come AFTER routes)
// Express only dispatches errors to handlers positioned after the raising layer
// Convert celebrate errors to proper errorResponse envelope format
app.use((err, req, res, next) => {
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
});

// Fall back to celebrate's default error handler for any validation errors that weren't caught
app.use(errors());

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
// Server Startup
// ============================================================================

const httpServer = http.createServer(app);

httpServer.listen(config.port, () => {
  console.log(`
🚀 Server running on port ${config.port}
📦 Environment: ${config.nodeEnv}
🔗 API: http://localhost:${config.port}/api/v1
${config.isDevelopment ? "🛠️  Development mode - hot reload enabled" : ""}
  `);
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

/**
 * Handle graceful shutdown on SIGTERM/SIGINT
 * Closes server connections before exiting
 */
const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  httpServer.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
