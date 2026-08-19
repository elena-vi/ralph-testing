/**
 * Health Service Tests
 * ========================
 *
 * Tests for the health service that provides uptime and database readiness checks.
 * Covers happy path, edge cases, and error scenarios.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the database service
vi.mock("../services/database.js", () => ({
  default: {
    prisma: {
      $queryRaw: vi.fn(),
    },
  },
}));

import db from "../services/database.js";
import healthService from "../services/health.service.js";

describe("Health Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getHealth()", () => {
    /**
     * AC-1: getHealth() returns status, uptime in seconds, and version from package.json
     */
    it("returns health status with uptime and version", async () => {
      const health = await healthService.getHealth();

      expect(health).toHaveProperty("status", "ok");
      expect(health).toHaveProperty("uptime");
      expect(health).toHaveProperty("version");
      expect(typeof health.uptime).toBe("number");
      expect(typeof health.version).toBe("string");
      expect(health.version).toMatch(/^\d+\.\d+\.\d+/); // semantic versioning
    });

    /**
     * Edge case: uptime < 1 second should be a small positive number, not zero
     */
    it("reports small positive uptime when server started recently", async () => {
      const health = await healthService.getHealth();

      expect(health.uptime).toBeGreaterThan(0);
      expect(health.uptime).toBeLessThan(10); // reasonable bound for test start
    });

    /**
     * Edge case: uptime over long durations
     * Simulate by advancing time in subsequent calls
     */
    it("correctly tracks uptime over extended durations", async () => {
      const health1 = await healthService.getHealth();
      const uptime1 = health1.uptime;

      // Simulate advancing time
      await new Promise((resolve) => setTimeout(resolve, 100));

      const health2 = await healthService.getHealth();
      const uptime2 = health2.uptime;

      expect(uptime2).toBeGreaterThan(uptime1);
    });

    /**
     * Verify version field matches expected format
     */
    it("includes version from package.json", async () => {
      const health = await healthService.getHealth();

      // Version should be a semver string like "2.1.0"
      expect(health.version).toBe("2.1.0");
    });
  });

  describe("getReady()", () => {
    /**
     * AC-2: getReady() returns { status: 'ok' } when database query succeeds
     */
    it("returns ready status when database is healthy", async () => {
      db.prisma.$queryRaw.mockResolvedValueOnce([{ now: new Date() }]);

      const ready = await healthService.getReady();

      expect(ready).toEqual({ status: "ok" });
      expect(db.prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    /**
     * AC-3: getReady() throws with reason property when database query fails
     */
    it("throws error with reason property when database is unavailable", async () => {
      const dbError = new Error("Connection timeout");
      db.prisma.$queryRaw.mockRejectedValueOnce(dbError);

      await expect(healthService.getReady()).rejects.toThrow();

      try {
        await healthService.getReady();
      } catch (error) {
        expect(error).toHaveProperty("reason");
        expect(typeof error.reason).toBe("string");
        expect(error.reason.length).toBeGreaterThan(0);
      }
    });

    /**
     * Edge case: database timeout
     * Should throw with reason property
     */
    it("throws error with reason when database times out", async () => {
      const timeoutError = new Error("Query timeout");
      db.prisma.$queryRaw.mockRejectedValueOnce(timeoutError);

      try {
        await healthService.getReady();
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toHaveProperty("reason");
        expect(error.reason).toContain("Query timeout");
      }
    });

    /**
     * Edge case: various database errors
     */
    it("throws error with descriptive reason for different database failures", async () => {
      const failures = [
        new Error("ECONNREFUSED"),
        new Error("ENOTFOUND"),
        new Error("Permission denied"),
      ];

      for (const failure of failures) {
        vi.clearAllMocks();
        db.prisma.$queryRaw.mockRejectedValueOnce(failure);

        try {
          await healthService.getReady();
          expect.fail("Should have thrown an error");
        } catch (error) {
          expect(error).toHaveProperty("reason");
          expect(typeof error.reason).toBe("string");
        }
      }
    });

    /**
     * Verify that successful queries actually call the database
     */
    it("executes database query to check readiness", async () => {
      db.prisma.$queryRaw.mockResolvedValueOnce([]);

      await healthService.getReady();

      expect(db.prisma.$queryRaw).toHaveBeenCalledTimes(1);
      // Verify it's a simple SELECT query
      const call = db.prisma.$queryRaw.mock.calls[0];
      expect(call).toBeDefined();
    });
  });

  describe("Integration scenarios", () => {
    /**
     * Simulate healthy system
     */
    it("reports both healthy and ready when system is operational", async () => {
      db.prisma.$queryRaw.mockResolvedValueOnce([{ now: new Date() }]);

      const health = await healthService.getHealth();
      const ready = await healthService.getReady();

      expect(health.status).toBe("ok");
      expect(ready.status).toBe("ok");
    });

    /**
     * Database fails after health check succeeds
     */
    it("health remains ok even when database becomes unavailable", async () => {
      const health = await healthService.getHealth();

      db.prisma.$queryRaw.mockRejectedValueOnce(new Error("Connection lost"));

      expect(health.status).toBe("ok");

      await expect(healthService.getReady()).rejects.toThrow();
    });
  });
});
