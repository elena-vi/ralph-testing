import db from "./database.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Go from src/server/services to project root (need to go up 3 levels)
const packageJson = JSON.parse(readFileSync(join(__dirname, "../../../package.json"), "utf-8"));

/**
 * Service class for handling health and readiness checks
 * Provides methods to verify server health and database connectivity
 */
class HealthCheckService {
  /**
   * Retrieves health status including uptime and version
   * @returns {Promise<Object>} Health status object with status, uptime, and version
   */
  async getHealth() {
    return {
      status: "healthy",
      uptime: Math.floor(process.uptime()),
      version: packageJson.version,
    };
  }

  /**
   * Checks if the server is ready to accept traffic (database connectivity)
   * @returns {Promise<Object>} Ready status object
   * @throws {Error} If database is not available
   */
  async getReadiness() {
    // Test database connectivity with a simple query
    await db.prisma.$queryRaw`SELECT 1`;

    return {
      status: "ready",
    };
  }
}

export default new HealthCheckService();
