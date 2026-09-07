/**
 * Health Service Tests
 * =====================
 *
 * Tests for the health service API methods.
 * Verifies that health checks call the correct root-level endpoints.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { healthService } from "../../services/health";

// Mock the API instance
vi.mock("../../services/api", () => {
  const mockApi = {
    get: vi.fn(),
  };
  return {
    default: mockApi,
  };
});

import api from "../../services/api";

describe("Health Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("check()", () => {
    it("calls the root-level /api/health endpoint", async () => {
      const mockResponse = { success: true, data: { status: "ok" } };
      api.get.mockResolvedValue(mockResponse);

      const result = await healthService.check();

      // Verify it calls /api/health with baseURL override
      expect(api.get).toHaveBeenCalledWith("/api/health", { baseURL: "" });
      expect(result).toEqual(mockResponse);
    });

    it("handles check errors", async () => {
      const error = new Error("Server not responding");
      api.get.mockRejectedValue(error);

      await expect(healthService.check()).rejects.toThrow("Server not responding");
      expect(api.get).toHaveBeenCalledWith("/api/health", { baseURL: "" });
    });
  });

  describe("checkDatabase()", () => {
    it("returns true when health check succeeds", async () => {
      api.get.mockResolvedValue({ success: true });

      const result = await healthService.checkDatabase();

      expect(result).toBe(true);
      expect(api.get).toHaveBeenCalledWith("/api/health", { baseURL: "" });
    });

    it("returns false when health check fails", async () => {
      api.get.mockRejectedValue(new Error("Server error"));

      const result = await healthService.checkDatabase();

      expect(result).toBe(false);
    });

    it("returns false when contact fetch fails", async () => {
      // First call succeeds (health), second call fails (contacts)
      api.get
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error("Not found"));

      const result = await healthService.checkDatabase();

      expect(result).toBe(false);
    });
  });
});
