/**
 * Contact Route HTTP Integration Tests
 * =====================================
 *
 * Tests for contact route HTTP behavior using supertest.
 * Verifies HTTP status codes, response structure, and validation error handling.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

// Mock the database module before importing anything that uses it
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

// Mock the contact service
vi.mock("../services/contact.service.js", () => ({
  default: {
    findAllPaginated: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import contactService from "../services/contact.service.js";
import { app } from "../app.js";

describe("Contact Route - HTTP Integration Tests", () => {
  const mockContacts = [
    { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" },
    { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test AC-1: Default pagination returns 200 with correct envelope
   */
  it("returns 200 with default pagination parameters", async () => {
    contactService.findAllPaginated.mockResolvedValue({
      records: mockContacts,
      total: 50,
    });

    const res = await request(app).get("/api/v1/contact/list");

    expect(contactService.findAllPaginated).toHaveBeenCalledWith(1, 20);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("records");
    expect(res.body.data).toHaveProperty("total");
    expect(res.body.data.records).toEqual(mockContacts);
    expect(res.body.data.total).toBe(50);
    expect(res.body.message).toBeNull();
    expect(res.body.timestamp).toBeDefined();
  });

  /**
   * Test AC-4: Non-numeric page returns HTTP 400 with "Invalid page parameter"
   */
  it("returns 400 for non-numeric page parameter", async () => {
    const res = await request(app).get("/api/v1/contact/list?page=abc");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid page parameter");
  });

  /**
   * Test AC-5: Negative page returns HTTP 400 with "Invalid page parameter"
   */
  it("returns 400 for negative page parameter", async () => {
    const res = await request(app).get("/api/v1/contact/list?page=-1");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid page parameter");
  });

  /**
   * Test AC-6: Negative pageSize returns HTTP 400 with "Invalid pageSize parameter"
   */
  it("returns 400 for negative pageSize parameter", async () => {
    const res = await request(app).get("/api/v1/contact/list?pageSize=-10");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid pageSize parameter");
  });

  /**
   * Test: Page 0 returns HTTP 400 with "Invalid page parameter"
   */
  it("returns 400 for page=0", async () => {
    const res = await request(app).get("/api/v1/contact/list?page=0");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid page parameter");
  });

  /**
   * Test: Non-numeric pageSize returns HTTP 400 with "Invalid pageSize parameter"
   */
  it("returns 400 for non-numeric pageSize parameter", async () => {
    const res = await request(app).get("/api/v1/contact/list?pageSize=twenty");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid pageSize parameter");
  });

  /**
   * Test: Custom page and pageSize parameters work
   */
  it("returns 200 with custom page and pageSize", async () => {
    contactService.findAllPaginated.mockResolvedValue({
      records: mockContacts,
      total: 50,
    });

    const res = await request(app).get("/api/v1/contact/list?page=2&pageSize=10");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("records");
    expect(res.body.data).toHaveProperty("total");
    expect(contactService.findAllPaginated).toHaveBeenCalledWith(2, 10);
  });

  /**
   * Test: pageSize > 100 is accepted by validation and clamped by service
   */
  it("returns 200 with pageSize > 100 (clamped by service)", async () => {
    contactService.findAllPaginated.mockResolvedValue({
      records: mockContacts.slice(0, 100),
      total: 150,
    });

    const res = await request(app).get("/api/v1/contact/list?page=1&pageSize=150");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(contactService.findAllPaginated).toHaveBeenCalledWith(1, 150);
  });

  /**
   * Test: Empty result set returns 200 with empty records
   */
  it("returns 200 with empty records for page beyond data", async () => {
    contactService.findAllPaginated.mockResolvedValue({
      records: [],
      total: 50,
    });

    const res = await request(app).get("/api/v1/contact/list?page=10");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.records).toEqual([]);
    expect(res.body.data.total).toBe(50);
  });

  /**
   * Test: Response envelope structure for success
   */
  it("success response has correct envelope structure", async () => {
    contactService.findAllPaginated.mockResolvedValue({
      records: mockContacts,
      total: 50,
    });

    const res = await request(app).get("/api/v1/contact/list");

    expect(res.body).toHaveProperty("success");
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("timestamp");
    expect(typeof res.body.success).toBe("boolean");
    expect(typeof res.body.message).toBe("object"); // null
    expect(typeof res.body.timestamp).toBe("string");
  });

  /**
   * Test: Error response includes message for invalid parameters
   */
  it("error response includes message for invalid parameters", async () => {
    const res = await request(app).get("/api/v1/contact/list?page=abc");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(typeof res.body.message).toBe("string");
  });
});
