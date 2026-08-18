import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock the database service BEFORE importing anything that might use Prisma
vi.mock("../services/database.js", () => ({
  default: {
    prisma: {
      $queryRaw: vi.fn(),
    },
  },
}));

// Import after mocking the database
import request from "supertest";
import express from "express";
import { errors } from "celebrate";
import healthRoutes from "../routes/v1/health.route.js";
import readyRoutes from "../routes/v1/ready.route.js";
import rateLimit from "express-rate-limit";
import db from "../services/database.js";

describe("Health and Ready Routes", () => {
  let appWithoutRateLimit;
  let appWithRateLimit;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a fresh Express app for each test WITHOUT rate limiting
    appWithoutRateLimit = express();
    appWithoutRateLimit.use(express.json());
    appWithoutRateLimit.locals = {};
    appWithoutRateLimit.locals.startTime = new Date();

    appWithoutRateLimit.use("/health", healthRoutes);
    appWithoutRateLimit.use("/ready", readyRoutes);
    appWithoutRateLimit.use(errors());

    // Create a fresh Express app WITH rate limiting for rate limit bypass tests
    appWithRateLimit = express();
    appWithRateLimit.use(express.json());
    appWithRateLimit.locals = {};
    appWithRateLimit.locals.startTime = new Date();

    // Apply rate limiter BEFORE health/ready routes (simulating actual server setup)
    // This means if we mounted health/ready AFTER rate limiter, they'd be protected
    // But since we mount them BEFORE in actual server, they bypass the limiter
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      skip: (req) => {
        // Skip rate limiting for health and ready endpoints
        return req.path === "/health" || req.path === "/ready";
      },
    });

    appWithRateLimit.use("/health", healthRoutes);
    appWithRateLimit.use("/ready", readyRoutes);
    appWithRateLimit.use(limiter);
    appWithRateLimit.use(errors());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should return 200 with health status", async () => {
      const response = await request(appWithoutRateLimit).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("status", "healthy");
      expect(response.body.data).toHaveProperty("uptime");
      expect(response.body.data).toHaveProperty("version");
      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("timestamp");
    });

    it("should include correct uptime value", async () => {
      const beforeCall = new Date();
      const response = await request(appWithoutRateLimit).get("/health");
      const afterCall = new Date();

      expect(response.body.data.uptime).toBeGreaterThanOrEqual(0);
      expect(response.body.data.uptime).toBeLessThanOrEqual(
        afterCall.getTime() - beforeCall.getTime() + 100
      );
    });

    it("should include version from package.json", async () => {
      const response = await request(appWithoutRateLimit).get("/health");

      expect(response.body.data.version).toBeDefined();
      // Version should follow semantic versioning pattern
      expect(response.body.data.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it("should include success message", async () => {
      const response = await request(appWithoutRateLimit).get("/health");

      expect(response.body.message).toContain("Health check successful");
    });

    it("should include ISO timestamp", async () => {
      const response = await request(appWithoutRateLimit).get("/health");

      expect(response.body.timestamp).toBeDefined();
      // Verify it's an ISO 8601 timestamp
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });
  });

  describe("GET /ready", () => {
    it("should return 200 when service is ready", async () => {
      // Mock the database to succeed
      vi.mocked(db.prisma).$queryRaw.mockResolvedValue([]);

      const response = await request(appWithoutRateLimit).get("/ready");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("ready", true);
      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("timestamp");
    });

    it("should include 'Service is ready' message when ready", async () => {
      // Mock the database to succeed
      vi.mocked(db.prisma).$queryRaw.mockResolvedValue([]);

      const response = await request(appWithoutRateLimit).get("/ready");

      expect(response.body.message).toContain("Service is ready");
    });

    it("should return 503 when database is unavailable", async () => {
      // Mock the database to fail
      const dbError = new Error("Database connection failed");
      vi.mocked(db.prisma).$queryRaw.mockRejectedValue(dbError);

      const response = await request(appWithoutRateLimit).get("/ready");

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("data", null);
      expect(response.body).toHaveProperty("message");
    });

    it("should include original error reason field when database is unavailable", async () => {
      // Mock the database to fail with a specific error message
      const dbError = new Error("Database connection timeout");
      vi.mocked(db.prisma).$queryRaw.mockRejectedValue(dbError);

      const response = await request(appWithoutRateLimit).get("/ready");

      expect(response.status).toBe(503);
      expect(response.body.message).toContain("Service is not ready");
      expect(response.body).toHaveProperty("reason");
      // The service wraps the error with cause, so reason should be the original error message
      expect(response.body.reason).toBe("Database connection timeout");
    });

    it("should include correct original error reason in error response with cause syntax", async () => {
      // Mock the database to fail with a specific error
      const dbError = new Error("Connection pool exhausted");
      vi.mocked(db.prisma).$queryRaw.mockRejectedValue(dbError);

      const response = await request(appWithoutRateLimit).get("/ready");

      expect(response.status).toBe(503);
      // The reason should be the original database error message via cause syntax
      expect(response.body.reason).toBe("Connection pool exhausted");
    });

    it("should handle database unavailable error gracefully", async () => {
      // Mock the database to fail
      const dbError = new Error("Connection refused");
      vi.mocked(db.prisma).$queryRaw.mockRejectedValue(dbError);

      const response = await request(appWithoutRateLimit).get("/ready");

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.reason).toBe("Connection refused");
    });

    it("should include ISO timestamp", async () => {
      // Mock the database to succeed
      vi.mocked(db.prisma).$queryRaw.mockResolvedValue([]);

      const response = await request(appWithoutRateLimit).get("/ready");

      expect(response.body.timestamp).toBeDefined();
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });
  });

  describe("Rate limit bypass", () => {
    it("should bypass rate limiting and handle 100+ rapid requests to health endpoint", async () => {
      // Make 120 rapid requests to health endpoint
      const requests = [];
      for (let i = 0; i < 120; i++) {
        requests.push(request(appWithRateLimit).get("/health"));
      }

      const responses = await Promise.all(requests);

      // All requests should return 200, not 429 (rate limited)
      const allSuccess = responses.every((res) => res.status === 200);
      expect(allSuccess).toBe(true);

      // Verify no 429 responses
      const rateLimitedResponses = responses.filter((res) => res.status === 429);
      expect(rateLimitedResponses.length).toBe(0);
    });

    it("should bypass rate limiting and handle 100+ rapid requests to ready endpoint", async () => {
      // Mock the database to succeed
      vi.mocked(db.prisma).$queryRaw.mockResolvedValue([]);

      // Make 120 rapid requests to ready endpoint
      const requests = [];
      for (let i = 0; i < 120; i++) {
        requests.push(request(appWithRateLimit).get("/ready"));
      }

      const responses = await Promise.all(requests);

      // All requests should return 200, not 429 (rate limited)
      const allSuccess = responses.every((res) => res.status === 200);
      expect(allSuccess).toBe(true);

      // Verify no 429 responses
      const rateLimitedResponses = responses.filter((res) => res.status === 429);
      expect(rateLimitedResponses.length).toBe(0);
    });
  });

  describe("Separate endpoint paths", () => {
    it("/health endpoint should be available at /health path", async () => {
      const response = await request(appWithoutRateLimit).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("/ready endpoint should be available at /ready path (not /health/ready)", async () => {
      // Mock the database to succeed
      vi.mocked(db.prisma).$queryRaw.mockResolvedValue([]);

      const response = await request(appWithoutRateLimit).get("/ready");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("/health/ready should not exist (ready is at /ready, not nested)", async () => {
      const response = await request(appWithoutRateLimit).get("/health/ready");

      // Should get a 404 because /ready is not nested under /health
      expect(response.status).toBe(404);
    });
  });

  describe("Response envelope", () => {
    it("health endpoint uses successResponse format", async () => {
      const response = await request(appWithoutRateLimit).get("/health");

      // Verify all expected fields from successResponse are present
      expect(Object.keys(response.body).sort()).toEqual(
        ["data", "message", "success", "timestamp"].sort()
      );
    });

    it("ready endpoint uses successResponse format when ready", async () => {
      // Mock the database to succeed
      vi.mocked(db.prisma).$queryRaw.mockResolvedValue([]);

      const response = await request(appWithoutRateLimit).get("/ready");

      expect(Object.keys(response.body).sort()).toEqual(
        ["data", "message", "success", "timestamp"].sort()
      );
    });

    it("ready endpoint uses errorResponse format when not ready", async () => {
      // Mock the database to fail
      const dbError = new Error("Database error");
      vi.mocked(db.prisma).$queryRaw.mockRejectedValue(dbError);

      const response = await request(appWithoutRateLimit).get("/ready");

      // errorResponse has success, data, message, timestamp, and reason (when provided)
      expect(Object.keys(response.body).sort()).toEqual(
        ["data", "message", "reason", "success", "timestamp"].sort()
      );
    });
  });
});
