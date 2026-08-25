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

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Default mock implementation - API returns { data: { data: [...], total: number } }
    contactsService.getAll.mockResolvedValue({
      data: { data: mockContacts, total: mockContacts.length },
    });
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
    expect(contactsService.getAll).toHaveBeenCalledTimes(1);
  });

  /**
   * Test auto-fetch can be disabled
   */
  it("does not fetch when autoFetch is false", () => {
    renderHook(() => useContacts({ autoFetch: false }));

    expect(contactsService.getAll).not.toHaveBeenCalled();
  });

  /**
   * Test error handling
   */
  it("handles fetch errors", async () => {
    // Suppress expected console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const error = new Error("Network error");
    contactsService.getAll.mockRejectedValue(error);

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

    // Delete contact with id 1
    await act(async () => {
      await result.current.deleteContact(1);
    });

    // Contact should be removed from state
    expect(result.current.contacts).toHaveLength(1);
    expect(result.current.contacts[0].id).toBe(2);
  });

  /**
   * Test pagination: fetchContacts accepts page parameter
   */
  it("fetches contacts with page parameter", async () => {
    const { result } = renderHook(() => useContacts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Call fetchContacts with page 2
    await act(async () => {
      await result.current.fetchContacts(2);
    });

    // Service should have been called with page parameter
    expect(contactsService.getAll).toHaveBeenCalledWith(2, 20);
  });

  /**
   * Test pagination: total count is exposed
   */
  it("exposes total count from paginated response", async () => {
    const { result } = renderHook(() => useContacts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Total should match the mocked value
    expect(result.current.total).toBe(mockContacts.length);
  });

  /**
   * Test pagination: page state is tracked
   */
  it("tracks current page state", async () => {
    const { result } = renderHook(() => useContacts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Page should default to 1
    expect(result.current.page).toBe(1);

    // Change page
    await act(async () => {
      await result.current.fetchContacts(2);
    });

    // Page should be updated
    expect(result.current.page).toBe(2);
  });

  /**
   * Test pagination: service is called with page and pageSize
   */
  it("passes page and pageSize to service", async () => {
    const { result } = renderHook(() => useContacts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Call fetchContacts with page 3
    await act(async () => {
      await result.current.fetchContacts(3);
    });

    // Service should have been called with both parameters
    expect(contactsService.getAll).toHaveBeenCalledWith(3, 20);
  });
});
