/**
 * Contact Route Tests
 * ===================
 *
 * Tests for the contact API routes using HTTP requests.
 * Uses supertest to make actual HTTP requests to the Express route.
 * Mocks Prisma through the service layer to test without a database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { errors } from "celebrate";
import contactRoutes from "../routes/v1/contact.route.js";
import { errorResponse } from "../utils/response.js";

// Mock the database service that contact service uses
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
 * Helper function to create a test Express app with contact routes
 */
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/contact", contactRoutes);

  // Custom error handler to convert celebrate errors to errorResponse format
  app.use((err, req, res, next) => {
    // Check if this is a celebrate validation error
    if (err.details && err.details instanceof Map) {
      // Extract the first validation error message from the details Map
      let message = "Validation failed";
      for (const [_segment, details] of err.details.entries()) {
        if (details && details.message) {
          message = details.message;
          break;
        }
      }

      return res.status(400).json(errorResponse(message));
    }

    // If not a celebrate error, pass to next error handler
    next(err);
  });

  // Fall back to celebrate's default error handler for any validation errors that weren't caught
  app.use(errors());

  return app;
}

describe("Contact Route - GET /contact/list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Happy path with default parameters (page=1, pageSize=20)
   */
  it("returns 200 with paginated contacts using defaults", async () => {
    const mockContacts = [
      { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" },
      { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
    ];

    db.prisma.contact.findMany.mockResolvedValue(mockContacts);
    db.prisma.contact.count.mockResolvedValue(50);

    const app = createTestApp();
    const res = await request(app).get("/contact/list");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toHaveProperty("data");
    expect(res.body.data).toHaveProperty("total");
    expect(res.body.data.data).toEqual(mockContacts);
    expect(res.body.data.total).toBe(50);
  });

  /**
   * Test: Accepts explicit page and pageSize parameters
   */
  it("returns 200 with explicit page and pageSize parameters", async () => {
    const mockContacts = [
      { id: 21, firstName: "Alice", lastName: "Johnson", email: "alice@example.com" },
      { id: 22, firstName: "Bob", lastName: "Williams", email: "bob@example.com" },
    ];

    db.prisma.contact.findMany.mockResolvedValue(mockContacts);
    db.prisma.contact.count.mockResolvedValue(100);

    const app = createTestApp();
    const res = await request(app).get("/contact/list").query({ page: 2, pageSize: 30 });

    expect(res.status).toBe(200);
    expect(res.body.data.data).toEqual(mockContacts);
    expect(res.body.data.total).toBe(100);
    expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
      skip: 30,
      take: 30,
      orderBy: { id: "asc" },
    });
  });

  /**
   * Test: Clamps pageSize to maximum of 100
   */
  it("clamps pageSize to max 100", async () => {
    db.prisma.contact.findMany.mockResolvedValue([]);
    db.prisma.contact.count.mockResolvedValue(200);

    const app = createTestApp();
    const res = await request(app).get("/contact/list").query({ page: 1, pageSize: 150 });

    expect(res.status).toBe(200);
    expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
      skip: 0,
      take: 100,
      orderBy: { id: "asc" },
    });
  });

  /**
   * Test: Returns empty array when page exceeds available data
   */
  it("returns empty data array when page is out of range", async () => {
    db.prisma.contact.findMany.mockResolvedValue([]);
    db.prisma.contact.count.mockResolvedValue(20);

    const app = createTestApp();
    const res = await request(app).get("/contact/list").query({ page: 5, pageSize: 20 });

    expect(res.status).toBe(200);
    expect(res.body.data.data).toEqual([]);
    expect(res.body.data.total).toBe(20);
  });

  /**
   * Test: Returns HTTP 400 when page is not a number
   */
  it("returns 400 when page parameter is not a number", async () => {
    const app = createTestApp();
    const res = await request(app).get("/contact/list").query({ page: "invalid" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toContain("page");
    expect(res.body).not.toHaveProperty("validation");
    expect(res.body).toHaveProperty("timestamp");
  });

  /**
   * Test: Returns HTTP 400 when page is zero
   */
  it("returns 400 when page is zero", async () => {
    const app = createTestApp();
    const res = await request(app).get("/contact/list").query({ page: 0 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message");
    expect(res.body).not.toHaveProperty("validation");
    expect(res.body).toHaveProperty("timestamp");
  });

  /**
   * Test: Returns HTTP 400 when page is negative
   */
  it("returns 400 when page is negative", async () => {
    const app = createTestApp();
    const res = await request(app).get("/contact/list").query({ page: -1 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toContain("page");
    expect(res.body).not.toHaveProperty("validation");
    expect(res.body).toHaveProperty("timestamp");
  });

  /**
   * Test: Returns HTTP 400 when pageSize is not a number
   */
  it("returns 400 when pageSize is not a number", async () => {
    const app = createTestApp();
    const res = await request(app).get("/contact/list").query({ pageSize: "notanumber" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message");
    expect(res.body).not.toHaveProperty("validation");
    expect(res.body).toHaveProperty("timestamp");
  });

  /**
   * Test: Returns HTTP 400 when pageSize is negative
   */
  it("returns 400 when pageSize is negative", async () => {
    const app = createTestApp();
    const res = await request(app).get("/contact/list").query({ pageSize: -10 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message");
    expect(res.body).not.toHaveProperty("validation");
    expect(res.body).toHaveProperty("timestamp");
  });

  /**
   * Test: Returns HTTP 400 when page is fractional
   */
  it("returns 400 when page is fractional (not an integer)", async () => {
    const app = createTestApp();
    const res = await request(app).get("/contact/list").query({ page: "1.5" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toContain("page");
    expect(res.body).not.toHaveProperty("validation");
    expect(res.body).toHaveProperty("timestamp");
  });

  /**
   * Test: Returns HTTP 400 when pageSize is fractional
   */
  it("returns 400 when pageSize is fractional (not an integer)", async () => {
    const app = createTestApp();
    const res = await request(app).get("/contact/list").query({ pageSize: "2.5" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toContain("pageSize");
    expect(res.body).not.toHaveProperty("validation");
    expect(res.body).toHaveProperty("timestamp");
  });

  /**
   * Test: Returns HTTP 500 when service throws an error
   */
  it("returns 500 when service throws error", async () => {
    const dbError = new Error("Database connection failed");
    db.prisma.contact.findMany.mockRejectedValue(dbError);

    const app = createTestApp();
    const res = await request(app).get("/contact/list");

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("success", false);
  });

  /**
   * Test: Response envelope structure is correct
   */
  it("returns response with correct success envelope", async () => {
    const mockContacts = [{ id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" }];

    db.prisma.contact.findMany.mockResolvedValue(mockContacts);
    db.prisma.contact.count.mockResolvedValue(50);

    const app = createTestApp();
    const res = await request(app).get("/contact/list");

    expect(res.body).toHaveProperty("success");
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body.success).toBe(true);
  });

  /**
   * Test: Calls service with correct skip/take calculation
   */
  it("calculates skip correctly for pagination", async () => {
    db.prisma.contact.findMany.mockResolvedValue([]);
    db.prisma.contact.count.mockResolvedValue(100);

    const app = createTestApp();
    await request(app).get("/contact/list").query({ page: 3, pageSize: 25 });

    expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
      skip: 50,
      take: 25,
      orderBy: { id: "asc" },
    });
  });

  /**
   * Test: Handles maximum pageSize at boundary (100)
   */
  it("accepts pageSize=100 at max boundary", async () => {
    const mockContacts = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      firstName: `First${i + 1}`,
      lastName: `Last${i + 1}`,
      email: `user${i + 1}@example.com`,
    }));

    db.prisma.contact.findMany.mockResolvedValue(mockContacts);
    db.prisma.contact.count.mockResolvedValue(150);

    const app = createTestApp();
    const res = await request(app).get("/contact/list").query({ pageSize: 100 });

    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(100);
    expect(db.prisma.contact.findMany).toHaveBeenCalledWith({
      skip: 0,
      take: 100,
      orderBy: { id: "asc" },
    });
  });
});
