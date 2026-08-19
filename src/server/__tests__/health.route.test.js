/**
 * Health Route Tests
 * ========================
 *
 * Tests for the health and ready endpoints.
 * Covers happy path, edge cases, and error scenarios.
 * Mocks the healthService and database to ensure no database is required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// Mock the database to prevent Prisma client initialization
vi.mock("../services/database.js", () => ({
  default: {
    prisma: {},
  },
}));

// Mock the health service
vi.mock("../services/health.service.js", () => ({
  default: {
    getHealth: vi.fn(),
    getReady: vi.fn(),
  },
}));

import healthService from "../services/health.service.js";
import healthRoutes from "../routes/v1/health.route.js";
import routesV1 from "../routes/v1/index.js";
import { securityMiddleware } from "../middleware/security.js";
import config from "../config/index.js";

const expectedVersion = config.version;

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

/**
 * Create an Express app with security middleware for integration testing
 * Tests the actual rate limiting behavior with the skip function
 * Uses the real route registry to ensure proper middleware ordering
 */
function createTestAppWithSecurity() {
  const app = express();
  // Apply security middleware (includes rate limiting with skip logic)
  app.use(securityMiddleware);
  app.use(express.json());
  // Mount the real routes registry with security middleware
  app.use("/api/v1", routesV1);
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

  describe("Rate limiting integration - AC-4", () => {
    /**
     * AC-4: Health endpoint truly bypasses rate limiting with security middleware
     * Sends 100+ rapid requests and verifies no 429 responses
     */
    it("health endpoint handles 100+ rapid requests with security middleware - all return 200", async () => {
      const mockHealth = {
        status: "ok",
        uptime: 5.0,
        version: expectedVersion,
      };

      const app = createTestAppWithSecurity();

      // Make 120 rapid requests to health endpoint
      const numRequests = 120;
      for (let i = 0; i < numRequests; i++) {
        healthService.getHealth.mockResolvedValueOnce(mockHealth);
      }

      const responses = [];
      for (let i = 0; i < numRequests; i++) {
        const res = await request(app).get("/api/v1/health");
        responses.push(res.status);
      }

      // All responses should be 200, none should be 429 (too many requests)
      const statusCodes = responses.filter((status) => status === 200);
      expect(statusCodes).toHaveLength(numRequests);
      expect(responses).not.toContain(429);
    });

    /**
     * AC-4: Ready endpoint truly bypasses rate limiting with security middleware
     * Sends 100+ rapid requests and verifies no 429 responses
     */
    it("ready endpoint handles 100+ rapid requests with security middleware - all return 200", async () => {
      const mockReady = { status: "ok" };

      const app = createTestAppWithSecurity();

      // Make 120 rapid requests to ready endpoint
      const numRequests = 120;
      for (let i = 0; i < numRequests; i++) {
        healthService.getReady.mockResolvedValueOnce(mockReady);
      }

      const responses = [];
      for (let i = 0; i < numRequests; i++) {
        const res = await request(app).get("/api/v1/ready");
        responses.push(res.status);
      }

      // All responses should be 200, none should be 429 (too many requests)
      const statusCodes = responses.filter((status) => status === 200);
      expect(statusCodes).toHaveLength(numRequests);
      expect(responses).not.toContain(429);
    });

    /**
     * AC-4: Verify the rate limiter skip function correctly identifies health endpoints
     * Tests that paths starting with /api/v1/health and /api/v1/ready are skipped
     */
    it("rate limiter skip function correctly identifies health endpoints", async () => {
      const mockHealth = {
        status: "ok",
        uptime: 1.0,
        version: expectedVersion,
      };
      const mockReady = { status: "ok" };

      const app = createTestAppWithSecurity();

      // Test that /api/v1/health endpoint is bypassed (skipped from rate limiting)
      healthService.getHealth.mockResolvedValue(mockHealth);
      const healthRes = await request(app).get("/api/v1/health");
      expect(healthRes.status).toBe(200);

      // Test that /api/v1/ready endpoint is bypassed (skipped from rate limiting)
      healthService.getReady.mockResolvedValue(mockReady);
      const readyRes = await request(app).get("/api/v1/ready");
      expect(readyRes.status).toBe(200);

      // Verify the skip function includes both /api/v1/health and /api/v1/ready paths
      // by checking they don't get rate limited even with multiple requests
      const paths = ["/api/v1/health", "/api/v1/ready"];
      for (const path of paths) {
        healthService.getHealth.mockResolvedValue(mockHealth);
        healthService.getReady.mockResolvedValue(mockReady);

        // Send 10 rapid requests to verify no 429
        for (let i = 0; i < 10; i++) {
          const res = await request(app).get(path);
          expect(res.status).toBe(200);
          expect(res.status).not.toBe(429);
        }
      }
    });

    /**
     * Regression test: Near-miss paths like /api/v1/health-check should still be rate limited
     * This verifies exact matching and prevents overly broad skip conditions
     */
    it("near-miss paths like /api/v1/health-check are still rate limited", async () => {
      const app = createTestAppWithSecurity();

      // Make rapid requests to a near-miss path that should NOT bypass rate limiting
      const responses = [];
      for (let i = 0; i < 105; i++) {
        // Note: this route doesn't exist, but the rate limiter should still trigger
        const res = await request(app).get("/api/v1/health-check");
        responses.push(res.status);
      }

      // Verify that at least one 429 response occurs (rate limit hit)
      const rateLimited = responses.filter((status) => status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    /**
     * Regression test: Trailing slashes should also bypass rate limiting
     * This verifies path normalization handles Express's default non-strict routing
     */
    it("health endpoint with trailing slash bypasses rate limiting", async () => {
      const mockHealth = {
        status: "ok",
        uptime: 5.0,
        version: expectedVersion,
      };

      const app = createTestAppWithSecurity();

      // Make 120 rapid requests to health endpoint with trailing slash
      const numRequests = 120;
      for (let i = 0; i < numRequests; i++) {
        healthService.getHealth.mockResolvedValueOnce(mockHealth);
      }

      const responses = [];
      for (let i = 0; i < numRequests; i++) {
        const res = await request(app).get("/api/v1/health/");
        responses.push(res.status);
      }

      // All responses should be 200, none should be 429 (too many requests)
      expect(responses).not.toContain(429);
    });

    /**
     * Regression test: Uppercase paths should also bypass rate limiting
     * This verifies path normalization handles Express's default case-insensitive routing
     */
    it("health endpoint with uppercase bypasses rate limiting", async () => {
      const mockHealth = {
        status: "ok",
        uptime: 5.0,
        version: expectedVersion,
      };

      const app = createTestAppWithSecurity();

      // Make 120 rapid requests to health endpoint with uppercase
      const numRequests = 120;
      for (let i = 0; i < numRequests; i++) {
        healthService.getHealth.mockResolvedValueOnce(mockHealth);
      }

      const responses = [];
      for (let i = 0; i < numRequests; i++) {
        const res = await request(app).get("/api/v1/Health");
        responses.push(res.status);
      }

      // All responses should be 200, none should be 429 (too many requests)
      expect(responses).not.toContain(429);
    });

    /**
     * Regression test: Ready endpoint with trailing slash and uppercase
     * Tests both normalizations together
     */
    it("ready endpoint with trailing slash and uppercase bypasses rate limiting", async () => {
      const mockReady = { status: "ok" };

      const app = createTestAppWithSecurity();

      // Make 120 rapid requests to ready endpoint with combined variations
      const numRequests = 120;
      for (let i = 0; i < numRequests; i++) {
        healthService.getReady.mockResolvedValueOnce(mockReady);
      }

      const responses = [];
      for (let i = 0; i < numRequests; i++) {
        const res = await request(app).get("/api/v1/READY/");
        responses.push(res.status);
      }

      // All responses should be 200, none should be 429 (too many requests)
      expect(responses).not.toContain(429);
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
