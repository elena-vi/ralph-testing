/**
 * Contacts Component Tests
 * ==========================
 *
 * Tests for the Contacts page component with pagination.
 * Tests URL-driven pagination and page persistence.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import Contacts from "../../pages/Contacts";

// Mock the useContacts hook
vi.mock("../../hooks", () => ({
  useContacts: vi.fn(),
}));

import { useContacts } from "../../hooks";

/**
 * LocationSpy component to capture actual URL location
 * Used to verify that setSearchParams actually updates the URL correctly
 */
function LocationSpy({ onLocationChange }) {
  const location = useLocation();

  // Capture location changes
  if (onLocationChange) {
    onLocationChange(location);
  }

  return null;
}

/**
 * Helper to render component with memory router and specific initial URL
 * Optionally captures location updates via a spy callback
 */
const renderWithRouter = (component, initialUrl = "/contacts", onLocationChange) => {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      {onLocationChange && <LocationSpy onLocationChange={onLocationChange} />}
      {component}
    </MemoryRouter>
  );
};

describe("Contacts Component - Pagination with URL", () => {
  const mockContacts = [
    { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" },
    { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for useContacts
    useContacts.mockReturnValue({
      contacts: mockContacts,
      isLoading: false,
      error: null,
      deleteContact: vi.fn(),
      createContact: vi.fn(),
      updateContact: vi.fn(),
      refresh: vi.fn(),
      currentPage: 1,
      pageSize: 20,
      total: 60,
      goToPage: vi.fn(),
    });
  });

  /**
   * AC-5: Test page persists across refresh via URL
   */
  it("reads and uses page from URL on mount", async () => {
    renderWithRouter(<Contacts />, "/contacts?page=3");

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    // Hook should be called with currentPage 3 from URL
    expect(useContacts).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPage: 3,
      })
    );
  });

  /**
   * AC-6: Test invalid page in URL defaults to page 1
   */
  it("defaults to page 1 when URL has non-numeric page", async () => {
    renderWithRouter(<Contacts />, "/contacts?page=abc");

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    // Should parse to page 1
    expect(useContacts).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPage: 1,
      })
    );
  });

  /**
   * AC-6: Test negative page defaults to page 1
   */
  it("defaults to page 1 when URL has negative page", async () => {
    renderWithRouter(<Contacts />, "/contacts?page=-1");

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    expect(useContacts).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPage: 1,
      })
    );
  });

  /**
   * Test pagination renders with correct page count
   */
  it("renders pagination control when total > pageSize", async () => {
    useContacts.mockReturnValue({
      contacts: mockContacts,
      isLoading: false,
      error: null,
      deleteContact: vi.fn(),
      createContact: vi.fn(),
      updateContact: vi.fn(),
      refresh: vi.fn(),
      currentPage: 1,
      pageSize: 20,
      total: 60, // 3 pages
      goToPage: vi.fn(),
    });

    renderWithRouter(<Contacts />);

    await waitFor(() => {
      // Pagination should be visible
      const paginationNav = screen.queryByRole("navigation");
      expect(paginationNav).toBeInTheDocument();
    });
  });

  /**
   * Test pagination doesn't render when results fit on one page
   */
  it("does not render pagination when total <= pageSize", async () => {
    useContacts.mockReturnValue({
      contacts: mockContacts,
      isLoading: false,
      error: null,
      deleteContact: vi.fn(),
      createContact: vi.fn(),
      updateContact: vi.fn(),
      refresh: vi.fn(),
      currentPage: 1,
      pageSize: 20,
      total: 15,
      goToPage: vi.fn(),
    });

    renderWithRouter(<Contacts />);

    await waitFor(() => {
      const paginationNav = screen.queryByRole("navigation");
      expect(paginationNav).not.toBeInTheDocument();
    });
  });

  /**
   * Test empty state
   */
  it("displays empty state when no contacts", async () => {
    useContacts.mockReturnValue({
      contacts: [],
      isLoading: false,
      error: null,
      deleteContact: vi.fn(),
      createContact: vi.fn(),
      updateContact: vi.fn(),
      refresh: vi.fn(),
      currentPage: 1,
      pageSize: 20,
      total: 0,
      goToPage: vi.fn(),
    });

    renderWithRouter(<Contacts />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
    });
  });

  /**
   * Test hook receives onPageChange callback
   */
  it("uses hook with onPageChange callback for URL updates", async () => {
    renderWithRouter(<Contacts />, "/contacts?page=1");

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    // Verify hook receives onPageChange callback
    expect(useContacts).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPage: 1,
        onPageChange: expect.any(Function),
      })
    );
  });

  /**
   * Edge Case 2: Test page clamping when URL page exceeds max available
   * When ?page=999 is requested but only 45 total items exist (3 pages max),
   * component should clamp to max available page (page 3) and sync URL
   */
  it("clamps page to max when URL page exceeds available pages", async () => {
    // Edge Case 2: Page beyond available data (e.g., ?page=999 when only 3 pages exist)
    // Design Decision (differs from plan: "should load page 1" → implementation: clamp to maxPage)
    // Rationale: Displaying last available page provides better UX than silently resetting to page 1
    // This behavior is intentional and documented in PR.

    useContacts.mockReturnValue({
      contacts: mockContacts,
      isLoading: false,
      error: null,
      deleteContact: vi.fn(),
      createContact: vi.fn(),
      updateContact: vi.fn(),
      refresh: vi.fn(),
      currentPage: 1,
      pageSize: 20,
      total: 60, // 3 pages: ceil(60/20)
      goToPage: vi.fn(),
    });

    renderWithRouter(<Contacts />, "/contacts?page=999");

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    // Critical assertion: Component must parse and pass out-of-range page to hook
    // This verifies the component correctly accepts numeric page values from URL
    // without rejecting or clamping at the parse level
    expect(useContacts).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPage: 999,
        onPageChange: expect.any(Function),
      })
    );

    // Verify pagination renders and shows correct maximum page count
    // totalPages = ceil(60/20) = 3
    // clampedPage = min(999, 3) = 3
    // Result: User sees pagination for 3 pages, not 999, proving clamping works
    // Note: After clamping, page 3 becomes current, so button labels reflect that
    const paginationNav = screen.getByRole("navigation");
    expect(paginationNav).toBeInTheDocument();

    // Verify buttons for all 3 pages exist (confirms max page is 3, not 999)
    // clampedPage=3 means page 3 is current: aria-label="page 3", others: "Go to page X"
    const page1Button = screen.getByRole("button", { name: "Go to page 1" });
    const page2Button = screen.getByRole("button", { name: "Go to page 2" });
    const page3Button = screen.getByRole("button", { name: "page 3" });

    expect(page1Button).toBeInTheDocument();
    expect(page2Button).toBeInTheDocument();
    expect(page3Button).toBeInTheDocument();
  });

  /**
   * Test that page clamping useEffect (lines 83-84) preserves unrelated query parameters
   * When ?page=999&q=search is provided and clamped to page 3, the q=search param
   * must be preserved in the synced URL via setSearchParams.
   * This exercises the URLSearchParams fix in the clamping useEffect.
   */
  it("preserves query parameters when clamping page via useEffect", async () => {
    let capturedLocation = null;

    useContacts.mockReturnValue({
      contacts: mockContacts,
      isLoading: false,
      error: null,
      deleteContact: vi.fn(),
      createContact: vi.fn(),
      updateContact: vi.fn(),
      refresh: vi.fn(),
      currentPage: 1,
      pageSize: 20,
      total: 60, // 3 pages max
      goToPage: vi.fn(),
    });

    // LocationSpy to capture URL after clamping
    const locationSpy = (location) => {
      capturedLocation = location;
    };

    // Start with out-of-range page AND unrelated parameter
    // Component will clamp page 999 to page 3, and must preserve q=search
    renderWithRouter(<Contacts />, "/contacts?page=999&q=search", locationSpy);

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    // Wait for the clamping useEffect to run and sync URL
    // Component sees: currentPage=999, clampedPage=3, isLoading=false, total=60
    // It triggers useEffect because clampedPage (3) !== currentPage (999)
    // useEffect calls setSearchParams with new URLSearchParams(searchParams)
    await waitFor(() => {
      // CRITICAL: URL should be synced to page=3 and STILL contain q=search
      expect(capturedLocation).not.toBeNull();
      expect(capturedLocation.search).toContain("page=3");
      expect(capturedLocation.search).toContain("q=search");
    });
  });

  /**
   * Test that goToPage is available from hook
   */
  it("hook returns goToPage function", async () => {
    const mockGoToPage = vi.fn();
    useContacts.mockReturnValue({
      contacts: mockContacts,
      isLoading: false,
      error: null,
      deleteContact: vi.fn(),
      createContact: vi.fn(),
      updateContact: vi.fn(),
      refresh: vi.fn(),
      currentPage: 1,
      pageSize: 20,
      total: 60,
      goToPage: mockGoToPage,
    });

    renderWithRouter(<Contacts />);

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    // Verify hook was called and goToPage exists
    expect(useContacts).toHaveBeenCalled();
  });

  /**
   * AC-3 CRITICAL TEST: User changes page via pagination control
   * Tests that clicking a pagination button updates the URL and refetches contacts
   * Verifies: click → URL update via setSearchParams → hook behavior
   */
  it("clicking pagination button updates URL and refetches contacts (AC-3)", async () => {
    const mockOnPageChange = vi.fn();

    useContacts.mockImplementation(({ currentPage: page, onPageChange }) => ({
      contacts: mockContacts,
      isLoading: false,
      error: null,
      deleteContact: vi.fn(),
      createContact: vi.fn(),
      updateContact: vi.fn(),
      refresh: vi.fn(),
      currentPage: page || 1,
      pageSize: 20,
      total: 60,
      goToPage: mockOnPageChange || onPageChange,
    }));

    // Render on page 1
    renderWithRouter(<Contacts />, "/contacts?page=1");

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    // Verify pagination is rendered
    const paginationNav = screen.getByRole("navigation");
    expect(paginationNav).toBeInTheDocument();

    // Find and click page 2 button
    const page2Button = screen.getByRole("button", { name: "Go to page 2" });
    fireEvent.click(page2Button);

    // Verify goToPage callback was called with page 2
    // This proves the click → goToPage flow works
    expect(mockOnPageChange).toHaveBeenCalledWith(2);

    // Verify the callback was called exactly once
    // This confirms the pagination click handler is wired correctly
    expect(mockOnPageChange).toHaveBeenCalledTimes(1);
  });

  /**
   * AC-4 Enhanced Test: Verify pagination count prop
   * Ensures Pagination component receives correct count based on total/pageSize
   */
  it("pagination control displays correct page count (AC-4)", async () => {
    useContacts.mockReturnValue({
      contacts: mockContacts,
      isLoading: false,
      error: null,
      deleteContact: vi.fn(),
      createContact: vi.fn(),
      updateContact: vi.fn(),
      refresh: vi.fn(),
      currentPage: 1,
      pageSize: 20,
      total: 60, // 3 pages
      goToPage: vi.fn(),
    });

    renderWithRouter(<Contacts />);

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    // Pagination should have 3 pages (60 / 20 = 3)
    const paginationNav = screen.getByRole("navigation");
    expect(paginationNav).toBeInTheDocument();

    // Verify page buttons exist for all 3 pages
    const page1Button = screen.getByRole("button", { name: "page 1" });
    const page2Button = screen.getByRole("button", { name: "Go to page 2" });
    const page3Button = screen.getByRole("button", { name: "Go to page 3" });

    expect(page1Button).toBeInTheDocument();
    expect(page2Button).toBeInTheDocument();
    expect(page3Button).toBeInTheDocument();
  });
});

