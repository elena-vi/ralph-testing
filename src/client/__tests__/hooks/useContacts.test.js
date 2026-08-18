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
    getAll: vi.fn(),
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
    contactsService.getAll.mockResolvedValue({ data: mockContacts });
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
    expect(contactsService.getPaginated).toHaveBeenCalledWith(1, 20);
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

    // Delete contact with id 1
    await act(async () => {
      await result.current.deleteContact(1);
    });

    // Contact should be removed from state
    expect(result.current.contacts).toHaveLength(1);
    expect(result.current.contacts[0].id).toBe(2);
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
    expect(contactsService.getPaginated).toHaveBeenCalledWith(2, 20);

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
    expect(contactsService.getPaginated).toHaveBeenCalledWith(1, 20);
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
      expect(contactsService.getPaginated).toHaveBeenCalledWith(1, 20);
    });

    // Clear call count
    vi.clearAllMocks();
    contactsService.getPaginated.mockResolvedValue(mockPaginatedResponse);

    // Change page prop to 2
    rerender({ page: 2 });

    // Should fetch with new page value
    await waitFor(() => {
      expect(contactsService.getPaginated).toHaveBeenCalledWith(2, 20);
    });
  });
});
