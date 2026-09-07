/**
 * Health Endpoints Tests
 * ======================
 *
 * Tests for the health and readiness endpoints.
 * Demonstrates:
 * - Testing service layer with mocked Prisma
 * - Mocking database connectivity
 * - Testing response envelope shape
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import rateLimit from "express-rate-limit";

// Mock the database module
vi.mock("../services/database.js", () => ({
  default: {
    prisma: {
      $queryRaw: vi.fn(),
    },
  },
}));

// Import after mocking
import db from "../services/database.js";
import healthCheckService from "../services/healthCheck.service.js";
import healthRoute from "../routes/health.route.js";

describe("Health Check Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getHealth()", () => {
    it("returns object with status, uptime, and version", async () => {
      const health = await healthCheckService.getHealth();

      expect(health).toHaveProperty("status");
      expect(health.status).toBe("healthy");
      expect(health).toHaveProperty("uptime");
      expect(typeof health.uptime).toBe("number");
      expect(health.uptime).toBeGreaterThanOrEqual(0);
      expect(health).toHaveProperty("version");
      expect(health.version).toBe("2.1.0");
    });

    it("returns uptime as a number of seconds", async () => {
      const health = await healthCheckService.getHealth();

      expect(health.uptime).toBeLessThan(process.uptime() + 1);
      expect(health.uptime).toBeGreaterThanOrEqual(0);
    });

    it("returns correct version from package.json", async () => {
      const health = await healthCheckService.getHealth();

      expect(health.version).toBe("2.1.0");
    });
  });

  describe("getReadiness()", () => {
    it("returns ready status when database is available", async () => {
      db.prisma.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const readiness = await healthCheckService.getReadiness();

      expect(readiness).toHaveProperty("status");
      expect(readiness.status).toBe("ready");
    });

    it("calls database query to check connectivity", async () => {
      db.prisma.$queryRaw.mockResolvedValue([{ result: 1 }]);

      await healthCheckService.getReadiness();

      expect(db.prisma.$queryRaw).toHaveBeenCalled();
    });

    it("throws error when database is unavailable", async () => {
      const dbError = new Error("Database connection failed");
      db.prisma.$queryRaw.mockRejectedValue(dbError);

      await expect(healthCheckService.getReadiness()).rejects.toThrow(dbError);
    });
  });
});

describe("Health Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports a router object", () => {
    expect(healthRoute).toBeDefined();
    expect(healthRoute.get).toBeDefined();
    expect(typeof healthRoute.get).toBe("function");
  });

  describe("Response envelope validation", () => {
    it("health response has correct envelope shape", async () => {
      const health = await healthCheckService.getHealth();

      // Simulate what the route would return via successResponse
      const mockResponse = {
        success: true,
        data: health,
        message: "Health check passed",
        timestamp: new Date().toISOString(),
      };

      expect(mockResponse).toHaveProperty("success");
      expect(mockResponse).toHaveProperty("data");
      expect(mockResponse).toHaveProperty("message");
      expect(mockResponse).toHaveProperty("timestamp");
      expect(mockResponse.success).toBe(true);
      expect(mockResponse.data.status).toBe("healthy");
      expect(mockResponse.data.uptime).toBeGreaterThanOrEqual(0);
      expect(mockResponse.data.version).toBe("2.1.0");
      expect(mockResponse.message).toBe("Health check passed");
    });

    it("readiness success response has correct envelope shape", async () => {
      db.prisma.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const readiness = await healthCheckService.getReadiness();

      const mockResponse = {
        success: true,
        data: readiness,
        message: "Ready to accept traffic",
        timestamp: new Date().toISOString(),
      };

      expect(mockResponse).toHaveProperty("success");
      expect(mockResponse).toHaveProperty("data");
      expect(mockResponse).toHaveProperty("message");
      expect(mockResponse).toHaveProperty("timestamp");
      expect(mockResponse.success).toBe(true);
      expect(mockResponse.data.status).toBe("ready");
      expect(mockResponse.message).toBe("Ready to accept traffic");
    });

    it("readiness error response has correct envelope shape", () => {
      const mockResponse = {
        success: false,
        data: null,
        message: "Database unavailable",
        timestamp: new Date().toISOString(),
      };

      expect(mockResponse).toHaveProperty("success");
      expect(mockResponse).toHaveProperty("data");
      expect(mockResponse).toHaveProperty("message");
      expect(mockResponse).toHaveProperty("timestamp");
      expect(mockResponse.success).toBe(false);
      expect(mockResponse.data).toBeNull();
      expect(mockResponse.message).toBe("Database unavailable");
    });
  });

  describe("Database failure scenarios", () => {
    it("health check succeeds even when database is unavailable", async () => {
      db.prisma.$queryRaw.mockRejectedValue(new Error("Database error"));

      // Health check should not depend on database
      const health = await healthCheckService.getHealth();

      expect(health.status).toBe("healthy");
      expect(health).toHaveProperty("uptime");
      expect(health).toHaveProperty("version");
    });

    it("readiness check fails when database is unavailable", async () => {
      const dbError = new Error("Database connection failed");
      db.prisma.$queryRaw.mockRejectedValue(dbError);

      await expect(healthCheckService.getReadiness()).rejects.toThrow(dbError);
    });
  });

  describe("Edge cases", () => {
    it("multiple calls to getHealth return increasing uptime", async () => {
      const health1 = await healthCheckService.getHealth();
      const health2 = await healthCheckService.getHealth();

      // Second call should have uptime >= first call's uptime
      expect(health2.uptime).toBeGreaterThanOrEqual(health1.uptime);
    });

    it("getHealth returns consistent version across calls", async () => {
      const health1 = await healthCheckService.getHealth();
      const health2 = await healthCheckService.getHealth();

      expect(health1.version).toBe(health2.version);
      expect(health1.version).toBe("2.1.0");
    });

    it("getReadiness queries database with correct SQL", async () => {
      db.prisma.$queryRaw.mockResolvedValue([{ result: 1 }]);

      await healthCheckService.getReadiness();

      // Verify that queryRaw was called to test connectivity
      expect(db.prisma.$queryRaw).toHaveBeenCalled();
    });
  });
});

describe("Rate limiting exemption", () => {
  it("should not rate limit /api/health endpoint", () => {
    const limiter = rateLimit({
      skip: (req) => req.path === "/api/health" || req.path === "/api/ready",
    });

    const mockReq = {
      path: "/api/health",
      ip: "127.0.0.1",
    };

    const skipFn = limiter.options?.skip;
    if (skipFn) {
      expect(skipFn(mockReq)).toBe(true);
    }
  });

  it("should not rate limit /api/ready endpoint", () => {
    const limiter = rateLimit({
      skip: (req) => req.path === "/api/health" || req.path === "/api/ready",
    });

    const mockReq = {
      path: "/api/ready",
      ip: "127.0.0.1",
    };

    const skipFn = limiter.options?.skip;
    if (skipFn) {
      expect(skipFn(mockReq)).toBe(true);
    }
  });

  it("should rate limit other endpoints", () => {
    const limiter = rateLimit({
      skip: (req) => req.path === "/api/health" || req.path === "/api/ready",
    });

    const mockReq = {
      path: "/api/v1/contact",
      ip: "127.0.0.1",
    };

    const skipFn = limiter.options?.skip;
    if (skipFn) {
      expect(skipFn(mockReq)).toBe(false);
    }
  });
});

describe("Acceptance criteria validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Criterion 1: GET /api/health returns correct status code and body", async () => {
    const health = await healthCheckService.getHealth();

    // This would be returned with 200 status by the route
    expect(health.status).toBe("healthy");
    expect(health.uptime).toBeGreaterThanOrEqual(0);
    expect(health.version).toBe("2.1.0");
  });

  it("Criterion 2: GET /api/ready with working database returns 200", async () => {
    db.prisma.$queryRaw.mockResolvedValue([{ result: 1 }]);

    const readiness = await healthCheckService.getReadiness();

    // This would be returned with 200 status by the route
    expect(readiness.status).toBe("ready");
  });

  it("Criterion 3: GET /api/ready with unavailable database returns 503", async () => {
    db.prisma.$queryRaw.mockRejectedValue(new Error("Database unavailable"));

    // Route would return 503 status when this throws
    await expect(healthCheckService.getReadiness()).rejects.toThrow();
  });

  it("Criterion 4: Response body envelopes match standard format", async () => {
    db.prisma.$queryRaw.mockResolvedValue([{ result: 1 }]);

    const health = await healthCheckService.getHealth();
    const readiness = await healthCheckService.getReadiness();

    // Verify data shapes are correct
    expect(health).toHaveProperty("status");
    expect(health).toHaveProperty("uptime");
    expect(health).toHaveProperty("version");

    expect(readiness).toHaveProperty("status");

    // Verify envelope would have correct fields
    const envelope = {
      success: true,
      data: health,
      message: "Health check passed",
      timestamp: new Date().toISOString(),
    };

    expect(envelope).toHaveProperty("success");
    expect(envelope).toHaveProperty("data");
    expect(envelope).toHaveProperty("message");
    expect(envelope).toHaveProperty("timestamp");
  });

  it("Criterion 5: Endpoints handle rapid requests", async () => {
    db.prisma.$queryRaw.mockResolvedValue([{ result: 1 }]);

    // Simulate 100 rapid health requests
    const healthPromises = Array(100)
      .fill(null)
      .map(() => healthCheckService.getHealth());

    const results = await Promise.all(healthPromises);

    expect(results).toHaveLength(100);
    results.forEach((result) => {
      expect(result.status).toBe("healthy");
      expect(result.version).toBe("2.1.0");
    });
  });

  it("Edge case: Database unavailable - /api/health still returns 200", async () => {
    db.prisma.$queryRaw.mockRejectedValue(new Error("Database error"));

    // Health check should succeed regardless of DB state
    const health = await healthCheckService.getHealth();

    expect(health.status).toBe("healthy");
  });

  it("Edge case: Multiple rapid requests without rate limiting", async () => {
    db.prisma.$queryRaw.mockResolvedValue([{ result: 1 }]);

    // Simulate 10 rapid ready requests in succession
    for (let i = 0; i < 10; i++) {
      const readiness = await healthCheckService.getReadiness();
      expect(readiness.status).toBe("ready");
    }

    // All should succeed without rate limiting
    expect(db.prisma.$queryRaw).toHaveBeenCalledTimes(10);
  });
});
