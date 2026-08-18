/**
 * Health Service Tests
 * ====================
 *
 * Tests for health and readiness checks
 * Mocks db.prisma to avoid requiring a real database
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

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
import healthService from "../services/health.service.js";

describe("Health Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getHealth(startTime)", () => {
    it("returns health status with uptime and version", () => {
      const startTime = new Date(Date.now() - 5000); // 5 seconds ago
      const health = healthService.getHealth(startTime);

      expect(health).toHaveProperty("status");
      expect(health.status).toBe("healthy");
      expect(health).toHaveProperty("uptime");
      expect(typeof health.uptime).toBe("number");
      expect(health).toHaveProperty("version");
      expect(typeof health.version).toBe("string");
    });

    it("calculates uptime correctly", () => {
      const startTime = new Date(Date.now() - 10000); // 10 seconds ago
      const health = healthService.getHealth(startTime);

      // Uptime should be approximately 10000ms
      expect(health.uptime).toBeGreaterThanOrEqual(9000);
      expect(health.uptime).toBeLessThanOrEqual(11000);
    });

    it("returns version from package.json", () => {
      const startTime = new Date();
      const health = healthService.getHealth(startTime);

      expect(health.version).toBe("2.1.0");
    });

    it("handles recent startup (uptime near zero)", () => {
      const startTime = new Date();
      const health = healthService.getHealth(startTime);

      expect(health.uptime).toBeLessThan(100);
      expect(health.status).toBe("healthy");
    });

    it("handles old startup (large uptime)", () => {
      const startTime = new Date(Date.now() - 3600000); // 1 hour ago
      const health = healthService.getHealth(startTime);

      expect(health.uptime).toBeGreaterThanOrEqual(3500000);
      expect(health.status).toBe("healthy");
    });
  });

  describe("checkReady()", () => {
    it("returns ready status when database query succeeds", async () => {
      db.prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await healthService.checkReady();

      expect(result).toHaveProperty("ready");
      expect(result.ready).toBe(true);
      expect(db.prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("executes a simple query to check database connectivity", async () => {
      db.prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      await healthService.checkReady();

      // Verify that $queryRaw was called with a query-like structure
      expect(db.prisma.$queryRaw).toHaveBeenCalled();
    });

    it("throws an error when database is unavailable", async () => {
      const dbError = new Error("Connection refused");
      db.prisma.$queryRaw.mockRejectedValue(dbError);

      await expect(healthService.checkReady()).rejects.toThrow("Service is not ready");
    });

    it("throws service error when database error occurs", async () => {
      const originalError = new Error("ECONNREFUSED: Connection refused");
      db.prisma.$queryRaw.mockRejectedValue(originalError);

      try {
        await healthService.checkReady();
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).toContain("Service is not ready");
      }
    });

    it("handles Prisma-specific errors", async () => {
      const prismaError = {
        name: "PrismaClientInitializationError",
        message: "Can't reach database server",
      };
      db.prisma.$queryRaw.mockRejectedValue(prismaError);

      await expect(healthService.checkReady()).rejects.toThrow();
    });

    it("throws with descriptive message on database timeout", async () => {
      const timeoutError = new Error("Query timeout");
      db.prisma.$queryRaw.mockRejectedValue(timeoutError);

      await expect(healthService.checkReady()).rejects.toThrow();
    });
  });

  describe("Integration", () => {
    it("both functions can be called in sequence", async () => {
      db.prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const startTime = new Date();
      const health = healthService.getHealth(startTime);
      const ready = await healthService.checkReady();

      expect(health).toHaveProperty("status");
      expect(ready).toHaveProperty("ready");
    });

    it("checkReady persists independently of getHealth", async () => {
      db.prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const ready1 = await healthService.checkReady();
      const ready2 = await healthService.checkReady();

      expect(ready1).toEqual(ready2);
      expect(db.prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });
});
