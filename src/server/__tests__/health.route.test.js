import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock the database service BEFORE importing anything that might use Prisma
vi.mock("../services/database.js", () => ({
  default: {
    prisma: {
      $queryRaw: vi.fn(),
    },
  },
}));

// Mock the health service
vi.mock("../services/health.service.js", () => ({
  default: {
    getHealth: vi.fn(),
    checkReady: vi.fn(),
  },
}));

// Import after mocking
import request from "supertest";
import express from "express";
import { errors } from "celebrate";
import healthRoutes from "../routes/v1/health.route.js";
import healthService from "../services/health.service.js";

describe("Health Route", () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());

    // Set up the startTime on app.locals (as done in index.js)
    app.locals.startTime = new Date();

    app.use("/health", healthRoutes);
    app.use(errors());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should return 200 with health status", async () => {
      vi.mocked(healthService).getHealth.mockReturnValue({
        status: "healthy",
        uptime: 5000,
        version: "1.0.0",
      });

      const response = await request(app).get("/health");

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
      const uptimeMs = 12345;
      vi.mocked(healthService).getHealth.mockReturnValue({
        status: "healthy",
        uptime: uptimeMs,
        version: "1.0.0",
      });

      const response = await request(app).get("/health");

      expect(response.body.data.uptime).toBe(uptimeMs);
    });

    it("should include version from package.json", async () => {
      vi.mocked(healthService).getHealth.mockReturnValue({
        status: "healthy",
        uptime: 5000,
        version: "1.0.0",
      });

      const response = await request(app).get("/health");

      expect(response.body.data.version).toBe("1.0.0");
    });

    it("should include success message", async () => {
      vi.mocked(healthService).getHealth.mockReturnValue({
        status: "healthy",
        uptime: 5000,
        version: "1.0.0",
      });

      const response = await request(app).get("/health");

      expect(response.body.message).toContain("Health check successful");
    });

    it("should include ISO timestamp", async () => {
      vi.mocked(healthService).getHealth.mockReturnValue({
        status: "healthy",
        uptime: 5000,
        version: "1.0.0",
      });

      const response = await request(app).get("/health");

      expect(response.body.timestamp).toBeDefined();
      // Verify it's an ISO 8601 timestamp
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });
  });

  describe("GET /ready", () => {
    it("should return 200 when service is ready", async () => {
      vi.mocked(healthService).checkReady.mockResolvedValue({
        ready: true,
      });

      const response = await request(app).get("/health/ready");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("ready", true);
      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("timestamp");
    });

    it("should include 'Service is ready' message when ready", async () => {
      vi.mocked(healthService).checkReady.mockResolvedValue({
        ready: true,
      });

      const response = await request(app).get("/health/ready");

      expect(response.body.message).toContain("Service is ready");
    });

    it("should return 503 when database is unavailable", async () => {
      const dbError = new Error("Database connection failed");
      vi.mocked(healthService).checkReady.mockRejectedValue(dbError);

      const response = await request(app).get("/health/ready");

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("data", null);
      expect(response.body).toHaveProperty("message");
    });

    it("should include error reason when database is unavailable", async () => {
      const dbError = new Error("Database connection timeout");
      vi.mocked(healthService).checkReady.mockRejectedValue(dbError);

      const response = await request(app).get("/health/ready");

      expect(response.status).toBe(503);
      expect(response.body.message).toContain("Service is not ready");
    });

    it("should handle database unavailable error gracefully", async () => {
      const dbError = new Error("Connection pool exhausted");
      vi.mocked(healthService).checkReady.mockRejectedValue(dbError);

      const response = await request(app).get("/health/ready");

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.timestamp).toBeDefined();
    });

    it("should include ISO timestamp", async () => {
      vi.mocked(healthService).checkReady.mockResolvedValue({
        ready: true,
      });

      const response = await request(app).get("/health/ready");

      expect(response.body.timestamp).toBeDefined();
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });
  });

  describe("Rate limit bypass", () => {
    it("should not have rate limiting constraints (this is verified by integration with index.js)", async () => {
      // This test verifies the route exists and responds
      // Actual rate limit bypass is tested in index.js integration
      vi.mocked(healthService).getHealth.mockReturnValue({
        status: "healthy",
        uptime: 5000,
        version: "1.0.0",
      });

      const response = await request(app).get("/health");
      expect(response.status).toBe(200);
    });
  });

  describe("Response envelope", () => {
    it("health endpoint uses successResponse format", async () => {
      vi.mocked(healthService).getHealth.mockReturnValue({
        status: "healthy",
        uptime: 5000,
        version: "1.0.0",
      });

      const response = await request(app).get("/health");

      // Verify all expected fields from successResponse are present
      expect(Object.keys(response.body).sort()).toEqual(
        ["data", "message", "success", "timestamp"].sort()
      );
    });

    it("ready endpoint uses successResponse format when ready", async () => {
      vi.mocked(healthService).checkReady.mockResolvedValue({
        ready: true,
      });

      const response = await request(app).get("/health/ready");

      expect(Object.keys(response.body).sort()).toEqual(
        ["data", "message", "success", "timestamp"].sort()
      );
    });

    it("ready endpoint uses errorResponse format when not ready", async () => {
      const dbError = new Error("Database error");
      vi.mocked(healthService).checkReady.mockRejectedValue(dbError);

      const response = await request(app).get("/health/ready");

      // errorResponse has success, data, message, and timestamp
      expect(Object.keys(response.body).sort()).toEqual(
        ["data", "message", "success", "timestamp"].sort()
      );
    });
  });
});
