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
import { toast } from "react-toastify";

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
   * Test pagination: fetchContacts accepts page parameter
   */
  it("refetches with correct page on fetchContacts", async () => {
    const { result } = renderHook(() => useContacts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Fetch page 2
    await act(async () => {
      await result.current.fetchContacts(2);
    });

    // Service should have been called with page 2
    expect(contactsService.getAll).toHaveBeenLastCalledWith(2, 20);
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

  /**
   * Test error handling during pagination
   */
  it("shows error toast when fetchContacts fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Network error");
    contactsService.getAll.mockRejectedValue(error);

    const { result } = renderHook(() => useContacts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Error toast should have been shown
    expect(toast.error).toHaveBeenCalledWith("Failed to fetch contacts");

    consoleSpy.mockRestore();
  });

  /**
   * Test error state is set on fetch failure
   */
  it("sets error state when fetch fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Network error");
    contactsService.getAll.mockRejectedValue(error);

    const { result } = renderHook(() => useContacts());

    await waitFor(() => {
      expect(result.current.error).toBe(error);
    });

    consoleSpy.mockRestore();
  });

  /**
   * Test stale-response guard prevents out-of-order responses
   */
  it("ignores stale responses from previous requests", async () => {
    // Track the call count to know which page was requested
    let callCount = 0;
    contactsService.getAll.mockImplementation(async (page) => {
      callCount++;
      const currentCall = callCount;

      // Simulate varying network delays:
      // First call (page 2) takes longer (30ms)
      // Second call (page 1) is faster (10ms)
      const delay = page === 2 ? 30 : 10;
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Only return if this call is still the latest
      if (currentCall === 1) {
        return {
          data: {
            data: [{ id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com" }],
            total: 20,
          },
        };
      } else {
        return {
          data: {
            data: [{ id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" }],
            total: 10,
          },
        };
      }
    });

    const { result } = renderHook(() => useContacts({ autoFetch: false }));

    // Make two quick requests
    await act(async () => {
      result.current.fetchContacts(2);
      result.current.fetchContacts(1);
    });

    // Wait for both to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should show page 1 data from the latest request, not stale page 2 data
    expect(result.current.contacts).toHaveLength(1);
    expect(result.current.contacts[0].id).toBe(1);
    expect(result.current.total).toBe(10);
  });

  /**
   * Test total is decremented on delete
   */
  it("decrements total count after successful delete", async () => {
    contactsService.delete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useContacts());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialTotal = result.current.total;

    // Delete contact with id 1
    await act(async () => {
      await result.current.deleteContact(1);
    });

    // Total should be decremented
    expect(result.current.total).toBe(initialTotal - 1);
  });

  /**
   * Test delete revert fetches current page
   */
  it("refetches current page when delete fails", async () => {
    const error = new Error("Delete failed");
    contactsService.delete.mockRejectedValue(error);

    const { result } = renderHook(() => useContacts());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear the mock to only count calls from now on
    vi.clearAllMocks();

    // Attempt to delete - should fail and revert
    await act(async () => {
      try {
        await result.current.deleteContact(1);
      } catch {
        // Expected to throw
      }
    });

    // Should refetch with current page (page 1, the default)
    expect(contactsService.getAll).toHaveBeenCalledWith(1, 20);
  });

  /**
   * Test update revert fetches current page
   */
  it("refetches current page when update fails", async () => {
    const error = new Error("Update failed");
    contactsService.update.mockRejectedValue(error);

    const { result } = renderHook(() => useContacts());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Fetch page 2 to set current page
    await act(async () => {
      await result.current.fetchContacts(2);
    });

    // Clear mocks to count only the calls from now on
    vi.clearAllMocks();

    // Now attempt update - should fail and revert to page 2
    await act(async () => {
      try {
        await result.current.updateContact(1, { firstName: "Updated" });
      } catch {
        // Expected to throw
      }
    });

    // Should refetch with page 2 (the current page)
    expect(contactsService.getAll).toHaveBeenCalledWith(2, 20);
  });

  /**
   * Test PAGE_SIZE constant is used
   */
  it("uses PAGE_SIZE from constants", async () => {
    const { result } = renderHook(() => useContacts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Service should have been called with PAGE_SIZE (20)
    expect(contactsService.getAll).toHaveBeenCalledWith(1, 20);
  });

  /**
   * Test createContact with current page
   */
  it("refetches current page after create", async () => {
    contactsService.create.mockResolvedValue({ data: { id: 3, ...mockContacts[0] } });

    const { result } = renderHook(() => useContacts());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Fetch page 2
    await act(async () => {
      await result.current.fetchContacts(2);
    });

    vi.clearAllMocks();

    // Create contact
    await act(async () => {
      await result.current.createContact({
        firstName: "New",
        lastName: "Contact",
        email: "new@example.com",
      });
    });

    // Should refetch page 2 (the current page)
    expect(contactsService.getAll).toHaveBeenCalledWith(2, 20);
  });
});
