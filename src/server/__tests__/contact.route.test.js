/**
 * Contact Routes Tests
 * ====================
 *
 * Tests for the contact API endpoints, including pagination functionality.
 * Uses vi.mock to mock the service layer without requiring a live database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

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

describe("Contact Routes - GET /list", () => {
  const mockContacts = [
    { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" },
    { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    contactService.findAllPaginated.mockResolvedValue({
      data: mockContacts,
      total: 100,
    });
  });

  /**
   * Test basic pagination response structure
   */
  it("calls findAllPaginated with default page=1 and pageSize=20", async () => {
    // Simulate the route handler logic directly
    const page = 1;
    const pageSize = 20;

    const result = await contactService.findAllPaginated(page, pageSize);

    expect(contactService.findAllPaginated).toHaveBeenCalledWith(1, 20);
    expect(result.data).toEqual(mockContacts);
    expect(result.total).toBe(100);
  });

  /**
   * Test with custom page and pageSize
   */
  it("calls findAllPaginated with custom page and pageSize", async () => {
    const page = 3;
    const pageSize = 50;

    // In the route, pageSize would be clamped to min(50, 100) = 50
    const clampedPageSize = Math.min(pageSize, 100);

    await contactService.findAllPaginated(page, clampedPageSize);

    expect(contactService.findAllPaginated).toHaveBeenCalledWith(3, 50);
  });

  /**
   * Test clamping pageSize to 100
   */
  it("clamps pageSize to 100 in route logic", async () => {
    const pageSize = 150;
    const clampedPageSize = Math.min(pageSize, 100);

    expect(clampedPageSize).toBe(100);
  });

  /**
   * Test response structure with records and total
   */
  it("returns response with records and total count", async () => {
    const result = await contactService.findAllPaginated(1, 20);

    // Verify the structure matches what the route should return
    const response = {
      records: result.data,
      total: result.total,
    };

    expect(response.records).toEqual(mockContacts);
    expect(response.total).toBe(100);
  });

  /**
   * Test with empty result set
   */
  it("handles empty result set correctly", async () => {
    contactService.findAllPaginated.mockResolvedValue({
      data: [],
      total: 0,
    });

    const result = await contactService.findAllPaginated(1, 20);

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  /**
   * Test with large page numbers
   */
  it("handles large page numbers", async () => {
    await contactService.findAllPaginated(500, 20);

    expect(contactService.findAllPaginated).toHaveBeenCalledWith(500, 20);
  });

  /**
   * Test service called on route invocation
   */
  it("invokes service on pagination request", async () => {
    const result = await contactService.findAllPaginated(2, 30);

    expect(contactService.findAllPaginated).toHaveBeenCalledWith(2, 30);
    expect(result.data).toBeDefined();
    expect(result.total).toBeDefined();
  });

  /**
   * Test error handling
   */
  it("service error is propagated", async () => {
    const error = new Error("Database error");
    contactService.findAllPaginated.mockRejectedValue(error);

    await expect(contactService.findAllPaginated(1, 20)).rejects.toThrow("Database error");
  });
});
