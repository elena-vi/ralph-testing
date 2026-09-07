/**
 * useHealthCheck Hook Tests
 * ==========================
 *
 * Tests for the useHealthCheck custom hook.
 * Verifies health check initialization, connection status, and retry logic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
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

// Mock react-toastify
vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import mocked services after mock setup
import { healthService, contactsService, tasksService, projectsService } from "../../services";

describe("useHealthCheck Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    healthService.check.mockResolvedValue({ success: true });
    contactsService.getAll.mockResolvedValue({ data: [{ id: 1 }] });
    tasksService.getAll.mockResolvedValue({ data: [{ id: 1 }] });
    projectsService.getAll.mockResolvedValue({ data: [{ id: 1 }] });
  });

  describe("initialization", () => {
    it("starts in CHECKING state", () => {
      const { result } = renderHook(() => useHealthCheck());

      expect(result.current.status).toBe(ConnectionStatus.CHECKING);
      expect(result.current.isChecking).toBe(true);
    });

    it("checks connection on mount", async () => {
      renderHook(() => useHealthCheck());

      await waitFor(() => {
        expect(healthService.check).toHaveBeenCalled();
      });
    });

    it("transitions to CONNECTED on successful health check", async () => {
      const { result } = renderHook(() => useHealthCheck());

      await waitFor(() => {
        expect(result.current.status).toBe(ConnectionStatus.CONNECTED);
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.isError).toBe(false);
    });
  });

  describe("stats collection", () => {
    it("fetches and populates stats on connection", async () => {
      const { result } = renderHook(() => useHealthCheck());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      expect(result.current.stats).toEqual({
        contacts: 1,
        tasks: 1,
        projects: 1,
      });
    });

    it("handles partial data failures", async () => {
      tasksService.getAll.mockRejectedValue(new Error("Tasks not available"));
      projectsService.getAll.mockRejectedValue(new Error("Projects not available"));

      const { result } = renderHook(() => useHealthCheck());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      expect(result.current.stats).toEqual({
        contacts: 1,
        tasks: 0,
        projects: 0,
      });
    });
  });

  describe("error handling", () => {
    it("transitions to ERROR when health check fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      healthService.check.mockRejectedValue(new Error("Server not responding"));

      const { result } = renderHook(() => useHealthCheck());

      await waitFor(() => {
        expect(result.current.status).toBe(ConnectionStatus.ERROR);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.stats).toBeNull();

      consoleSpy.mockRestore();
    });

    it("clears stats on error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      healthService.check.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useHealthCheck());

      await waitFor(() => {
        expect(result.current.stats).toBeNull();
      });

      consoleSpy.mockRestore();
    });
  });

  describe("retry functionality", () => {
    it("provides a retry function", async () => {
      const { result } = renderHook(() => useHealthCheck());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      expect(typeof result.current.retry).toBe("function");
    });

    it("retries connection check when retry is called", async () => {
      const { result } = renderHook(() => useHealthCheck());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      expect(healthService.check).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.retry();
      });

      expect(healthService.check).toHaveBeenCalledTimes(2);
    });

    it("transitions from ERROR to CHECKING on retry", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      healthService.check.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useHealthCheck());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Now make it succeed
      healthService.check.mockResolvedValue({ success: true });

      await act(async () => {
        await result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      consoleSpy.mockRestore();
    });
  });

  describe("status exports", () => {
    it("exports ConnectionStatus enum", () => {
      const { result } = renderHook(() => useHealthCheck());

      expect(result.current.ConnectionStatus).toEqual({
        CHECKING: "checking",
        CONNECTED: "connected",
        ERROR: "error",
      });
    });
  });
});
