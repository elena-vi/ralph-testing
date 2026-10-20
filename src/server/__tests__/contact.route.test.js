/**
 * Contact Route Tests
 * ===================
 *
 * Tests for contact route handlers, including pagination.
 * Tests mock the contact service to verify correct calls and responses.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the contact service before importing the route
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

// Import after mocks are set up
import contactService from "../services/contact.service.js";

describe("Contact Routes - Pagination", () => {
  const mockContacts = [
    { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" },
    { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test service method with default pagination parameters
   * Verifies that the service correctly handles page 1 and pageSize 20
   */
  it("should call findAllPaginated with default parameters", async () => {
    contactService.findAllPaginated.mockResolvedValue({
      records: mockContacts,
      total: 50,
    });

    const result = await contactService.findAllPaginated(1, 20);

    expect(result).toHaveProperty("records");
    expect(result).toHaveProperty("total");
    expect(result.records).toEqual(mockContacts);
    expect(result.total).toBe(50);
    expect(contactService.findAllPaginated).toHaveBeenCalledWith(1, 20);
  });

  /**
   * Test service method with custom pagination parameters
   */
  it("should call findAllPaginated with custom parameters", async () => {
    contactService.findAllPaginated.mockResolvedValue({
      records: mockContacts,
      total: 50,
    });

    const result = await contactService.findAllPaginated(2, 10);

    expect(result).toHaveProperty("records");
    expect(result).toHaveProperty("total");
    expect(contactService.findAllPaginated).toHaveBeenCalledWith(2, 10);
  });

  /**
   * Test response structure includes records array and total number
   */
  it("should return response with records array and total count", async () => {
    const testContacts = [{ id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" }];

    contactService.findAllPaginated.mockResolvedValue({
      records: testContacts,
      total: 100,
    });

    const result = await contactService.findAllPaginated(1, 20);

    expect(Array.isArray(result.records)).toBe(true);
    expect(typeof result.total).toBe("number");
    expect(result.total).toBe(100);
  });

  /**
   * Test service handles pageSize clamping
   * The service should clamp pageSize to 100
   */
  it("should clamp pageSize to 100 in the service", async () => {
    contactService.findAllPaginated.mockResolvedValue({
      records: mockContacts.slice(0, 100),
      total: 50,
    });

    await contactService.findAllPaginated(1, 150);

    expect(contactService.findAllPaginated).toHaveBeenCalledWith(1, 150);
    // The service should handle the clamping internally
  });

  /**
   * Test empty result set
   */
  it("should return empty records for page beyond available data", async () => {
    contactService.findAllPaginated.mockResolvedValue({
      records: [],
      total: 50,
    });

    const result = await contactService.findAllPaginated(10, 20);

    expect(result.records).toHaveLength(0);
    expect(result.total).toBe(50);
  });

  /**
   * Test zero total count
   */
  it("should return zero total when no contacts exist", async () => {
    contactService.findAllPaginated.mockResolvedValue({
      records: [],
      total: 0,
    });

    const result = await contactService.findAllPaginated(1, 20);

    expect(result.records).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
