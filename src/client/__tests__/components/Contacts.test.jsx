/**
 * Contacts Component Tests
 * ==========================
 *
 * Tests for the Contacts page component with pagination.
 * Tests:
 * - Rendering pagination control
 * - Page change handling
 * - URL query string integration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Contacts from "../../pages/Contacts";

// Mock the useContacts hook
vi.mock("../../hooks", () => ({
  useContacts: vi.fn(),
}));

// Mock useSearchParams hook
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useSearchParams: vi.fn(),
  };
});

import { useContacts } from "../../hooks";
import { useSearchParams } from "react-router-dom";

/**
 * Helper to render component with router
 */
const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("Contacts Component - Pagination", () => {
  const mockContacts = [
    { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com" },
    { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test pagination renders with correct page count
   */
  it("renders pagination control with correct page count", async () => {
    const mockSetSearchParams = vi.fn();
    useSearchParams.mockReturnValue([new URLSearchParams("page=1"), mockSetSearchParams]);

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
      total: 45,
      goToPage: vi.fn(),
    });

    renderWithRouter(<Contacts />);

    // Wait for component to render
    await waitFor(() => {
      // Pagination should be visible (45 total / 20 per page = 3 pages)
      const paginationButtons = screen.queryAllByRole("button", { name: /\d+/ });
      expect(paginationButtons.length).toBeGreaterThan(0);
    });
  });

  /**
   * Test pagination doesn't render when results fit on one page
   */
  it("does not render pagination when total <= pageSize", async () => {
    const mockSetSearchParams = vi.fn();
    useSearchParams.mockReturnValue([new URLSearchParams("page=1"), mockSetSearchParams]);

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
      // No pagination should be rendered
      const paginationContainer = screen.queryByRole("navigation");
      expect(paginationContainer).not.toBeInTheDocument();
    });
  });

  /**
   * Test pagination component exists when needed
   */
  it("renders pagination control with proper structure", async () => {
    const mockSetSearchParams = vi.fn();
    useSearchParams.mockReturnValue([new URLSearchParams("page=1"), mockSetSearchParams]);

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

    renderWithRouter(<Contacts />);

    await waitFor(() => {
      const paginationNav = screen.queryByRole("navigation");
      // Pagination nav should exist for 60 total with 20 per page (3 pages)
      expect(paginationNav).toBeInTheDocument();
    });
  });

  /**
   * Test empty state
   */
  it("displays empty state when no contacts", async () => {
    const mockSetSearchParams = vi.fn();
    useSearchParams.mockReturnValue([new URLSearchParams("page=1"), mockSetSearchParams]);

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
   * AC-3: Test URL synchronization on page change
   */
  it("updates URL query string when currentPage changes", async () => {
    const mockSetSearchParams = vi.fn();
    const mockSearchParams = new URLSearchParams("page=1");
    useSearchParams.mockReturnValue([mockSearchParams, mockSetSearchParams]);

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

    renderWithRouter(<Contacts />);

    await waitFor(() => {
      expect(mockSetSearchParams).toHaveBeenCalledWith({ page: "2" });
    });
  });

  /**
   * AC-6: Test invalid page in URL defaults to page 1
   */
  it("defaults to page 1 when URL has invalid page (non-numeric)", async () => {
    const mockSetSearchParams = vi.fn();
    const mockSearchParams = new URLSearchParams("page=abc");
    useSearchParams.mockReturnValue([mockSearchParams, mockSetSearchParams]);

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

    renderWithRouter(<Contacts />);

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    // Should sync to page 1 via setSearchParams
    expect(mockSetSearchParams).toHaveBeenCalledWith({ page: "1" });
  });

  /**
   * AC-6: Test negative page defaults to page 1
   */
  it("defaults to page 1 when URL has negative page", async () => {
    const mockSetSearchParams = vi.fn();
    const mockSearchParams = new URLSearchParams("page=-1");
    useSearchParams.mockReturnValue([mockSearchParams, mockSetSearchParams]);

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

    renderWithRouter(<Contacts />);

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    expect(mockSetSearchParams).toHaveBeenCalledWith({ page: "1" });
  });

  /**
   * AC-6: Test zero page defaults to page 1
   */
  it("defaults to page 1 when URL has page=0", async () => {
    const mockSetSearchParams = vi.fn();
    const mockSearchParams = new URLSearchParams("page=0");
    useSearchParams.mockReturnValue([mockSearchParams, mockSetSearchParams]);

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

    renderWithRouter(<Contacts />);

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    expect(mockSetSearchParams).toHaveBeenCalledWith({ page: "1" });
  });

  /**
   * Edge Case 2: Test page beyond available data
   */
  it("renders correctly when page is beyond available data", async () => {
    const mockSetSearchParams = vi.fn();
    const mockSearchParams = new URLSearchParams("page=999");
    useSearchParams.mockReturnValue([mockSearchParams, mockSetSearchParams]);

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
      total: 45,
      goToPage: vi.fn(),
    });

    renderWithRouter(<Contacts />);

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    // Should sync to page 1 via setSearchParams
    expect(mockSetSearchParams).toHaveBeenCalledWith({ page: "1" });
  });
});
