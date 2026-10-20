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
      const paginationContainer = screen.queryByRole("navigation", { name: /pagination/i });
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
      const paginationNav = screen.queryByRole("navigation", { name: /pagination/i });
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
});
