/**
 * ContactService Tests
 * ====================
 *
 * Tests for the ContactService class, including pagination logic.
 * Uses vi.mock to mock the database layer without requiring a live database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import contactService from "../services/contact.service.js";

// Mock the database module
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

// Import the mocked db after mock setup
import db from "../services/database.js";

describe("ContactService", () => {
  const mockContacts = [
    { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" },
    { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
    { id: 3, firstName: "Bob", lastName: "Johnson", email: "bob@example.com" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findAllPaginated", () => {
    it("returns paginated contacts with correct structure", async () => {
      db.prisma.contact.findMany.mockResolvedValue(mockContacts.slice(0, 2));
      db.prisma.contact.count.mockResolvedValue(3);

      const result = await contactService.findAllPaginated(1, 20);

      expect(result).toEqual({
        data: mockContacts.slice(0, 2),
        total: 3,
      });
    });

    it("calculates correct skip and take values for page 1, pageSize 20", async () => {
      db.prisma.contact.findMany.mockResolvedValue([]);
      db.prisma.contact.count.mockResolvedValue(0);

      await contactService.findAllPaginated(1, 20);

      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
      });
    });

    it("calculates correct skip and take values for page 2, pageSize 20", async () => {
      db.prisma.contact.findMany.mockResolvedValue([]);
      db.prisma.contact.count.mockResolvedValue(0);

      await contactService.findAllPaginated(2, 20);

      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 20,
        take: 20,
      });
    });

    it("calculates correct skip and take values for page 3, pageSize 25", async () => {
      db.prisma.contact.findMany.mockResolvedValue([]);
      db.prisma.contact.count.mockResolvedValue(0);

      await contactService.findAllPaginated(3, 25);

      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 50,
        take: 25,
      });
    });

    it("clamps pageSize to 100 when exceeding max", async () => {
      db.prisma.contact.findMany.mockResolvedValue([]);
      db.prisma.contact.count.mockResolvedValue(0);

      await contactService.findAllPaginated(1, 150);

      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 100,
      });
    });

    it("returns empty data and zero total when no contacts exist", async () => {
      db.prisma.contact.findMany.mockResolvedValue([]);
      db.prisma.contact.count.mockResolvedValue(0);

      const result = await contactService.findAllPaginated(1, 20);

      expect(result).toEqual({
        data: [],
        total: 0,
      });
    });

    it("handles large page numbers correctly", async () => {
      db.prisma.contact.findMany.mockResolvedValue([]);
      db.prisma.contact.count.mockResolvedValue(10000);

      await contactService.findAllPaginated(500, 20);

      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 9980,
        take: 20,
      });
    });

    it("respects pageSize of 1", async () => {
      db.prisma.contact.findMany.mockResolvedValue([mockContacts[0]]);
      db.prisma.contact.count.mockResolvedValue(3);

      await contactService.findAllPaginated(1, 1);

      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 1,
      });
    });

    it("respects pageSize of 100 (maximum without clamping)", async () => {
      db.prisma.contact.findMany.mockResolvedValue([]);
      db.prisma.contact.count.mockResolvedValue(0);

      await contactService.findAllPaginated(1, 100);

      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 100,
      });
    });
  });
});
