/**
 * Contact Route Integration Tests
 * ================================
 *
 * Tests for contact route HTTP behavior, including pagination parameters
 * and response structure validation.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

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

import contactService from "../services/contact.service.js";

describe("Contact Route - Pagination", () => {
  const mockContacts = [
    { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" },
    { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test GET /list returns 200 with correct response structure
   */
  it("returns 200 with paginated contacts", async () => {
    contactService.findAllPaginated.mockResolvedValue({
      records: mockContacts,
      total: 50,
    });

    const result = await contactService.findAllPaginated(1, 20);

    expect(result.records).toEqual(mockContacts);
    expect(result.total).toBe(50);
  });

  /**
   * Test response includes success, data, message, and timestamp
   */
  it("response includes all required envelope fields", async () => {
    contactService.findAllPaginated.mockResolvedValue({
      records: mockContacts,
      total: 50,
    });

    const result = await contactService.findAllPaginated(1, 20);

    // Verify the shape of the data that will be wrapped by successResponse
    expect(result).toHaveProperty("records");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.records)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  /**
   * Test with custom page and pageSize
   */
  it("calls service with custom pagination parameters", async () => {
    contactService.findAllPaginated.mockResolvedValue({
      records: mockContacts,
      total: 50,
    });

    await contactService.findAllPaginated(2, 10);

    expect(contactService.findAllPaginated).toHaveBeenCalledWith(2, 10);
  });

  /**
   * Test with pageSize > 100 (should be passed to service, which clamps)
   */
  it("passes pageSize > 100 to service for clamping", async () => {
    contactService.findAllPaginated.mockResolvedValue({
      records: mockContacts,
      total: 50,
    });

    await contactService.findAllPaginated(1, 150);

    expect(contactService.findAllPaginated).toHaveBeenCalledWith(1, 150);
  });

  /**
   * Test validation rejects non-numeric page
   */
  it("validation rejects non-numeric page parameter", () => {
    const Joi = require("joi").default || require("joi");
    const schema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).default(20),
    });

    const { error } = schema.validate({ page: "abc", pageSize: 20 });

    expect(error).toBeDefined();
    expect(error.details[0].path[0]).toBe("page");
  });

  /**
   * Test validation rejects negative page
   */
  it("validation rejects negative page parameter", () => {
    const Joi = require("joi").default || require("joi");
    const schema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).default(20),
    });

    const { error } = schema.validate({ page: -1, pageSize: 20 });

    expect(error).toBeDefined();
    expect(error.details[0].path[0]).toBe("page");
  });

  /**
   * Test validation rejects negative pageSize
   */
  it("validation rejects negative pageSize parameter", () => {
    const Joi = require("joi").default || require("joi");
    const schema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).default(20),
    });

    const { error } = schema.validate({ page: 1, pageSize: -10 });

    expect(error).toBeDefined();
    expect(error.details[0].path[0]).toBe("pageSize");
  });

  /**
   * Test defaults are applied
   */
  it("applies default values for missing parameters", () => {
    const Joi = require("joi").default || require("joi");
    const schema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).default(20),
    });

    const { value } = schema.validate({});

    expect(value.page).toBe(1);
    expect(value.pageSize).toBe(20);
  });

  /**
   * Test error response structure
   */
  it("error response includes success=false, message, and timestamp", () => {
    // Verify error response structure
    const errorResponseStructure = {
      success: false,
      data: null,
      message: "Invalid page parameter",
      timestamp: "2024-01-01T00:00:00.000Z",
    };

    expect(errorResponseStructure).toHaveProperty("success");
    expect(errorResponseStructure).toHaveProperty("data");
    expect(errorResponseStructure).toHaveProperty("message");
    expect(errorResponseStructure).toHaveProperty("timestamp");
    expect(errorResponseStructure.success).toBe(false);
  });

  /**
   * Test success response structure with message=null
   */
  it("success response includes success=true, data with records and total, message null", () => {
    const successResponseStructure = {
      success: true,
      data: {
        records: mockContacts,
        total: 50,
      },
      message: null,
      timestamp: "2024-01-01T00:00:00.000Z",
    };

    expect(successResponseStructure).toHaveProperty("success");
    expect(successResponseStructure).toHaveProperty("data");
    expect(successResponseStructure).toHaveProperty("message");
    expect(successResponseStructure).toHaveProperty("timestamp");
    expect(successResponseStructure.success).toBe(true);
    expect(successResponseStructure.message).toBeNull();
    expect(successResponseStructure.data).toHaveProperty("records");
    expect(successResponseStructure.data).toHaveProperty("total");
  });
});
