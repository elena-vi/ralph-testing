import db from "./database.js";
import config from "../config/index.js";

/**
 * Health Service
 * ========================
 *
 * Provides health and readiness checks for the API.
 * Tracks server uptime and validates database connectivity.
 */
class HealthService {
  /**
   * Get current health status including uptime and version
   * @returns {Promise<Object>} Health status with status, uptime in seconds, and version
   */
  async getHealth() {
    const uptimeSeconds = process.uptime();

    return {
      status: "ok",
      uptime: uptimeSeconds,
      version: config.version,
    };
  }

  /**
   * Check if the database is ready and accepting connections
   * @returns {Promise<Object>} Ready status with status: 'ok'
   * @throws {Error} Error with reason property if database is unavailable
   */
  async getReady() {
    try {
      await db.prisma.$queryRaw`SELECT 1`;
      return { status: "ok" };
    } catch (error) {
      const healthError = new Error("Database is not ready");
      healthError.reason = error.message || "Unknown database error";
      throw healthError;
    }
  }
}

export default new HealthService();
