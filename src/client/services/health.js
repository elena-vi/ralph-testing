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

export const healthService = {
  /**
   * Check if the server is responding
   * Calls the root-level /api/health endpoint
   * @returns {Promise<{success: boolean, data: {status: string}}>}
   */
  check: () => api.get("/api/health", { baseURL: "" }),

  /**
   * Check database connectivity by attempting to fetch data
   * Returns true if connected, false otherwise
   * @returns {Promise<boolean>}
   */
  checkDatabase: async () => {
    try {
      await api.get("/api/health", { baseURL: "" });
      await api.get("/contact/list");
      return true;
    } catch {
      return false;
    }
  },
};

export default healthService;
