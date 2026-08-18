/**
 * Contact Routes Tests
 * ====================
 *
 * Tests for the contact API endpoints, including pagination functionality.
 * Makes actual HTTP requests to the route endpoints and validates response
 * structure, status codes, and parameter handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import http from "http";

// Mock the contact service
vi.mock("../services/contact.service.js", () => ({
  default: {
    findAll: vi.fn(),
    findAllPaginated: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Import after mocking
import contactService from "../services/contact.service.js";
import contactRouter from "../routes/v1/contact.route.js";
import { securityMiddleware, requestLogger } from "../middleware/security.js";
import { createCelebrateErrorHandler } from "../middleware/celebrateErrorHandler.js";

/**
 * Helper to make HTTP requests to a test app
 */
async function request(port, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            body: parsed,
          });
        } catch {
          resolve({
            status: res.statusCode,
            body: data,
          });
        }
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Creates a test Express app with the contact router
 */
function createTestApp() {
  const app = express();

  // Minimal middleware setup matching the real server
  app.use(securityMiddleware);
  app.use(requestLogger);
  app.use(express.json());

  // Mount the contact router
  app.use("/api/v1/contact", contactRouter);

  // Handle Celebrate validation errors (after routes)
  app.use(createCelebrateErrorHandler());

  return app;
}

describe("Contact Route - GET /api/v1/contact/list", () => {
  let server;
  let port;

  const mockContacts = [
    { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" },
    { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    const app = createTestApp();
    return new Promise((resolve) => {
      server = app.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  afterEach(() => {
    return new Promise((resolve) => {
      if (server) {
        server.close(resolve);
      } else {
        resolve();
      }
    });
  });

  // ========================================================================
  // AC#1: Basic pagination with explicit page and pageSize
  // ========================================================================

  it("GET /list?page=1&pageSize=20 returns 200 with correct structure", async () => {
    contactService.findAllPaginated.mockResolvedValue({
      data: mockContacts,
      total: 100,
    });

    const res = await request(port, "GET", "/api/v1/contact/list?page=1&pageSize=20");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toHaveProperty("records");
    expect(res.body.data).toHaveProperty("total");
    expect(res.body.data.records).toEqual(mockContacts);
    expect(res.body.data.total).toBe(100);
    expect(contactService.findAllPaginated).toHaveBeenCalledWith(1, 20);
  });

  // ========================================================================
  // AC#2: Default parameters when none provided
  // ========================================================================

  it("GET /list (no params) returns 200 with default page=1 and pageSize=20", async () => {
    contactService.findAllPaginated.mockResolvedValue({
      data: mockContacts,
      total: 50,
    });

    const res = await request(port, "GET", "/api/v1/contact/list");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.records).toEqual(mockContacts);
    expect(res.body.data.total).toBe(50);
    expect(contactService.findAllPaginated).toHaveBeenCalledWith(1, 20);
  });

  // ========================================================================
  // AC#3: pageSize clamping to 100 maximum
  // ========================================================================

  it("GET /list?pageSize=150 returns 200 with pageSize passed to service (service handles clamp)", async () => {
    contactService.findAllPaginated.mockResolvedValue({
      data: Array(100)
        .fill(null)
        .map((_, i) => ({
          id: i + 1,
          firstName: `First${i}`,
          lastName: `Last${i}`,
          email: `email${i}@example.com`,
        })),
      total: 200,
    });

    const res = await request(port, "GET", "/api/v1/contact/list?pageSize=150");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.records.length).toBe(100);
    // Route passes raw pageSize to service; service clamps it
    expect(contactService.findAllPaginated).toHaveBeenCalledWith(1, 150);
  });

  // ========================================================================
  // AC#4: Invalid page parameter (non-numeric)
  // ========================================================================

  it("GET /list?page=abc returns 400 with 'page' in error message", async () => {
    const res = await request(port, "GET", "/api/v1/contact/list?page=abc");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message.toLowerCase()).toContain("page");
  });

  // ========================================================================
  // AC#5: Invalid page parameter (negative)
  // ========================================================================

  it("GET /list?page=-1 returns 400 with 'page' in error message", async () => {
    const res = await request(port, "GET", "/api/v1/contact/list?page=-1");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message.toLowerCase()).toContain("page");
  });

  // ========================================================================
  // AC#6: Invalid pageSize parameter (zero)
  // ========================================================================

  it("GET /list?pageSize=0 returns 400 with 'pageSize' in error message", async () => {
    const res = await request(port, "GET", "/api/v1/contact/list?pageSize=0");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message.toLowerCase()).toContain("pagesize");
  });

  // ========================================================================
  // Additional error cases
  // ========================================================================

  it("GET /list?pageSize=abc returns 400 with 'pageSize' in error message", async () => {
    const res = await request(port, "GET", "/api/v1/contact/list?pageSize=abc");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message.toLowerCase()).toContain("pagesize");
  });

  it("handles empty result set correctly", async () => {
    contactService.findAllPaginated.mockResolvedValue({
      data: [],
      total: 0,
    });

    const res = await request(port, "GET", "/api/v1/contact/list");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.records).toEqual([]);
    expect(res.body.data.total).toBe(0);
  });

  it("handles service error by returning 500", async () => {
    const error = new Error("Database error");
    contactService.findAllPaginated.mockRejectedValue(error);

    const res = await request(port, "GET", "/api/v1/contact/list");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Failed to retrieve contacts");
  });

  it("passes page parameter correctly to service", async () => {
    contactService.findAllPaginated.mockResolvedValue({
      data: [],
      total: 0,
    });

    await request(port, "GET", "/api/v1/contact/list?page=5&pageSize=25");

    expect(contactService.findAllPaginated).toHaveBeenCalledWith(5, 25);
  });
});
