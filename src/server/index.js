/**
 * Express Server Entry Point
 * ============================
 *
 * Bootstraps the HTTP server and handles graceful shutdown.
 * Imports the configured Express app from app.js.
 *
 * This file is only executed when run directly as the entry point,
 * not when imported by tests or other modules.
 *
 * Start the server:
 *   npm run server       # Development with auto-reload
 *   npm run server:debug # Development with debugging
 *   npm start            # Production
 */

import { pathToFileURL } from "url";
import http from "http";
import app from "./app.js";
import config from "./config/index.js";

// ============================================================================
// Server Startup (only when this module is run directly as CLI entry point)
// ============================================================================

/**
 * Check if this module is being run directly (not imported)
 * Uses pathToFileURL to normalize paths with spaces, symlinks, etc.
 * @returns {boolean} True if module is entry point
 */
const isMainModule = () => {
  const mainModuleUrl = pathToFileURL(process.argv[1]).href;
  return import.meta.url === mainModuleUrl;
};

// Only start the server if this module is the entry point
if (isMainModule()) {
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
   * @param {string} signal - Signal name (SIGTERM or SIGINT)
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
}
