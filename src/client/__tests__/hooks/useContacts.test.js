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

    // Default mock implementation
    contactsService.getAll.mockResolvedValue({
      data: {
        records: mockContacts,
        total: 2,
      },
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

    // Mock the post-delete response
    contactsService.getAll.mockResolvedValue({
      data: {
        records: [mockContacts[1]], // Only Jane remains
        total: 1,
      },
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
   * Test pagination state
   */
  it("returns pagination state with defaults", async () => {
    contactsService.getAll.mockResolvedValue({
      data: {
        records: mockContacts,
        total: 45,
      },
    });

    const { result } = renderHook(() => useContacts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Check pagination state
    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.total).toBe(45);
  });

  /**
   * Test goToPage function
   */
  it("calls getAll with correct page and pageSize parameters", async () => {
    contactsService.getAll.mockResolvedValue({
      data: {
        records: mockContacts,
        total: 100,
      },
    });

    const { result } = renderHook(() => useContacts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Call goToPage with page 2
    await act(async () => {
      await result.current.goToPage(2);
    });

    // Verify getAll was called with correct parameters
    expect(contactsService.getAll).toHaveBeenCalledWith(2, 20);
  });

  /**
   * Test goToPage updates currentPage
   */
  it("updates currentPage when calling goToPage", async () => {
    contactsService.getAll.mockResolvedValue({
      data: {
        records: mockContacts,
        total: 100,
      },
    });

    const { result } = renderHook(() => useContacts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.currentPage).toBe(1);

    await act(async () => {
      await result.current.goToPage(3);
    });

    expect(result.current.currentPage).toBe(3);
  });

  /**
   * Test create updates total count
   */
  it("updates total count after creating a contact", async () => {
    contactsService.getAll.mockResolvedValue({
      data: {
        records: mockContacts,
        total: 2,
      },
    });
    contactsService.create.mockResolvedValue({
      success: true,
      data: { id: 3, firstName: "Bob", lastName: "Wilson", email: "bob@example.com" },
    });

    const { result } = renderHook(() => useContacts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.total).toBe(2);

    // Mock updated response after create
    contactsService.getAll.mockResolvedValue({
      data: {
        records: mockContacts,
        total: 3,
      },
    });

    await act(async () => {
      await result.current.createContact({
        firstName: "Bob",
        lastName: "Wilson",
        email: "bob@example.com",
      });
    });

    expect(result.current.total).toBe(3);
  });
});
