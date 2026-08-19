import db from "./database.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json at module load time
let packageVersion = "1.0.0"; // fallback
try {
  const packagePath = join(__dirname, "../../..", "package.json");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
  packageVersion = packageJson.version;
} catch {
  // version fallback already set
}

/**
 * Health Service
 * ========================
 *
 * Provides health and readiness checks for the API.
 * Tracks server uptime and validates database connectivity.
 */
class HealthService {
  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Get current health status including uptime and version
   * @returns {Promise<Object>} Health status with status, uptime in seconds, and version
   */
  async getHealth() {
    const uptimeMs = Date.now() - this.startTime;
    const uptimeSeconds = Math.max(uptimeMs / 1000, 0.001); // Ensure at least 0.001 seconds

    return {
      status: "ok",
      uptime: uptimeSeconds,
      version: packageVersion,
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
