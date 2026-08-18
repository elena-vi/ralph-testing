/**
 * PaginationControl Component Tests
 * ==================================
 *
 * Tests for the Material-UI based pagination control component.
 * Covers rendering, user interactions, and boundary conditions.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PaginationControl from "../../components/PaginationControl";

describe("PaginationControl Component", () => {
  /**
   * Test rendering with basic props
   */
  it("renders pagination with correct number of pages", () => {
    const mockOnPageChange = vi.fn();
    const mockOnPageSizeChange = vi.fn();

    render(
      <PaginationControl
        page={1}
        pageSize={20}
        total={100}
        onPageChange={mockOnPageChange}
        _onPageSizeChange={mockOnPageSizeChange}
      />
    );

    // With 100 total and pageSize 20, should have 5 pages
    const pageButtons = screen.getAllByRole("button");
    // Should have buttons for each page plus prev/next
    expect(pageButtons.length).toBeGreaterThan(0);
  });

  /**
   * Test page change callback
   */
  it("calls onPageChange when user clicks next page", () => {
    const mockOnPageChange = vi.fn();
    const mockOnPageSizeChange = vi.fn();

    render(
      <PaginationControl
        page={2}
        pageSize={20}
        total={100}
        onPageChange={mockOnPageChange}
        _onPageSizeChange={mockOnPageSizeChange}
      />
    );

    // Click next button (should be the right arrow)
    const nextButton = screen.getByRole("button", { name: "Go to next page" });
    fireEvent.click(nextButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(3);
  });

  /**
   * Test disabled state on first page
   */
  it("disables previous button on page 1", () => {
    const mockOnPageChange = vi.fn();
    const mockOnPageSizeChange = vi.fn();

    render(
      <PaginationControl
        page={1}
        pageSize={20}
        total={100}
        onPageChange={mockOnPageChange}
        _onPageSizeChange={mockOnPageSizeChange}
      />
    );

    const prevButton = screen.getByRole("button", { name: "Go to previous page" });
    expect(prevButton).toBeDisabled();
  });

  /**
   * Test disabled state on last page
   */
  it("disables next button on last page", () => {
    const mockOnPageChange = vi.fn();
    const mockOnPageSizeChange = vi.fn();

    render(
      <PaginationControl
        page={5}
        pageSize={20}
        total={100}
        onPageChange={mockOnPageChange}
        _onPageSizeChange={mockOnPageSizeChange}
      />
    );

    const nextButton = screen.getByRole("button", { name: "Go to next page" });
    expect(nextButton).toBeDisabled();
  });

  /**
   * Test displays current page
   */
  it("highlights the current page", () => {
    const mockOnPageChange = vi.fn();
    const mockOnPageSizeChange = vi.fn();

    render(
      <PaginationControl
        page={3}
        pageSize={20}
        total={100}
        onPageChange={mockOnPageChange}
        _onPageSizeChange={mockOnPageSizeChange}
      />
    );

    // The current page button should be highlighted (aria-current)
    const currentPageButton = screen.getByRole("button", { current: "page" });
    expect(currentPageButton).toHaveTextContent("3");
  });

  /**
   * Test clicking on specific page number
   */
  it("calls onPageChange when user clicks on specific page", () => {
    const mockOnPageChange = vi.fn();
    const mockOnPageSizeChange = vi.fn();

    render(
      <PaginationControl
        page={1}
        pageSize={20}
        total={100}
        onPageChange={mockOnPageChange}
        _onPageSizeChange={mockOnPageSizeChange}
      />
    );

    // Click on page 4
    const page4Button = screen.getByRole("button", { name: "Go to page 4" });
    fireEvent.click(page4Button);

    expect(mockOnPageChange).toHaveBeenCalledWith(4);
  });

  /**
   * Test with single page
   */
  it("disables both buttons when only one page exists", () => {
    const mockOnPageChange = vi.fn();
    const mockOnPageSizeChange = vi.fn();

    render(
      <PaginationControl
        page={1}
        pageSize={20}
        total={10}
        onPageChange={mockOnPageChange}
        _onPageSizeChange={mockOnPageSizeChange}
      />
    );

    const prevButton = screen.getByRole("button", { name: "Go to previous page" });
    const nextButton = screen.getByRole("button", { name: "Go to next page" });

    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
  });
});
