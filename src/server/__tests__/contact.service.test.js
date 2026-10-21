/**
 * Contact Service Tests
 * =====================
 *
 * Tests for the contact service, including pagination functionality.
 * Tests mock Prisma via vi.mock to avoid requiring a live database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module before importing the service
vi.mock("../services/database.js", () => ({
  default: {
    prisma: {
      contact: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  },
}));

// Import after mocks are set up
import db from "../services/database.js";
import contactService from "../services/contact.service.js";

describe("ContactService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findAllPaginated", () => {
    const mockContacts = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      firstName: `Contact${i + 1}`,
      lastName: `Last${i + 1}`,
      email: `contact${i + 1}@example.com`,
      phone: null,
      company: null,
      notes: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    }));

    /**
     * Test default pagination (page 1, pageSize 20)
     */
    it("returns first page with default parameters", async () => {
      db.prisma.contact.findMany.mockResolvedValue(mockContacts.slice(0, 20));
      db.prisma.contact.count.mockResolvedValue(50);

      const result = await contactService.findAllPaginated(1, 20);

      expect(result.records).toHaveLength(20);
      expect(result.total).toBe(50);
      expect(result.clampedPageSize).toBe(20);
      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
      });
    });

    /**
     * Test second page with specific pageSize
     */
    it("returns second page with specified pageSize", async () => {
      db.prisma.contact.findMany.mockResolvedValue(mockContacts.slice(10, 20));
      db.prisma.contact.count.mockResolvedValue(50);

      const result = await contactService.findAllPaginated(2, 10);

      expect(result.records).toHaveLength(10);
      expect(result.total).toBe(50);
      expect(result.clampedPageSize).toBe(10);
      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
      });
    });

    /**
     * Test pageSize clamping to 100
     */
    it("clamps pageSize to 100 when larger value is provided", async () => {
      db.prisma.contact.findMany.mockResolvedValue(mockContacts.slice(0, 100));
      db.prisma.contact.count.mockResolvedValue(50);

      const result = await contactService.findAllPaginated(1, 150);

      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 100,
      });
      expect(result.total).toBe(50);
      expect(result.clampedPageSize).toBe(100);
    });

    /**
     * Test pageSize exactly at upper bound
     */
    it("accepts pageSize of exactly 100", async () => {
      db.prisma.contact.findMany.mockResolvedValue(mockContacts);
      db.prisma.contact.count.mockResolvedValue(50);

      const result = await contactService.findAllPaginated(1, 100);

      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 100,
      });
      expect(result.total).toBe(50);
      expect(result.clampedPageSize).toBe(100);
    });

    /**
     * Test pageSize of 99
     */
    it("accepts pageSize of 99", async () => {
      db.prisma.contact.findMany.mockResolvedValue(mockContacts.slice(0, 49));
      db.prisma.contact.count.mockResolvedValue(50);

      const result = await contactService.findAllPaginated(1, 99);

      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 99,
      });
      expect(result.total).toBe(50);
      expect(result.clampedPageSize).toBe(99);
    });

    /**
     * Test page beyond available data
     */
    it("returns empty records for page beyond available data", async () => {
      db.prisma.contact.findMany.mockResolvedValue([]);
      db.prisma.contact.count.mockResolvedValue(50);

      const result = await contactService.findAllPaginated(10, 20);

      expect(result.records).toHaveLength(0);
      expect(result.total).toBe(50);
      expect(result.clampedPageSize).toBe(20);
      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 180,
        take: 20,
      });
    });

    /**
     * Test empty result set
     */
    it("returns zero total when no contacts exist", async () => {
      db.prisma.contact.findMany.mockResolvedValue([]);
      db.prisma.contact.count.mockResolvedValue(0);

      const result = await contactService.findAllPaginated(1, 20);

      expect(result.records).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.clampedPageSize).toBe(20);
    });

    /**
     * Test correct skip calculation
     */
    it("calculates skip correctly for various pages", async () => {
      db.prisma.contact.findMany.mockResolvedValue([]);
      db.prisma.contact.count.mockResolvedValue(50);

      // Page 3, pageSize 15 should skip 30 records
      const result = await contactService.findAllPaginated(3, 15);
      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 30,
        take: 15,
      });
      expect(result.clampedPageSize).toBe(15);
    });

    /**
     * Test total count is always accurate
     */
    it("includes accurate total count regardless of page size", async () => {
      db.prisma.contact.findMany.mockResolvedValue(mockContacts.slice(0, 10));
      db.prisma.contact.count.mockResolvedValue(50);

      const result = await contactService.findAllPaginated(1, 10);

      expect(result.total).toBe(50);
      expect(result.records).toHaveLength(10);
      expect(result.clampedPageSize).toBe(10);
    });

    /**
     * Test response structure
     */
    it("returns object with records, total, and clampedPageSize properties", async () => {
      db.prisma.contact.findMany.mockResolvedValue(mockContacts.slice(0, 20));
      db.prisma.contact.count.mockResolvedValue(50);

      const result = await contactService.findAllPaginated(1, 20);

      expect(result).toHaveProperty("records");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("clampedPageSize");
      expect(Array.isArray(result.records)).toBe(true);
      expect(typeof result.total).toBe("number");
      expect(typeof result.clampedPageSize).toBe("number");
    });
  });
});
