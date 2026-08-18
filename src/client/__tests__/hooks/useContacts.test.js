/**
 * useContacts Hook Tests
 * ========================
 *
 * Tests for the useContacts custom hook.
 * Demonstrates testing React hooks with:
 * - renderHook from @testing-library/react
 * - Mocking API services
 * - Testing async state updates
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useContacts } from "../../hooks/useContacts";

// Mock the contacts service
vi.mock("../../services", () => ({
  contactsService: {
    getPaginated: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock react-toastify
vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import mocked service after mock setup
import { contactsService } from "../../services";

describe("useContacts Hook", () => {
  // Sample contact data
  const mockContacts = [
    { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" },
    { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
  ];

  const mockPaginatedResponse = {
    data: {
      records: mockContacts,
      total: 100,
    },
  };

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Default mock implementation
    contactsService.getPaginated.mockResolvedValue(mockPaginatedResponse);
  });

  /**
   * Test initial data fetching
   */
  it("fetches contacts on mount", async () => {
    const { result } = renderHook(() => useContacts());

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Contacts should be populated
    expect(result.current.contacts).toEqual(mockContacts);
    expect(contactsService.getPaginated).toHaveBeenCalledTimes(1);
    expect(contactsService.getPaginated).toHaveBeenCalledWith(1, 20, expect.any(AbortSignal));
  });

  /**
   * Test auto-fetch can be disabled
   */
  it("does not fetch when autoFetch is false", () => {
    renderHook(() => useContacts({ autoFetch: false }));

    expect(contactsService.getPaginated).not.toHaveBeenCalled();
  });

  /**
   * Test error handling
   */
  it("handles fetch errors", async () => {
    // Suppress expected console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const error = new Error("Network error");
    contactsService.getPaginated.mockRejectedValue(error);

    const { result } = renderHook(() => useContacts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.contacts).toEqual([]);

    consoleSpy.mockRestore();
  });

  /**
   * Test delete operation
   */
  it("deletes a contact and updates state", async () => {
    contactsService.delete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useContacts());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Initial data loaded
    expect(result.current.contacts).toEqual(mockContacts);

    // Mock the refetch after delete to return updated data
    const refetchResponse = {
      data: {
        records: [mockContacts[1]], // Only second contact remains
        total: 1,
      },
    };
    contactsService.getPaginated.mockResolvedValue(refetchResponse);

    // Delete contact with id 1
    await act(async () => {
      await result.current.deleteContact(1);
    });

    // Wait for refetch to complete
    await waitFor(() => {
      expect(result.current.contacts).toHaveLength(1);
    });

    // Contact should be removed from state
    expect(result.current.contacts[0].id).toBe(2);
  });

  /**
   * Test that total count updates after delete
   */
  it("updates total count after delete to maintain pagination consistency", async () => {
    contactsService.delete.mockResolvedValue({ success: true });
    contactsService.getPaginated.mockResolvedValue(mockPaginatedResponse);

    const { result } = renderHook(() => useContacts());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Initial total should be 100
    expect(result.current.total).toBe(100);

    // Mock the refetch after delete to return updated total
    const updatedResponse = {
      data: {
        records: [mockContacts[1]],
        total: 99, // One less after delete
      },
    };
    contactsService.getPaginated.mockResolvedValue(updatedResponse);

    // Delete contact
    await act(async () => {
      await result.current.deleteContact(1);
    });

    // Wait for the refetch to complete
    await waitFor(() => {
      expect(result.current.total).toBe(99);
    });

    // Verify refetch was called after delete
    expect(contactsService.getPaginated).toHaveBeenLastCalledWith(1, 20, expect.any(AbortSignal));
  });

  /**
   * Test pagination with initial page
   */
  it("fetches paginated contacts with initial page and stores total", async () => {
    contactsService.getPaginated.mockResolvedValue(mockPaginatedResponse);

    const { result } = renderHook(() => useContacts({ page: 2, pageSize: 20 }));

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should call getPaginated with correct params
    expect(contactsService.getPaginated).toHaveBeenCalledWith(2, 20, expect.any(AbortSignal));

    // Contacts should be populated from records
    expect(result.current.contacts).toEqual(mockContacts);

    // Total count should be stored
    expect(result.current.total).toBe(100);
  });

  /**
   * Test default page value
   */
  it("defaults to page 1 when not provided", async () => {
    contactsService.getPaginated.mockResolvedValue(mockPaginatedResponse);

    const { result } = renderHook(() => useContacts({ pageSize: 20 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should call getPaginated with page 1
    expect(contactsService.getPaginated).toHaveBeenCalledWith(1, 20, expect.any(AbortSignal));
  });

  /**
   * Test page change triggers new fetch
   */
  it("refetches when page prop changes", async () => {
    contactsService.getPaginated.mockResolvedValue(mockPaginatedResponse);

    const { rerender } = renderHook(({ page }) => useContacts({ page, pageSize: 20 }), {
      initialProps: { page: 1 },
    });

    // Wait for initial load with page 1
    await waitFor(() => {
      expect(contactsService.getPaginated).toHaveBeenCalledWith(1, 20, expect.any(AbortSignal));
    });

    // Clear call count
    vi.clearAllMocks();
    contactsService.getPaginated.mockResolvedValue(mockPaginatedResponse);

    // Change page prop to 2
    rerender({ page: 2 });

    // Should fetch with new page value
    await waitFor(() => {
      expect(contactsService.getPaginated).toHaveBeenCalledWith(2, 20, expect.any(AbortSignal));
    });
  });

  /**
   * Test rapid pagination cancels previous requests
   */
  it("cancels previous request when rapid pagination occurs", async () => {
    const page1Contacts = [
      { id: 1, firstName: "Page", lastName: "One", email: "page1@example.com" },
    ];
    const page2Contacts = [
      { id: 2, firstName: "Page", lastName: "Two", email: "page2@example.com" },
    ];

    let requestCount = 0;
    let lastSignal = null;

    contactsService.getPaginated.mockImplementation((page, pageSize, signal) => {
      requestCount++;
      lastSignal = signal;

      return new Promise((resolve) => {
        // Simulate slow request for page 1, fast for page 2
        const delay = page === 1 ? 100 : 10;
        setTimeout(() => {
          const response = {
            data: {
              records: page === 1 ? page1Contacts : page2Contacts,
              total: 100,
            },
          };
          resolve(response);
        }, delay);
      });
    });

    const { rerender } = renderHook(({ page }) => useContacts({ page, pageSize: 20 }), {
      initialProps: { page: 1 },
    });

    // Wait for page 1 request to start
    await waitFor(() => {
      expect(requestCount).toBeGreaterThan(0);
    });

    // Immediately change to page 2 before page 1 completes
    const page1Signal = lastSignal;
    rerender({ page: 2 });

    // Wait for page 2 request
    await waitFor(() => {
      expect(requestCount).toBe(2);
    });

    // Page 1 signal should have been aborted
    expect(page1Signal.aborted).toBe(true);

    // Final state should show page 2 contacts
    const { result } = renderHook(() => useContacts({ page: 2, pageSize: 20 }));

    // Wait for load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Result should be page 2 contacts
    expect(result.current.contacts).toEqual(page2Contacts);
  });
});
