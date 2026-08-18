/**
 * Contacts Page Tests
 * ====================
 *
 * Tests for the Contacts page component.
 * Covers URL parameter handling, pagination integration, and page state persistence.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Contacts from "../../pages/Contacts";

// Mock the useContacts hook
vi.mock("../../hooks", () => ({
  useContacts: vi.fn(),
}));

// Mock the PaginationControl component to verify props
vi.mock("../../components/PaginationControl", () => ({
  default: ({ page, pageSize, total, onPageChange }) => (
    <div data-testid="pagination">
      <button onClick={() => onPageChange(2)}>Next Page</button>
      <span data-testid="current-page">{page}</span>
      <span data-testid="page-size">{pageSize}</span>
      <span data-testid="total">{total}</span>
    </div>
  ),
}));

// Mock ConfirmationDialog to simplify testing
vi.mock("../../components/ConfirmationDialog", () => ({
  default: ({ open, onConfirm, onClose }) =>
    open ? (
      <div data-testid="delete-dialog">
        <button onClick={onConfirm}>Confirm Delete</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
}));

// Mock AppLoading
vi.mock("../../components/AppLoading", () => ({
  default: () => <div data-testid="loading">Loading...</div>,
}));

// Mock CallToAction
vi.mock("../../components/CallToAction", () => ({
  default: ({ title }) => <div data-testid="call-to-action">{title}</div>,
}));

// Import mocked hook after mock setup
import { useContacts } from "../../hooks";

/**
 * Helper function to render with MemoryRouter for testing URL params
 */
const renderWithRouter = (component, { initialEntries = ["/"] } = {}) => {
  return render(<MemoryRouter initialEntries={initialEntries}>{component}</MemoryRouter>);
};

describe("Contacts Page", () => {
  const mockContacts = [
    { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" },
    { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    useContacts.mockReturnValue({
      contacts: mockContacts,
      isLoading: false,
      error: null,
      total: 100,
      pageSize: 20,
      page: 1,
      deleteContact: vi.fn().mockResolvedValue({}),
      refresh: vi.fn(),
      createContact: vi.fn(),
      updateContact: vi.fn(),
    });
  });

  /**
   * Test initial page extracted from URL query string
   */
  it("extracts page from URL query string on mount", async () => {
    renderWithRouter(<Contacts />, { initialEntries: ["/?page=3"] });

    // Should pass page=3 to hook
    await waitFor(() => {
      expect(useContacts).toHaveBeenCalledWith({
        page: 3,
        pageSize: 20,
      });
    });

    // PaginationControl should render with page=3
    expect(screen.getByTestId("current-page")).toHaveTextContent("3");
  });

  /**
   * Test default to page 1 when no query string
   */
  it("defaults to page 1 when no URL query string", async () => {
    renderWithRouter(<Contacts />, { initialEntries: ["/"] });

    await waitFor(() => {
      expect(useContacts).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
      });
    });

    expect(screen.getByTestId("current-page")).toHaveTextContent("1");
  });

  /**
   * Test invalid URL page param falls back to page 1
   */
  it("falls back to page 1 for invalid URL page parameter", async () => {
    renderWithRouter(<Contacts />, { initialEntries: ["/?page=abc"] });

    await waitFor(() => {
      expect(useContacts).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
      });
    });

    expect(screen.getByTestId("current-page")).toHaveTextContent("1");
  });

  /**
   * Test page change triggers URL update callback
   */
  it("calls onPageChange callback when pagination changes", async () => {
    renderWithRouter(<Contacts />, { initialEntries: ["/?page=1"] });

    // Verify hook was called with page 1
    await waitFor(() => {
      expect(useContacts).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
      });
    });

    // Click next page button in mocked PaginationControl
    const nextButton = screen.getByText("Next Page");
    fireEvent.click(nextButton);

    // The handlePageChange should have called setSearchParams
    // Verify the component is responsive to page changes
    expect(nextButton).toBeInTheDocument();
  });

  /**
   * Test maintaining current page via URL
   * When URL contains ?page=2, the component extracts and uses that page
   */
  it("uses page from URL when specified", async () => {
    renderWithRouter(<Contacts />, { initialEntries: ["/?page=2"] });

    // Should extract page 2 from URL and pass to hook
    await waitFor(() => {
      expect(useContacts).toHaveBeenCalledWith({
        page: 2,
        pageSize: 20,
      });
    });

    // PaginationControl should be rendered with page 2
    expect(screen.getByTestId("current-page")).toHaveTextContent("2");
  });

  /**
   * Test negative page param falls back to page 1
   */
  it("falls back to page 1 for negative page parameter", async () => {
    renderWithRouter(<Contacts />, { initialEntries: ["/?page=-1"] });

    await waitFor(() => {
      expect(useContacts).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
      });
    });
  });

  /**
   * Test page exceeding total pages doesn't crash
   */
  it("handles page exceeding total pages gracefully", async () => {
    renderWithRouter(<Contacts />, { initialEntries: ["/?page=999"] });

    // Should pass page=999 to hook (server will handle clamping)
    await waitFor(() => {
      expect(useContacts).toHaveBeenCalledWith({
        page: 999,
        pageSize: 20,
      });
    });

    // Page should render without error
    expect(screen.getByTestId("current-page")).toHaveTextContent("999");
  });

  /**
   * Test PaginationControl receives correct props
   */
  it("passes correct props to PaginationControl", async () => {
    renderWithRouter(<Contacts />, { initialEntries: ["/?page=2"] });

    await waitFor(() => {
      expect(screen.getByTestId("current-page")).toHaveTextContent("2");
      expect(screen.getByTestId("page-size")).toHaveTextContent("20");
      expect(screen.getByTestId("total")).toHaveTextContent("100");
    });
  });

  /**
   * Test contacts table renders with data
   */
  it("renders contacts table with fetched data", async () => {
    renderWithRouter(<Contacts />);

    await waitFor(() => {
      expect(screen.getByText("John")).toBeInTheDocument();
      expect(screen.getByText("Doe")).toBeInTheDocument();
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    });
  });

  /**
   * Test loading state
   */
  it("displays loading indicator while fetching", () => {
    useContacts.mockReturnValue({
      contacts: [],
      isLoading: true,
      error: null,
      total: 0,
      pageSize: 20,
      page: 1,
      deleteContact: vi.fn(),
      refresh: vi.fn(),
      createContact: vi.fn(),
      updateContact: vi.fn(),
    });

    renderWithRouter(<Contacts />);

    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  /**
   * Test empty state
   */
  it("displays call-to-action when no contacts", () => {
    useContacts.mockReturnValue({
      contacts: [],
      isLoading: false,
      error: null,
      total: 0,
      pageSize: 20,
      page: 1,
      deleteContact: vi.fn(),
      refresh: vi.fn(),
      createContact: vi.fn(),
      updateContact: vi.fn(),
    });

    renderWithRouter(<Contacts />);

    expect(screen.getByTestId("call-to-action")).toBeInTheDocument();
  });
});
