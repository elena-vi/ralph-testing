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
  DEFAULT_PAGE_SIZE: 20,
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
   * Test initial data fetching on mount
   */
  it("fetches contacts on mount with currentPage", async () => {
    const { result } = renderHook(() => useContacts({ currentPage: 1 }));

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Contacts should be populated
    expect(result.current.contacts).toEqual(mockContacts);
    expect(contactsService.getAll).toHaveBeenCalledWith(1, 20);

    // Hook should return currentPage and goToPage
    expect(result.current.currentPage).toBe(1);
    expect(result.current.goToPage).toBeDefined();
    expect(typeof result.current.goToPage).toBe("function");
  });

  /**
   * Test auto-fetch can be disabled
   */
  it("does not fetch when autoFetch is false", () => {
    renderHook(() => useContacts({ currentPage: 1, autoFetch: false }));

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

    const { result } = renderHook(() => useContacts({ currentPage: 1 }));

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

    const { result } = renderHook(() => useContacts({ currentPage: 1 }));

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
  it("returns pagination state", async () => {
    contactsService.getAll.mockResolvedValue({
      data: {
        records: mockContacts,
        total: 45,
      },
    });

    const { result } = renderHook(() => useContacts({ currentPage: 1 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Check pagination state
    expect(result.current.pageSize).toBe(20);
    expect(result.current.total).toBe(45);
  });

  /**
   * Test fetches correct page when currentPage prop changes
   */
  it("fetches new page when currentPage prop changes", async () => {
    const { rerender } = renderHook(({ page }) => useContacts({ currentPage: page }), {
      initialProps: { page: 1 },
    });

    await waitFor(() => {
      expect(contactsService.getAll).toHaveBeenCalledWith(1, 20);
    });

    // Change to page 2
    rerender({ page: 2 });

    await waitFor(() => {
      expect(contactsService.getAll).toHaveBeenCalledWith(2, 20);
    });
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

    const { result } = renderHook(() => useContacts({ currentPage: 1 }));

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

  /**
   * Edge Case 3: Test that createContact preserves current page
   */
  it("preserves current page when creating contact on page 2", async () => {
    contactsService.getAll.mockResolvedValue({
      data: {
        records: mockContacts,
        total: 50,
      },
    });
    contactsService.create.mockResolvedValue({
      success: true,
      data: { id: 3, firstName: "Bob", lastName: "Wilson", email: "bob@example.com" },
    });

    const { result } = renderHook(() => useContacts({ currentPage: 2 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify getAll was called with page 2
    expect(contactsService.getAll).toHaveBeenCalledWith(2, 20);

    await act(async () => {
      await result.current.createContact({
        firstName: "Bob",
        lastName: "Wilson",
        email: "bob@example.com",
      });
    });

    // Verify refresh also called with page 2
    expect(contactsService.getAll).toHaveBeenCalledWith(2, 20);
  });

  /**
   * Edge Case 4: Test deleteContact when page becomes empty
   */
  it("returns after delete when page still has contacts", async () => {
    contactsService.getAll.mockResolvedValue({
      data: {
        records: mockContacts,
        total: 50,
      },
    });
    contactsService.delete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useContacts({ currentPage: 2 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Page still has contacts after delete
    contactsService.getAll.mockResolvedValue({
      data: {
        records: mockContacts,
        total: 49,
      },
    });

    await act(async () => {
      await result.current.deleteContact(1);
    });

    // Should stay on page 2 because page still has content
    expect(result.current.contacts).toHaveLength(2);
  });

  /**
   * Edge Case 4: Test deleteContact reloads current page
   */
  it("reloads current page after delete", async () => {
    const oneContact = [{ id: 3, firstName: "Bob", lastName: "Wilson", email: "bob@example.com" }];

    contactsService.getAll.mockResolvedValueOnce({
      data: {
        records: oneContact,
        total: 21,
      },
    });
    contactsService.delete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useContacts({ currentPage: 2 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // After delete, reload page 2 (now with fewer contacts)
    contactsService.getAll.mockResolvedValueOnce({
      data: {
        records: [], // Page 2 is now empty
        total: 20,
      },
    });

    await act(async () => {
      await result.current.deleteContact(3);
    });

    // Component's clamp effect will handle moving to valid page if needed
    // Hook just reloads current page
    expect(contactsService.getAll).toHaveBeenLastCalledWith(2, 20);
  });

  /**
   * Test goToPage function directly
   * Verifies it calls the onPageChange callback with correct page number
   */
  it("goToPage calls onPageChange callback with page number", async () => {
    const mockOnPageChange = vi.fn();

    const { result } = renderHook(() =>
      useContacts({ currentPage: 1, onPageChange: mockOnPageChange })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Call goToPage with page 2
    act(() => {
      result.current.goToPage(2);
    });

    // Verify onPageChange was called with page 2
    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  /**
   * Test goToPage when onPageChange is not provided
   * Should not throw an error
   */
  it("goToPage handles missing onPageChange gracefully", async () => {
    const { result } = renderHook(() => useContacts({ currentPage: 1 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should not throw when onPageChange is undefined
    expect(() => {
      act(() => {
        result.current.goToPage(2);
      });
    }).not.toThrow();
  });
});
