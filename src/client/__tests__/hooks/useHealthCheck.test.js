/**
 * useHealthCheck Hook Tests
 * =========================
 *
 * Tests for the health check hook that verifies database connectivity
 * and fetches basic statistics with the new paginated response format.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useHealthCheck, ConnectionStatus } from "../../hooks/useHealthCheck.js";
import * as services from "../../services/index.js";

describe("useHealthCheck", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test: Hook reads contacts total from paginated response structure
   */
  it("reads contacts total from paginated response with data.total", async () => {
    const mockContactsResponse = {
      data: {
        data: [
          { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" },
          { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
        ],
        total: 50,
      },
    };

    vi.spyOn(services.healthService, "check").mockResolvedValue({ data: null });
    vi.spyOn(services.contactsService, "getAll").mockResolvedValue(mockContactsResponse);
    vi.spyOn(services.tasksService, "getAll").mockResolvedValue({ data: [] });
    vi.spyOn(services.projectsService, "getAll").mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useHealthCheck());

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(result.current.status).toBe(ConnectionStatus.CONNECTED);
    expect(result.current.stats).toEqual({
      contacts: 50, // Uses total from paginated response, not array length
      tasks: 0,
      projects: 0,
    });
  });

  /**
   * Test: Hook correctly uses total field even with many contacts
   */
  it("correctly extracts total from paginated response with 100+ total contacts", async () => {
    const mockContactsResponse = {
      data: {
        data: Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          firstName: `First${i + 1}`,
          lastName: `Last${i + 1}`,
          email: `user${i + 1}@example.com`,
        })),
        total: 250, // More total contacts than on this page
      },
    };

    vi.spyOn(services.healthService, "check").mockResolvedValue({ data: null });
    vi.spyOn(services.contactsService, "getAll").mockResolvedValue(mockContactsResponse);
    vi.spyOn(services.tasksService, "getAll").mockResolvedValue({ data: [] });
    vi.spyOn(services.projectsService, "getAll").mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useHealthCheck());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Should show 250 total contacts, not 20 (which is array length)
    expect(result.current.stats.contacts).toBe(250);
  });

  /**
   * Test: Hook handles missing total field gracefully
   */
  it("defaults to 0 contacts when total is missing from response", async () => {
    vi.spyOn(services.healthService, "check").mockResolvedValue({ data: null });
    vi.spyOn(services.contactsService, "getAll").mockResolvedValue({ data: {} }); // Missing total
    vi.spyOn(services.tasksService, "getAll").mockResolvedValue({ data: [] });
    vi.spyOn(services.projectsService, "getAll").mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useHealthCheck());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(result.current.stats.contacts).toBe(0);
  });

  /**
   * Test: Hook handles service errors gracefully
   */
  it("handles connection errors gracefully", async () => {
    vi.spyOn(services.healthService, "check").mockRejectedValue(new Error("Server not responding"));

    const { result } = renderHook(() => useHealthCheck());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.status).toBe(ConnectionStatus.ERROR);
    expect(result.current.stats).toBe(null);
  });
});
