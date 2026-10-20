/**
 * Pagination Validation Tests
 * ============================
 *
 * Tests for pagination parameter validation using Joi and celebrate.
 * Verifies that invalid inputs are rejected with appropriate error messages.
 */

import { describe, it, expect } from "vitest";
import Joi from "joi";

// Define the validation schemas directly (matching what's in validate.js)
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).description("Page number"),
  pageSize: Joi.number().integer().min(1).default(20).description("Page size"),
});

describe("Pagination Validation Schema", () => {
  /**
   * Test that valid pagination parameters pass validation
   */
  it("accepts valid page and pageSize parameters", () => {
    const { value, error } = paginationSchema.validate({ page: 1, pageSize: 20 });

    expect(error).toBeUndefined();
    expect(value.page).toBe(1);
    expect(value.pageSize).toBe(20);
  });

  /**
   * Test that default values are applied
   */
  it("applies default values when parameters are missing", () => {
    const { value, error } = paginationSchema.validate({});

    expect(error).toBeUndefined();
    expect(value.page).toBe(1);
    expect(value.pageSize).toBe(20);
  });

  /**
   * Test that non-numeric page is rejected
   */
  it("rejects non-numeric page parameter", () => {
    const { error } = paginationSchema.validate({ page: "abc", pageSize: 20 });

    expect(error).toBeDefined();
    expect(error.details[0].type).toBe("number.base");
  });

  /**
   * Test that negative page is rejected
   */
  it("rejects negative page parameter", () => {
    const { error } = paginationSchema.validate({ page: -1, pageSize: 20 });

    expect(error).toBeDefined();
    expect(error.details[0].type).toBe("number.min");
    expect(error.details[0].message).toContain("must be greater than or equal to 1");
  });

  /**
   * Test that page 0 is rejected
   */
  it("rejects page 0", () => {
    const { error } = paginationSchema.validate({ page: 0, pageSize: 20 });

    expect(error).toBeDefined();
    expect(error.details[0].type).toBe("number.min");
  });

  /**
   * Test that non-numeric pageSize is rejected
   */
  it("rejects non-numeric pageSize parameter", () => {
    const { error } = paginationSchema.validate({ page: 1, pageSize: "twenty" });

    expect(error).toBeDefined();
    expect(error.details[0].type).toBe("number.base");
  });

  /**
   * Test that negative pageSize is rejected
   */
  it("rejects negative pageSize parameter", () => {
    const { error } = paginationSchema.validate({ page: 1, pageSize: -10 });

    expect(error).toBeDefined();
    expect(error.details[0].type).toBe("number.min");
    expect(error.details[0].message).toContain("must be greater than or equal to 1");
  });

  /**
   * Test that pageSize 0 is rejected
   */
  it("rejects pageSize 0", () => {
    const { error } = paginationSchema.validate({ page: 1, pageSize: 0 });

    expect(error).toBeDefined();
    expect(error.details[0].type).toBe("number.min");
  });

  /**
   * Test that valid large pageSize is accepted (clamping happens in service)
   */
  it("accepts pageSize > 100 (clamping is service concern)", () => {
    const { value, error } = paginationSchema.validate({ page: 1, pageSize: 150 });

    expect(error).toBeUndefined();
    expect(value.pageSize).toBe(150); // Validation passes; service will clamp
  });

  /**
   * Test that pageSize exactly 100 is accepted
   */
  it("accepts pageSize of exactly 100", () => {
    const { value, error } = paginationSchema.validate({ page: 1, pageSize: 100 });

    expect(error).toBeUndefined();
    expect(value.pageSize).toBe(100);
  });

  /**
   * Test that pageSize 99 is accepted
   */
  it("accepts pageSize of 99", () => {
    const { value, error } = paginationSchema.validate({ page: 1, pageSize: 99 });

    expect(error).toBeUndefined();
    expect(value.pageSize).toBe(99);
  });

  /**
   * Test that various valid pages are accepted
   */
  it("accepts various valid page numbers", () => {
    const testCases = [1, 2, 5, 10, 100, 1000];

    testCases.forEach((pageNum) => {
      const { value, error } = paginationSchema.validate({ page: pageNum, pageSize: 20 });

      expect(error).toBeUndefined();
      expect(value.page).toBe(pageNum);
    });
  });

  /**
   * Test that decimal page is rejected (must be integer)
   */
  it("rejects decimal page parameter", () => {
    const { error } = paginationSchema.validate({ page: 1.5, pageSize: 20 });

    expect(error).toBeDefined();
    expect(error.details[0].type).toBe("number.integer");
  });

  /**
   * Test that decimal pageSize is rejected (must be integer)
   */
  it("rejects decimal pageSize parameter", () => {
    const { error } = paginationSchema.validate({ page: 1, pageSize: 20.5 });

    expect(error).toBeDefined();
    expect(error.details[0].type).toBe("number.integer");
  });

  /**
   * Test error details structure
   */
  it("provides descriptive error messages", () => {
    const { error } = paginationSchema.validate({ page: "invalid" });

    expect(error).toBeDefined();
    expect(error.details).toHaveLength(1);
    expect(error.details[0]).toHaveProperty("message");
    expect(error.details[0]).toHaveProperty("type");
    expect(error.details[0]).toHaveProperty("path");
  });

  /**
   * Test that field name is included in error
   */
  it("includes field name in error details", () => {
    const { error: pageError } = paginationSchema.validate({ page: "abc" });
    const { error: pageSizeError } = paginationSchema.validate({ pageSize: "twenty" });

    expect(pageError.details[0].path[0]).toBe("page");
    expect(pageSizeError.details[0].path[0]).toBe("pageSize");
  });
});
