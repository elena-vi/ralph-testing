import db from "./database.js";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cache package.json version at module load time
const packageJsonPath = join(__dirname, "../../..", "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const cachedVersion = packageJson.version;

/**
 * Service class for health and readiness checks
 * Provides endpoints for monitoring service health and database connectivity
 */
class HealthService {
  /**
   * Gets the current health status with uptime and version
   * @param {Date} startTime - The server startup time
   * @returns {Object} Health status object with status, uptime, and version
   */
  getHealth(startTime) {
    const now = new Date();
    const uptimeMs = now.getTime() - startTime.getTime();

    return {
      status: "healthy",
      uptime: uptimeMs,
      version: cachedVersion,
    };
  }

  /**
   * Checks if the service is ready by verifying database connectivity
   * @returns {Promise<Object>} Ready status object
   * @throws {Error} Throws an error if database is unavailable
   */
  async checkReady() {
    try {
      await db.prisma.$queryRaw`SELECT 1`;
      return {
        ready: true,
      };
    } catch (error) {
      throw new Error("Service is not ready", { cause: error });
    }
  }
}

export default new HealthService();
