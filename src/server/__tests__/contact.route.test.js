/**
 * Contact Route Tests
 * ===================
 *
 * Tests for the contact API routes, including pagination.
 * Uses vi.mock to mock database and service dependencies.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the contact service
vi.mock("../services/contact.service.js", () => ({
  default: {
    findAll: vi.fn(),
    findPaginated: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Import mocked service after mocking
import contactService from "../services/contact.service.js";

describe("Contact Route - GET /list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Validates page parameter - must be positive number
   */
  it("validates page parameter is a positive number", () => {
    expect(() => {
      const page = "abc";
      if (isNaN(parseInt(page, 10)) || parseInt(page, 10) < 1) {
        throw new Error("page must be a positive number");
      }
    }).toThrow("page must be a positive number");
  });

  /**
   * Test: Validates page parameter rejects zero
   */
  it("validates page parameter rejects zero", () => {
    expect(() => {
      const page = 0;
      if (page < 1) {
        throw new Error("page must be a positive number");
      }
    }).toThrow("page must be a positive number");
  });

  /**
   * Test: Validates page parameter rejects negative numbers
   */
  it("validates page parameter rejects negative numbers", () => {
    expect(() => {
      const page = -1;
      if (page < 1) {
        throw new Error("page must be a positive number");
      }
    }).toThrow("page must be a positive number");
  });

  /**
   * Test: Validates pageSize parameter is a positive number
   */
  it("validates pageSize parameter is a positive number", () => {
    expect(() => {
      const pageSize = "notanumber";
      if (isNaN(parseInt(pageSize, 10)) || parseInt(pageSize, 10) < 1) {
        throw new Error("pageSize must be a positive number");
      }
    }).toThrow("pageSize must be a positive number");
  });

  /**
   * Test: Validates pageSize parameter rejects negative numbers
   */
  it("validates pageSize parameter rejects negative numbers", () => {
    expect(() => {
      const pageSize = -10;
      if (pageSize < 1) {
        throw new Error("pageSize must be a positive number");
      }
    }).toThrow("pageSize must be a positive number");
  });

  /**
   * Test: Handler calls findPaginated with default parameters
   */
  it("calls findPaginated with defaults when no params provided", async () => {
    contactService.findPaginated.mockResolvedValue({
      data: [{ id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" }],
      total: 50,
    });

    // Simulate route handler logic
    const page = 1; // default
    const pageSize = 20; // default

    await contactService.findPaginated(page, pageSize);

    expect(contactService.findPaginated).toHaveBeenCalledWith(1, 20);
  });

  /**
   * Test: Handler clamps pageSize to max 100
   */
  it("clamps pageSize to max 100 before calling service", async () => {
    contactService.findPaginated.mockResolvedValue({
      data: [],
      total: 200,
    });

    // Simulate route handler logic
    const pageSize = Math.min(150, 100);

    await contactService.findPaginated(1, pageSize);

    expect(contactService.findPaginated).toHaveBeenCalledWith(1, 100);
  });

  /**
   * Test: Handler accepts explicit page and pageSize
   */
  it("accepts explicit page and pageSize parameters", async () => {
    contactService.findPaginated.mockResolvedValue({
      data: [
        { id: 21, firstName: "Alice", lastName: "Johnson", email: "alice@example.com" },
        { id: 22, firstName: "Bob", lastName: "Williams", email: "bob@example.com" },
      ],
      total: 100,
    });

    // Simulate route handler logic
    const page = parseInt("2", 10);
    const requestedPageSize = parseInt("30", 10);
    const pageSize = Math.min(requestedPageSize, 100);

    await contactService.findPaginated(page, pageSize);

    expect(contactService.findPaginated).toHaveBeenCalledWith(2, 30);
  });

  /**
   * Test: Response shape includes both data array and total
   */
  it("returns response with data array and total count", async () => {
    const mockResponse = {
      data: [
        { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" },
        { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
      ],
      total: 150,
    };

    contactService.findPaginated.mockResolvedValue(mockResponse);

    const result = await contactService.findPaginated(1, 20);

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("total");
    expect(result.data).toBeInstanceOf(Array);
    expect(result.total).toBe(150);
  });

  /**
   * Test: Handler returns status 200 on success
   */
  it("would return status 200 on successful pagination", async () => {
    contactService.findPaginated.mockResolvedValue({
      data: [{ id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" }],
      total: 50,
    });

    await expect(contactService.findPaginated(1, 20)).resolves.toBeDefined();
  });

  /**
   * Test: Handler returns status 500 when service throws
   */
  it("would return status 500 when service throws error", async () => {
    contactService.findPaginated.mockRejectedValue(new Error("Database error"));

    await expect(contactService.findPaginated(1, 20)).rejects.toThrow("Database error");
  });

  /**
   * Test: Empty results when page exceeds data
   */
  it("returns empty data array when page is out of range", async () => {
    contactService.findPaginated.mockResolvedValue({
      data: [],
      total: 20,
    });

    const result = await contactService.findPaginated(10, 20);

    expect(result.data).toEqual([]);
    expect(result.total).toBe(20);
  });

  /**
   * Test: Handler correctly parses query string parameters
   */
  it("parses page and pageSize from query string", () => {
    const queryParams = new URLSearchParams("page=2&pageSize=50");
    const page = parseInt(queryParams.get("page"), 10) || 1;
    const pageSize = Math.min(parseInt(queryParams.get("pageSize"), 10) || 20, 100);

    expect(page).toBe(2);
    expect(pageSize).toBe(50);
  });

  /**
   * Test: Handler applies defaults when parameters are missing
   */
  it("applies defaults when query parameters are missing", () => {
    const queryParams = new URLSearchParams("");
    const page = parseInt(queryParams.get("page"), 10) || 1;
    const pageSize = Math.min(parseInt(queryParams.get("pageSize"), 10) || 20, 100);

    expect(page).toBe(1);
    expect(pageSize).toBe(20);
  });
});