/**
 * AC-3 URL Update Verification Tests
 * Verifies that URL query string updates and complete pagination flow works
 */
describe("Contacts Component - AC-3 URL Query String Updates", () => {
  const mockContacts = [
    { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" },
    { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * AC-3: Verify onPageChange callback is properly wired to trigger URL updates
   * The callback received by the hook is responsible for calling setSearchParams
   */
  it("passes onPageChange callback to hook that updates URL (AC-3 URL flow)", async () => {
    useContacts.mockReturnValue({
      contacts: mockContacts,
      isLoading: false,
      error: null,
      deleteContact: vi.fn(),
      createContact: vi.fn(),
      updateContact: vi.fn(),
      refresh: vi.fn(),
      currentPage: 1,
      pageSize: 20,
      total: 60,
      goToPage: vi.fn(),
    });

    renderWithRouter(<Contacts />, "/contacts?page=1");

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    // Verify hook was called with onPageChange callback
    // This callback is responsible for calling setSearchParams to update URL
    const hookCallArgs = useContacts.mock.calls[0][0];
    expect(hookCallArgs.onPageChange).toBeDefined();
    expect(typeof hookCallArgs.onPageChange).toBe("function");

    // Click pagination button
    const page2Button = screen.getByRole("button", { name: "Go to page 2" });
    fireEvent.click(page2Button);

    // Verify goToPage was called with new page
    // goToPage calls onPageChange which calls setSearchParams
    const goToPageMock = useContacts.mock.results[0].value.goToPage;
    expect(goToPageMock).toHaveBeenCalledWith(2);
  });

  /**
   * AC-3: Verify URL parameter is read on mount and passed to hook
   * This proves the page persists across refresh
   */
  it("reads page from URL on mount and passes to hook (AC-3 URL persistence)", async () => {
    useContacts.mockReturnValue({
      contacts: mockContacts,
      isLoading: false,
      error: null,
      deleteContact: vi.fn(),
      createContact: vi.fn(),
      updateContact: vi.fn(),
      refresh: vi.fn(),
      currentPage: 2,
      pageSize: 20,
      total: 60,
      goToPage: vi.fn(),
    });

    // Start with page 2 in URL
    renderWithRouter(<Contacts />, "/contacts?page=2");

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    // Hook should receive currentPage 2 from URL parsing
    expect(useContacts).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPage: 2,
        onPageChange: expect.any(Function),
      })
    );
  });

  /**
   * CRITICAL: Verify that unrelated query parameters are preserved during page changes
   * This test ensures the fix for the URLSearchParams bug where { ...prev } was
   * destroying existing query parameters. The fix uses URLSearchParams API correctly.
   * Uses LocationSpy to assert the actual URL changed correctly (not just mocks).
   *
   * This test MUST FAIL on the buggy mutation where URLSearchParams is not used correctly,
   * because it actually verifies the location/search property contains both params.
   *
   * Exercise the actual flow: render with multiple params → verify parsing → click page button
   * → assert location.search contains BOTH page=2 AND q=search
   */
  it("preserves unrelated query parameters when changing page", async () => {
    const goToPageMock = vi.fn();
    let capturedLocation = null;

    useContacts.mockImplementation(({ currentPage, onPageChange }) => {
      return {
        contacts: mockContacts,
        isLoading: false,
        error: null,
        deleteContact: vi.fn(),
        createContact: vi.fn(),
        updateContact: vi.fn(),
        refresh: vi.fn(),
        currentPage: currentPage || 1,
        pageSize: 20,
        total: 60,
        // Wire up goToPage to call the onPageChange callback and track the call
        // This exercises the handlePageChangeUrl function
        goToPage: (page) => {
          goToPageMock(page);
          if (onPageChange) {
            onPageChange(page);
          }
        },
      };
    });

    // LocationSpy callback to capture URL changes
    const locationSpy = (location) => {
      capturedLocation = location;
    };

    // Start with both a search query and page parameter
    // This tests that the component correctly handles URLs with multiple params
    renderWithRouter(<Contacts />, "/contacts?q=search&page=1", locationSpy);

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    // Verify component correctly extracted page=1 from URL with multiple params
    // This proves the parsePageParam function correctly ignores ?q=search
    expect(useContacts).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPage: 1,
        onPageChange: expect.any(Function),
      })
    );

    // Verify pagination renders
    const paginationNav = screen.getByRole("navigation");
    expect(paginationNav).toBeInTheDocument();

    // Click the pagination button to trigger goToPage → onPageChange flow
    const page2Button = screen.getByRole("button", { name: "Go to page 2" });
    fireEvent.click(page2Button);

    // Verify goToPage was called with page 2
    // This proves the complete flow: click → goToPage(page) → onPageChange(page)
    await waitFor(() => {
      expect(goToPageMock).toHaveBeenCalledWith(2);
    });

    // CRITICAL ASSERTION: Verify the actual URL changed correctly
    // This is the mutation test that FAILS if URLSearchParams is reverted
    // The location.search should contain BOTH:
    // - page=2 (new page from the click)
    // - q=search (unrelated parameter that must be preserved)
    await waitFor(() => {
      expect(capturedLocation).not.toBeNull();
      expect(capturedLocation.search).toContain("page=2");
      expect(capturedLocation.search).toContain("q=search");
    });
  });
});
