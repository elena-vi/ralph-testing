/**
 * useHealthCheck Hook Tests
 * ==========================
 *
 * Tests for the useHealthCheck custom hook.
 * Verifies database connectivity check and stats retrieval.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useHealthCheck, ConnectionStatus } from "../../hooks/useHealthCheck";

// Mock the services
vi.mock("../../services", () => ({
  healthService: {
    check: vi.fn(),
  },
  contactsService: {
    getAll: vi.fn(),
  },
  tasksService: {
    getAll: vi.fn(),
  },
  projectsService: {
    getAll: vi.fn(),
  },
}));

import { healthService, contactsService, tasksService, projectsService } from "../../services";

describe("useHealthCheck Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test successful connection and stats retrieval
   */
  it("checks connection and retrieves stats on mount", async () => {
    healthService.check.mockResolvedValue({ success: true });
    contactsService.getAll.mockResolvedValue({
      data: { records: [], total: 42 },
    });
    tasksService.getAll.mockResolvedValue({
      data: [{ id: 1 }, { id: 2 }],
    });
    projectsService.getAll.mockResolvedValue({
      data: [{ id: 1 }],
    });

    const { result } = renderHook(() => useHealthCheck());

    // Initially checking
    expect(result.current.status).toBe(ConnectionStatus.CHECKING);

    // Wait for connection check
    await waitFor(() => {
      expect(result.current.status).toBe(ConnectionStatus.CONNECTED);
    });

    // Stats should be populated
    expect(result.current.stats).toEqual({
      contacts: 42, // Using total from new response format
      tasks: 2,
      projects: 1,
    });
  });

  /**
   * Test contact stats use total from new response format
   */
  it("correctly reads contacts.total from paginated response", async () => {
    healthService.check.mockResolvedValue({ success: true });
    contactsService.getAll.mockResolvedValue({
      data: {
        records: [{ id: 1 }, { id: 2 }], // 2 records on this page
        total: 150, // But 150 total across all pages
      },
    });
    tasksService.getAll.mockResolvedValue({ data: [] });
    projectsService.getAll.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useHealthCheck());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Should show total count, not records.length
    expect(result.current.stats.contacts).toBe(150);
  });

  /**
   * Test handling server errors
   */
  it("sets error status when server is not responding", async () => {
    // Suppress expected console.error
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    healthService.check.mockRejectedValue(new Error("Connection failed"));

    const { result } = renderHook(() => useHealthCheck());

    await waitFor(() => {
      expect(result.current.status).toBe(ConnectionStatus.ERROR);
    });

    expect(result.current.stats).toBeNull();
    expect(result.current.isError).toBe(true);

    consoleSpy.mockRestore();
  });

  /**
   * Test retry functionality
   */
  it("retries connection on manual retry", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    healthService.check.mockRejectedValueOnce(new Error("First attempt failed"));

    const { result } = renderHook(() => useHealthCheck());

    await waitFor(() => {
      expect(result.current.status).toBe(ConnectionStatus.ERROR);
    });

    // Mock successful response for retry
    healthService.check.mockResolvedValueOnce({ success: true });
    contactsService.getAll.mockResolvedValueOnce({
      data: { records: [], total: 10 },
    });
    tasksService.getAll.mockResolvedValueOnce({ data: [] });
    projectsService.getAll.mockResolvedValueOnce({ data: [] });

    // Call retry
    await result.current.retry();

    await waitFor(() => {
      expect(result.current.status).toBe(ConnectionStatus.CONNECTED);
    });

    expect(result.current.stats.contacts).toBe(10);

    consoleSpy.mockRestore();
  });

  /**
   * Test graceful handling of task/project fetch failures
   */
  it("handles task and project fetch failures gracefully", async () => {
    healthService.check.mockResolvedValue({ success: true });
    contactsService.getAll.mockResolvedValue({
      data: { records: [], total: 5 },
    });
    tasksService.getAll.mockRejectedValue(new Error("Tasks service down"));
    projectsService.getAll.mockRejectedValue(new Error("Projects service down"));

    const { result } = renderHook(() => useHealthCheck());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Should still show contacts, tasks and projects as 0
    expect(result.current.stats).toEqual({
      contacts: 5,
      tasks: 0,
      projects: 0,
    });
  });
});
