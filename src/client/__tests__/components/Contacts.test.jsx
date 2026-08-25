/**
 * Contacts Component Tests
 * ========================
 *
 * Comprehensive tests for the Contacts page component covering:
 * - URL parameter reading with validation
 * - Page change handling and URL updates
 * - Hook integration with pagination
 * - Loading and error states
 * - Pagination visibility logic
 *
 * Test patterns:
 * - Mock hooks using vi.mock
 * - Render with BrowserRouter for routing support
 * - Use screen queries for accessible elements
 * - Test behavior, not implementation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Contacts from "../../pages/Contacts";

// Mock useContacts hook
vi.mock("../../hooks", () => ({
  useContacts: vi.fn(),
}));

// Mock react-toastify
vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks are set up
import { useContacts } from "../../hooks";

/**
 * Helper to render Contacts with required providers
 * Wraps in BrowserRouter to support Link and useSearchParams
 */
const renderContacts = () => {
  return render(
    <BrowserRouter>
      <Contacts />
    </BrowserRouter>
  );
};

/**
 * Mock contact data for testing
 */
const mockContacts = [
  { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" },
  { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
];

/**
 * Default mock implementation for useContacts
 */
const defaultMockHook = {
  contacts: mockContacts,
  isLoading: false,
  error: null,
  page: 1,
  total: 40, // Enough for 2 pages with pageSize=20
  fetchContacts: vi.fn(),
  deleteContact: vi.fn(),
};

describe("Contacts Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useContacts.mockReturnValue(defaultMockHook);
  });

  /**
   * URL Parameter Reading Tests
   * ============================
   * Verify that page number is correctly extracted and validated from URL
   */

  it("reads valid page number from URL query string", () => {
    // Simulate navigation to ?page=2
    window.history.pushState({}, "Test", "?page=2");

    renderContacts();

    // Should fetch page 2
    expect(useContacts().fetchContacts).toHaveBeenCalledWith(2);
  });

  it("defaults to page 1 when page parameter is missing", () => {
    // No query string
    window.history.pushState({}, "Test", "/");

    renderContacts();

    // Should fetch page 1
    expect(useContacts().fetchContacts).toHaveBeenCalledWith(1);
  });

  it("defaults to page 1 when page parameter is invalid", () => {
    // Invalid page value
    window.history.pushState({}, "Test", "?page=abc");

    renderContacts();

    // Should fetch page 1, not "abc"
    expect(useContacts().fetchContacts).toHaveBeenCalledWith(1);
  });

  it("defaults to page 1 when page is zero or negative", () => {
    // Test with zero
    window.history.pushState({}, "Test", "?page=0");
    const { unmount } = renderContacts();
    expect(useContacts().fetchContacts).toHaveBeenCalledWith(1);
    unmount();

    vi.clearAllMocks();
    useContacts.mockReturnValue(defaultMockHook);

    // Test with negative
    window.history.pushState({}, "Test", "?page=-1");
    renderContacts();
    expect(useContacts().fetchContacts).toHaveBeenCalledWith(1);
  });

  /**
   * Page Change Handling Tests
   * ============================
   * Verify that clicking pagination updates the URL and triggers data fetch
   */

  it("updates URL when pagination page is changed", () => {
    renderContacts();

    // Find pagination navigation - all links/buttons should be present
    const paginationNav = screen.getByRole("navigation");
    expect(paginationNav).toBeInTheDocument();

    // Find the page 2 button by querying all buttons and finding the one with "2"
    // MUI Pagination renders buttons inside the nav element
    const buttons = Array.from(paginationNav.querySelectorAll("button"));
    const pageButton = buttons.find((btn) => btn.textContent.trim() === "2");

    expect(pageButton).toBeDefined();
    fireEvent.click(pageButton);

    // URL should now contain ?page=2
    expect(window.location.search).toContain("page=2");
  });

  it("calls fetchContacts when page URL parameter changes", () => {
    // Start with page 2 in the URL
    window.history.pushState({}, "Test", "?page=2");

    const mockFetchContacts = vi.fn();
    useContacts.mockReturnValue({
      ...defaultMockHook,
      fetchContacts: mockFetchContacts,
    });

    renderContacts();

    // Should fetch page 2 based on URL
    expect(mockFetchContacts).toHaveBeenCalledWith(2);
  });

  /**
   * Hook Integration Tests
   * ============================
   * Verify that the component correctly calls the hook and passes data to child components
   */

  it("passes correct props to Pagination component", () => {
    renderContacts();

    // Pagination should be rendered with correct props
    // Total=40 with pageSize=20 should give 2 pages
    const paginationNav = screen.getByRole("navigation");
    expect(paginationNav).toBeInTheDocument();

    // Should have multiple pagination buttons
    const buttons = paginationNav.querySelectorAll("button");
    // At minimum: previous button, page 1, page 2, next button
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it("displays contact data from hook in table", () => {
    renderContacts();

    // Check that contact data is displayed
    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByText("Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();

    expect(screen.getByText("Jane")).toBeInTheDocument();
    expect(screen.getByText("Smith")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  /**
   * Loading and Error States Tests
   * ============================
   * Verify that loading and error states display correctly
   */

  it("displays loading state while fetching", () => {
    useContacts.mockReturnValue({
      ...defaultMockHook,
      isLoading: true,
    });

    renderContacts();

    // Should show AppLoading component when loading
    // AppLoading displays an image with alt text
    const loadingImage = screen.getByAltText("Template logo");
    expect(loadingImage).toBeInTheDocument();
  });

  it("displays empty state when no contacts", () => {
    useContacts.mockReturnValue({
      ...defaultMockHook,
      contacts: [],
      isLoading: false,
    });

    renderContacts();

    // Should show CallToAction component
    expect(screen.getByText(/Welcome!/i)).toBeInTheDocument();
    expect(screen.getByText(/Let's get started/i)).toBeInTheDocument();
  });

  /**
   * Pagination Visibility Tests
   * ============================
   * Verify that pagination is only shown when there are multiple pages
   */

  it("hides pagination when only one page of results", () => {
    useContacts.mockReturnValue({
      ...defaultMockHook,
      total: 10, // Only 10 items with pageSize=20 = 1 page
    });

    renderContacts();

    // Pagination navigation should not be rendered
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

    // But the table should still be visible
    expect(screen.getByText("Contacts")).toBeInTheDocument();
  });

  it("shows pagination when multiple pages exist", () => {
    // Default mock has total=40, which is 2 pages
    renderContacts();

    // Pagination navigation should be rendered
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("hides pagination when no results", () => {
    useContacts.mockReturnValue({
      ...defaultMockHook,
      contacts: [],
      total: 0,
    });

    renderContacts();

    // Empty state is shown instead of pagination
    expect(screen.getByText(/Welcome!/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", {
        name: /pagination/i,
      })
    ).not.toBeInTheDocument();
  });

  /**
   * Delete Dialog Tests
   * ============================
   * Verify that delete confirmation works correctly
   */

  it("opens delete confirmation dialog", async () => {
    renderContacts();

    // Get all buttons and filter to find delete buttons in the Actions column
    // The table has two icon buttons per row - visibility and delete
    // We'll find the row, then get its buttons
    const rows = screen.getAllByRole("row");
    const firstDataRow = rows[1]; // Skip header row
    const actionsCell = firstDataRow.querySelector("td:last-child");
    const buttons = actionsCell.querySelectorAll("button");
    const deleteButton = buttons[buttons.length - 1]; // Delete is the last button

    fireEvent.click(deleteButton);

    // Dialog should appear with confirmation message
    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to delete this contact/i)).toBeInTheDocument();
    });
  });

  it("calls deleteContact when confirmation is accepted", async () => {
    const mockDeleteContact = vi.fn().mockResolvedValue(undefined);
    useContacts.mockReturnValue({
      ...defaultMockHook,
      deleteContact: mockDeleteContact,
    });

    renderContacts();

    // Open delete dialog by clicking delete button in first row
    const rows = screen.getAllByRole("row");
    const firstDataRow = rows[1]; // Skip header row
    const actionsCell = firstDataRow.querySelector("td:last-child");
    const buttons = actionsCell.querySelectorAll("button");
    const deleteButton = buttons[buttons.length - 1];

    fireEvent.click(deleteButton);

    // Wait for dialog to appear
    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to delete this contact/i)).toBeInTheDocument();
    });

    // Click confirm button
    const confirmButton = screen.getByRole("button", { name: /confirm/i });
    fireEvent.click(confirmButton);

    // deleteContact should be called with the contact's id
    expect(mockDeleteContact).toHaveBeenCalledWith(mockContacts[0].id);
  });
});
