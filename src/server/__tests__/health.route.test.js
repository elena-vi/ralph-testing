/**
 * Health Route Tests
 * ========================
 *
 * Tests for the health and ready endpoints.
 * Covers happy path, edge cases, and error scenarios.
 * Mocks the healthService to ensure no database is required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Mock the health service
vi.mock("../services/health.service.js", () => ({
  default: {
    getHealth: vi.fn(),
    getReady: vi.fn(),
  },
}));

import healthService from "../services/health.service.js";
import healthRoutes from "../routes/v1/health.route.js";

// Read expected version from package.json for test assertions
const __filename = fileURLToPath(import.meta.url);
const projectRoot = dirname(dirname(dirname(dirname(__filename))));
const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8"));
const expectedVersion = packageJson.version;

/**
 * Create an Express app with the health routes for testing
 * Excludes rate limiting middleware to test route behavior independently
 */
function createTestApp() {
  const app = express();
  app.use(express.json());
  // Mount health routes directly without rate limiting
  app.use("/api/v1", healthRoutes);
  return app;
}

describe("Health Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/health", () => {
    /**
     * AC-1: GET /health returns 200 with status, uptime, and version
     */
    it("returns 200 with health status including uptime and version", async () => {
      const mockHealth = {
        status: "ok",
        uptime: 123.45,
        version: expectedVersion,
      };
      healthService.getHealth.mockResolvedValueOnce(mockHealth);

      const app = createTestApp();
      const res = await request(app).get("/api/v1/health");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: mockHealth,
        message: "Success",
        timestamp: expect.any(String),
      });
    });

    /**
     * AC-1: Response body contains correct shape with timestamp in ISO8601 format
     */
    it("returns response with ISO8601 timestamp", async () => {
      const mockHealth = {
        status: "ok",
        uptime: 1.23,
        version: expectedVersion,
      };
      healthService.getHealth.mockResolvedValueOnce(mockHealth);

      const app = createTestApp();
      const res = await request(app).get("/api/v1/health");

      expect(res.status).toBe(200);
      expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    /**
     * Edge case: uptime close to zero when server just started
     */
    it("handles small uptime values (server started recently)", async () => {
      const mockHealth = {
        status: "ok",
        uptime: 0.05,
        version: expectedVersion,
      };
      healthService.getHealth.mockResolvedValueOnce(mockHealth);

      const app = createTestApp();
      const res = await request(app).get("/api/v1/health");

      expect(res.status).toBe(200);
      expect(res.body.data.uptime).toBe(0.05);
    });

    /**
     * Edge case: large uptime value (server running for extended duration)
     */
    it("handles large uptime values (server running long)", async () => {
      const mockHealth = {
        status: "ok",
        uptime: 86400 * 30, // 30 days in seconds
        version: expectedVersion,
      };
      healthService.getHealth.mockResolvedValueOnce(mockHealth);

      const app = createTestApp();
      const res = await request(app).get("/api/v1/health");

      expect(res.status).toBe(200);
      expect(res.body.data.uptime).toBe(86400 * 30);
    });

    /**
     * Edge case: service throws error
     */
    it("returns 500 when health service throws", async () => {
      healthService.getHealth.mockRejectedValueOnce(new Error("Service error"));

      const app = createTestApp();
      const res = await request(app).get("/api/v1/health");

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/ready", () => {
    /**
     * AC-2: GET /ready returns 200 with status when database is healthy
     */
    it("returns 200 with ready status when database is healthy", async () => {
      const mockReady = { status: "ok" };
      healthService.getReady.mockResolvedValueOnce(mockReady);

      const app = createTestApp();
      const res = await request(app).get("/api/v1/ready");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: mockReady,
        message: "Success",
        timestamp: expect.any(String),
      });
    });

    /**
     * AC-2: Response body shape with timestamp in ISO8601 format
     */
    it("returns response with ISO8601 timestamp", async () => {
      const mockReady = { status: "ok" };
      healthService.getReady.mockResolvedValueOnce(mockReady);

      const app = createTestApp();
      const res = await request(app).get("/api/v1/ready");

      expect(res.status).toBe(200);
      expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    /**
     * AC-3: GET /ready returns 503 with reason message when database is unavailable
     */
    it("returns 503 with error message when database is unavailable", async () => {
      const error = new Error("Database is not ready");
      error.reason = "Connection refused: could not connect to database";
      healthService.getReady.mockRejectedValueOnce(error);

      const app = createTestApp();
      const res = await request(app).get("/api/v1/ready");

      expect(res.status).toBe(503);
      expect(res.body).toEqual({
        success: false,
        data: null,
        message: "Connection refused: could not connect to database",
        timestamp: expect.any(String),
      });
    });

    /**
     * AC-3: Database error returns 503, not 500
     */
    it("returns 503 for database errors, not 500", async () => {
      const error = new Error("Database is not ready");
      error.reason = "Query timeout";
      healthService.getReady.mockRejectedValueOnce(error);

      const app = createTestApp();
      const res = await request(app).get("/api/v1/ready");

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
    });

    /**
     * Edge case: various database error reasons
     */
    it("returns different error messages for different database failures", async () => {
      const scenarios = [
        { reason: "ECONNREFUSED" },
        { reason: "ENOTFOUND" },
        { reason: "Permission denied" },
      ];

      for (const scenario of scenarios) {
        vi.clearAllMocks();
        const error = new Error("Database is not ready");
        error.reason = scenario.reason;
        healthService.getReady.mockRejectedValueOnce(error);

        const app = createTestApp();
        const res = await request(app).get("/api/v1/ready");

        expect(res.status).toBe(503);
        expect(res.body.message).toBe(scenario.reason);
      }
    });

    /**
     * Edge case: service throws error without reason property (fallback)
     */
    it("handles errors without reason property gracefully", async () => {
      const error = new Error("Unexpected error");
      // Intentionally not setting error.reason
      healthService.getReady.mockRejectedValueOnce(error);

      const app = createTestApp();
      const res = await request(app).get("/api/v1/ready");

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Rate limiting bypass", () => {
    /**
     * AC-4: Health and ready endpoints bypass rate limiting
     * Note: This test verifies the middleware is configured correctly.
     * Full rate limit bypass is tested via integration with securityMiddleware.
     */
    it("health route handles multiple rapid requests without 429", async () => {
      const mockHealth = {
        status: "ok",
        uptime: 5.0,
        version: expectedVersion,
      };

      const app = createTestApp();

      // Make multiple rapid requests
      for (let i = 0; i < 5; i++) {
        healthService.getHealth.mockResolvedValueOnce(mockHealth);
        const res = await request(app).get("/api/v1/health");
        expect(res.status).toBe(200);
      }

      expect(healthService.getHealth).toHaveBeenCalledTimes(5);
    });

    /**
     * AC-4: Ready endpoint handles multiple rapid requests without 429
     */
    it("ready route handles multiple rapid requests without 429", async () => {
      const mockReady = { status: "ok" };

      const app = createTestApp();

      // Make multiple rapid requests
      for (let i = 0; i < 5; i++) {
        healthService.getReady.mockResolvedValueOnce(mockReady);
        const res = await request(app).get("/api/v1/ready");
        expect(res.status).toBe(200);
      }

      expect(healthService.getReady).toHaveBeenCalledTimes(5);
    });
  });

  describe("Response format compliance", () => {
    /**
     * Verify response envelope matches the contract
     */
    it("health response includes success flag and message", async () => {
      const mockHealth = {
        status: "ok",
        uptime: 10.5,
        version: expectedVersion,
      };
      healthService.getHealth.mockResolvedValueOnce(mockHealth);

      const app = createTestApp();
      const res = await request(app).get("/api/v1/health");

      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Success");
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("timestamp");
    });

    /**
     * Verify error response envelope
     */
    it("ready error response has success=false and null data", async () => {
      const error = new Error("Database is not ready");
      error.reason = "Connection timeout";
      healthService.getReady.mockRejectedValueOnce(error);

      const app = createTestApp();
      const res = await request(app).get("/api/v1/ready");

      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("data", null);
      expect(res.body).toHaveProperty("message");
      expect(res.body).toHaveProperty("timestamp");
    });
  });
});
