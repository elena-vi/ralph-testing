/**
 * Contact Service Tests
 * =====================
 *
 * Tests for the ContactService class, including pagination.
 * Uses vi.mock to mock the database without requiring a PostgreSQL instance.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import contactService from "../services/contact.service.js";

// Mock the database module
vi.mock("../services/database.js", () => ({
  default: {
    prisma: {
      contact: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  },
}));

// Import mocked database after mocking
import db from "../services/database.js";

describe("ContactService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("findPaginated", () => {
    /**
     * Test: Happy path with page=1, pageSize=20
     */
    it("returns paginated contacts with correct skip and total count", async () => {
      const mockContacts = [
        { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" },
        { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
      ];

      db.prisma.contact.findMany.mockResolvedValue(mockContacts);
      db.prisma.contact.count.mockResolvedValue(50);

      const result = await contactService.findPaginated(1, 20);

      expect(result).toEqual({ data: mockContacts, total: 50 });
      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
      });
      expect(db.prisma.contact.count).toHaveBeenCalled();
    });

    /**
     * Test: Page 2 calculates skip correctly
     */
    it("calculates skip as (page - 1) * pageSize for page 2", async () => {
      db.prisma.contact.findMany.mockResolvedValue([
        { id: 21, firstName: "Alice", lastName: "Johnson", email: "alice@example.com" },
        { id: 22, firstName: "Bob", lastName: "Williams", email: "bob@example.com" },
      ]);
      db.prisma.contact.count.mockResolvedValue(50);

      const result = await contactService.findPaginated(2, 20);

      expect(result.total).toBe(50);
      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 20,
        take: 20,
      });
    });

    /**
     * Test: pageSize is clamped to max of 100
     */
    it("clamps pageSize to max 100", async () => {
      db.prisma.contact.findMany.mockResolvedValue([]);
      db.prisma.contact.count.mockResolvedValue(150);

      await contactService.findPaginated(1, 150);

      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 100,
      });
    });

    /**
     * Test: Returns empty data when page is beyond available data
     */
    it("returns empty array when page exceeds available data", async () => {
      db.prisma.contact.findMany.mockResolvedValue([]);
      db.prisma.contact.count.mockResolvedValue(20);

      const result = await contactService.findPaginated(5, 20);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(20);
      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 80,
        take: 20,
      });
    });

    /**
     * Test: Uses default pageSize of 20 when not provided
     */
    it("uses default pageSize of 20", async () => {
      db.prisma.contact.findMany.mockResolvedValue([]);
      db.prisma.contact.count.mockResolvedValue(0);

      await contactService.findPaginated(1);

      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
      });
    });

    /**
     * Test: Handles edge case of page 1 with pageSize 100
     */
    it("handles max pageSize at boundary", async () => {
      const mockContacts = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        firstName: `First${i + 1}`,
        lastName: `Last${i + 1}`,
        email: `user${i + 1}@example.com`,
      }));

      db.prisma.contact.findMany.mockResolvedValue(mockContacts);
      db.prisma.contact.count.mockResolvedValue(150);

      const result = await contactService.findPaginated(1, 100);

      expect(result.data).toHaveLength(100);
      expect(result.total).toBe(150);
      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 100,
      });
    });

    /**
     * Test: Clamps pageSize even if it exceeds max
     */
    it("clamps pageSize=200 to 100", async () => {
      db.prisma.contact.findMany.mockResolvedValue([]);
      db.prisma.contact.count.mockResolvedValue(200);

      await contactService.findPaginated(1, 200);

      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 100,
      });
    });

    /**
     * Test: Propagates database errors
     */
    it("propagates database errors", async () => {
      const dbError = new Error("Database connection failed");
      db.prisma.contact.findMany.mockRejectedValue(dbError);

      await expect(contactService.findPaginated(1, 20)).rejects.toThrow(dbError);
    });
  });

  describe("findAll", () => {
    /**
     * Test: Returns all contacts without pagination
     */
    it("fetches all contacts from the database", async () => {
      const mockContacts = [
        { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" },
        { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
      ];

      db.prisma.contact.findMany.mockResolvedValue(mockContacts);

      const result = await contactService.findAll();

      expect(result).toEqual(mockContacts);
      expect(db.prisma.contact.findMany).toHaveBeenCalledWith();
    });
  });
});
