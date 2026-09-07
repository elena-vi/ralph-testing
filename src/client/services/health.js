/**
 * Health Service
 * ================
 *
 * API methods for system health checks.
 * Used to verify database connectivity and server status.
 *
 * Usage:
 *   import { healthService } from '@/client/services';
 *
 *   const isConnected = await healthService.checkDatabase();
 */

import api from "./api";

/**
 * Health endpoints live at the `/api/` root rather than under the versioned
 * `/api/v1/` prefix, so load balancers get a version-independent probe URL.
 * The shared Axios instance is based at `/api/v1`, so these calls override
 * `baseURL` to reach the root-level path.
 */
const HEALTH_PATH = "/api/health";
const ROOT_BASE_URL_OVERRIDE = { baseURL: "" };

export const healthService = {
  /**
   * Check if the server is responding
   * Calls the root-level /api/health endpoint
   * @returns {Promise<{success: boolean, data: {status: string}}>}
   */
  check: () => api.get(HEALTH_PATH, ROOT_BASE_URL_OVERRIDE),

  /**
   * Check database connectivity by attempting to fetch data
   * Returns true if connected, false otherwise
   * @returns {Promise<boolean>}
   */
  checkDatabase: async () => {
    try {
      await api.get(HEALTH_PATH, ROOT_BASE_URL_OVERRIDE);
      await api.get("/contact/list");
      return true;
    } catch {
      return false;
    }
  },
};

export default healthService;
