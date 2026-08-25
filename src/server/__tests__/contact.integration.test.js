/**
 * Contact Integration Tests (E2E)
 * ================================
 *
 * End-to-end tests for the full contact pagination flow.
 * Simulates creating multiple contacts and then paginating through them.
 * Uses vi.mock to mock Prisma without needing a real database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { errors } from "celebrate";
import contactRoutes from "../routes/v1/contact.route.js";
import { celebrateErrorHandler } from "../middleware/errorHandler.js";

// Mock the database service
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

// Import the mocked database
import db from "../services/database.js";

/**
 * Helper function to create a test Express app
 */
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/contact", contactRoutes);

  app.use(celebrateErrorHandler);
  app.use(errors());

  return app;
}

/**
 * Helper function to generate mock contacts
 * @param {number} startId - Starting ID
 * @param {number} count - Number of contacts to generate
 * @returns {Array} Array of mock contact objects
 */
function generateMockContacts(startId = 1, count = 20) {
  return Array.from({ length: count }, (_, i) => ({
    id: startId + i,
    firstName: `FirstName${startId + i}`,
    lastName: `LastName${startId + i}`,
    email: `contact${startId + i}@example.com`,
  }));
}

describe("Contact Integration Tests - Pagination E2E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * AC1: E2E test verifies creating 50+ contacts, then fetching page 1
   * with pageSize=20 returns 20 records and total=50+
   */
  describe("AC1: Page 1 with 50+ total contacts", () => {
    it("returns page 1 with 20 records when total is 50+", async () => {
      const page1Contacts = generateMockContacts(1, 20);

      db.prisma.contact.findMany.mockResolvedValue(page1Contacts);
      db.prisma.contact.count.mockResolvedValue(50);

      const app = createTestApp();
      const res = await request(app).get("/contact/list").query({ page: 1, pageSize: 20 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toHaveLength(20);
      expect(res.body.data.total).toBe(50);
      expect(res.body.data.data[0].id).toBe(1);
      expect(res.body.data.data[19].id).toBe(20);
    });

    it("returns page 1 with correct data structure when total is exactly 50", async () => {
      const page1Contacts = generateMockContacts(1, 20);

      db.prisma.contact.findMany.mockResolvedValue(page1Contacts);
      db.prisma.contact.count.mockResolvedValue(50);

      const app = createTestApp();
      const res = await request(app).get("/contact/list").query({ page: 1, pageSize: 20 });

      expect(res.body.data.data).toEqual(page1Contacts);
      expect(res.body.data.total).toBe(50);
    });

    it("returns page 1 with correct total when there are 100+ contacts", async () => {
      const page1Contacts = generateMockContacts(1, 20);

      db.prisma.contact.findMany.mockResolvedValue(page1Contacts);
      db.prisma.contact.count.mockResolvedValue(150);

      const app = createTestApp();
      const res = await request(app).get("/contact/list").query({ page: 1, pageSize: 20 });

      expect(res.status).toBe(200);
      expect(res.body.data.data).toHaveLength(20);
      expect(res.body.data.total).toBe(150);
    });
  });

  /**
   * AC2: E2E test verifies fetching page 2 with same parameters
   * returns next 20 records (ids 21-40, for example)
   */
  describe("AC2: Page 2 returns next batch of records", () => {
    it("returns page 2 with correct records (21-40) when total is 50", async () => {
      const page2Contacts = generateMockContacts(21, 20);

      db.prisma.contact.findMany.mockResolvedValue(page2Contacts);
      db.prisma.contact.count.mockResolvedValue(50);

      const app = createTestApp();
      const res = await request(app).get("/contact/list").query({ page: 2, pageSize: 20 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toHaveLength(20);
      expect(res.body.data.total).toBe(50);
      expect(res.body.data.data[0].id).toBe(21);
      expect(res.body.data.data[19].id).toBe(40);
    });

    it("calculates skip correctly for page 2 (skip=20)", async () => {
      const page2Contacts = generateMockContacts(21, 20);

      db.prisma.contact.findMany.mockResolvedValue(page2Contacts);
      db.prisma.contact.count.mockResolvedValue(50);

      const app = createTestApp();
      await request(app).get("/contact/list").query({ page: 2, pageSize: 20 });

      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 20,
        take: 20,
        orderBy: { id: "asc" },
      });
    });

    it("returns page 2 with correct total count consistency", async () => {
      const page2Contacts = generateMockContacts(21, 20);

      db.prisma.contact.findMany.mockResolvedValue(page2Contacts);
      db.prisma.contact.count.mockResolvedValue(50);

      const app = createTestApp();
      const res = await request(app).get("/contact/list").query({ page: 2, pageSize: 20 });

      // Total should remain the same as page 1
      expect(res.body.data.total).toBe(50);
    });
  });

  /**
   * Edge case: Multi-page navigation
   * Fetch page 1, 2, 3 in sequence and verify correct records and total count consistency
   */
  describe("Edge case: Multi-page navigation", () => {
    it("navigates through page 1, 2, 3 with correct records", async () => {
      const app = createTestApp();

      // Page 1
      const page1Contacts = generateMockContacts(1, 20);
      db.prisma.contact.findMany.mockResolvedValue(page1Contacts);
      db.prisma.contact.count.mockResolvedValue(60);

      const res1 = await request(app).get("/contact/list").query({ page: 1, pageSize: 20 });

      expect(res1.body.data.data[0].id).toBe(1);
      expect(res1.body.data.data[19].id).toBe(20);
      expect(res1.body.data.total).toBe(60);

      // Page 2
      const page2Contacts = generateMockContacts(21, 20);
      db.prisma.contact.findMany.mockResolvedValue(page2Contacts);
      db.prisma.contact.count.mockResolvedValue(60);

      const res2 = await request(app).get("/contact/list").query({ page: 2, pageSize: 20 });

      expect(res2.body.data.data[0].id).toBe(21);
      expect(res2.body.data.data[19].id).toBe(40);
      expect(res2.body.data.total).toBe(60);

      // Page 3
      const page3Contacts = generateMockContacts(41, 20);
      db.prisma.contact.findMany.mockResolvedValue(page3Contacts);
      db.prisma.contact.count.mockResolvedValue(60);

      const res3 = await request(app).get("/contact/list").query({ page: 3, pageSize: 20 });

      expect(res3.body.data.data[0].id).toBe(41);
      expect(res3.body.data.data[19].id).toBe(60);
      expect(res3.body.data.total).toBe(60);
    });

    it("maintains total count consistency across all pages", async () => {
      const app = createTestApp();
      const totalCount = 50;

      // Page 1
      db.prisma.contact.findMany.mockResolvedValue(generateMockContacts(1, 20));
      db.prisma.contact.count.mockResolvedValue(totalCount);
      const res1 = await request(app).get("/contact/list").query({ page: 1, pageSize: 20 });

      // Page 2
      db.prisma.contact.findMany.mockResolvedValue(generateMockContacts(21, 20));
      db.prisma.contact.count.mockResolvedValue(totalCount);
      const res2 = await request(app).get("/contact/list").query({ page: 2, pageSize: 20 });

      expect(res1.body.data.total).toBe(res2.body.data.total);
      expect(res1.body.data.total).toBe(50);
    });
  });

  /**
   * Edge case: Boundary pages
   * Fetch last page of results and verify count matches expected
   */
  describe("Edge case: Boundary pages", () => {
    it("returns partial data on last page when total is not divisible by pageSize", async () => {
      // 55 total contacts, page 3 with pageSize=20 should have 15 records
      const page3Contacts = generateMockContacts(41, 15);

      db.prisma.contact.findMany.mockResolvedValue(page3Contacts);
      db.prisma.contact.count.mockResolvedValue(55);

      const app = createTestApp();
      const res = await request(app).get("/contact/list").query({ page: 3, pageSize: 20 });

      expect(res.status).toBe(200);
      expect(res.body.data.data).toHaveLength(15);
      expect(res.body.data.total).toBe(55);
      expect(res.body.data.data[0].id).toBe(41);
      expect(res.body.data.data[14].id).toBe(55);
    });

    it("returns empty array when requesting page beyond available data", async () => {
      db.prisma.contact.findMany.mockResolvedValue([]);
      db.prisma.contact.count.mockResolvedValue(40);

      const app = createTestApp();
      const res = await request(app).get("/contact/list").query({ page: 5, pageSize: 20 });

      expect(res.status).toBe(200);
      expect(res.body.data.data).toEqual([]);
      expect(res.body.data.total).toBe(40);
    });

    it("correctly handles last page with exactly pageSize records", async () => {
      // 40 total contacts, page 2 with pageSize=20 should have exactly 20 records
      const page2Contacts = generateMockContacts(21, 20);

      db.prisma.contact.findMany.mockResolvedValue(page2Contacts);
      db.prisma.contact.count.mockResolvedValue(40);

      const app = createTestApp();
      const res = await request(app).get("/contact/list").query({ page: 2, pageSize: 20 });

      expect(res.status).toBe(200);
      expect(res.body.data.data).toHaveLength(20);
      expect(res.body.data.total).toBe(40);
      expect(res.body.data.data[0].id).toBe(21);
      expect(res.body.data.data[19].id).toBe(40);
    });
  });

  /**
   * Integration: Response envelope structure
   * Verifies the complete response structure with all required fields
   */
  describe("Integration: Response envelope structure", () => {
    it("returns complete success envelope with all required fields", async () => {
      const mockContacts = generateMockContacts(1, 20);

      db.prisma.contact.findMany.mockResolvedValue(mockContacts);
      db.prisma.contact.count.mockResolvedValue(50);

      const app = createTestApp();
      const res = await request(app).get("/contact/list").query({ page: 1, pageSize: 20 });

      // Check top-level envelope
      expect(res.body).toHaveProperty("success");
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("message");
      expect(res.body).toHaveProperty("timestamp");

      // Check success is true
      expect(res.body.success).toBe(true);

      // Check data structure
      expect(res.body.data).toHaveProperty("data");
      expect(res.body.data).toHaveProperty("total");
      expect(Array.isArray(res.body.data.data)).toBe(true);
      expect(typeof res.body.data.total).toBe("number");
    });

    it("includes timestamp in ISO format", async () => {
      const mockContacts = generateMockContacts(1, 20);

      db.prisma.contact.findMany.mockResolvedValue(mockContacts);
      db.prisma.contact.count.mockResolvedValue(50);

      const app = createTestApp();
      const res = await request(app).get("/contact/list").query({ page: 1, pageSize: 20 });

      expect(res.body.timestamp).toBeDefined();
      // Verify it's a valid ISO date string
      const date = new Date(res.body.timestamp);
      expect(!isNaN(date.getTime())).toBe(true);
    });
  });

  /**
   * Integration: Large dataset pagination
   * Test pagination with a larger dataset to ensure skip/take calculations are correct
   */
  describe("Integration: Large dataset pagination", () => {
    it("handles 150+ contacts with multiple pages correctly", async () => {
      const app = createTestApp();

      // Page 1 of 150
      db.prisma.contact.findMany.mockResolvedValue(generateMockContacts(1, 20));
      db.prisma.contact.count.mockResolvedValue(150);

      const res1 = await request(app).get("/contact/list").query({ page: 1, pageSize: 20 });

      expect(res1.body.data.total).toBe(150);
      expect(res1.body.data.data).toHaveLength(20);

      // Page 3 of 150
      db.prisma.contact.findMany.mockResolvedValue(generateMockContacts(41, 20));
      db.prisma.contact.count.mockResolvedValue(150);

      const res3 = await request(app).get("/contact/list").query({ page: 3, pageSize: 20 });

      expect(res3.body.data.total).toBe(150);
      expect(res3.body.data.data).toHaveLength(20);

      // Page 8 of 150 (last page with only 10 records)
      db.prisma.contact.findMany.mockResolvedValue(generateMockContacts(141, 10));
      db.prisma.contact.count.mockResolvedValue(150);

      const res8 = await request(app).get("/contact/list").query({ page: 8, pageSize: 20 });

      expect(res8.body.data.total).toBe(150);
      expect(res8.body.data.data).toHaveLength(10);
    });
  });

  /**
   * Integration: Different page size with 50+ records
   * Verify pagination works with different page sizes
   */
  describe("Integration: Different page sizes", () => {
    it("paginates with pageSize=30 on 50+ records", async () => {
      const page1Contacts = generateMockContacts(1, 30);

      db.prisma.contact.findMany.mockResolvedValue(page1Contacts);
      db.prisma.contact.count.mockResolvedValue(60);

      const app = createTestApp();
      const res = await request(app).get("/contact/list").query({ page: 1, pageSize: 30 });

      expect(res.status).toBe(200);
      expect(res.body.data.data).toHaveLength(30);
      expect(res.body.data.total).toBe(60);
    });

    it("handles pageSize=100 (max) with large dataset", async () => {
      const page1Contacts = generateMockContacts(1, 100);

      db.prisma.contact.findMany.mockResolvedValue(page1Contacts);
      db.prisma.contact.count.mockResolvedValue(150);

      const app = createTestApp();
      const res = await request(app).get("/contact/list").query({ page: 1, pageSize: 100 });

      expect(res.status).toBe(200);
      expect(res.body.data.data).toHaveLength(100);
      expect(res.body.data.total).toBe(150);
      expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 100,
        orderBy: { id: "asc" },
      });
    });
  });
});
