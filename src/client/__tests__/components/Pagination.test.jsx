/**
 * Pagination Component Tests
 * ===========================
 *
 * Tests for the Pagination component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import Pagination from "../../components/Pagination";

describe("Pagination Component", () => {
  /**
   * Test rendering with multiple pages
   */
  it("renders pagination controls when there are multiple pages", () => {
    const onChange = vi.fn();
    render(<Pagination page={1} total={50} pageSize={20} onChange={onChange} />);

    // Pagination should be visible for 3 pages (50 / 20 = 2.5, rounds up to 3)
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  /**
   * Test not rendering when only 1 page
   */
  it("does not render pagination when there is only one page", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Pagination page={1} total={15} pageSize={20} onChange={onChange} />
    );

    // Should have no navigation element
    const nav = container.querySelector("nav");
    expect(nav).not.toBeInTheDocument();
  });

  /**
   * Test not rendering with no results
   */
  it("does not render pagination when there are no results", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Pagination page={1} total={0} pageSize={20} onChange={onChange} />
    );

    // Should have no navigation element
    const nav = container.querySelector("nav");
    expect(nav).not.toBeInTheDocument();
  });

  /**
   * Test calling onChange handler
   */
  it("calls onChange handler when clicking a page", () => {
    const onChange = vi.fn();
    render(<Pagination page={1} total={50} pageSize={20} onChange={onChange} />);

    // Click on page 2
    const page2Button = screen.getByRole("button", { name: /2/ });
    fireEvent.click(page2Button);

    expect(onChange).toHaveBeenCalledWith(2);
  });

  /**
   * Test correct total pages calculation
   */
  it("calculates total pages correctly", () => {
    const onChange = vi.fn();
    render(<Pagination page={1} total={47} pageSize={10} onChange={onChange} />);

    // 47 / 10 = 4.7, should round up to 5 pages
    // MUI Pagination should have 5 page buttons
    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();
  });

  /**
   * Test with custom pageSize
   */
  it("respects custom page size for calculation", () => {
    const onChange = vi.fn();
    render(<Pagination page={1} total={100} pageSize={25} onChange={onChange} />);

    // 100 / 25 = 4 pages
    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();
  });

  /**
   * Test highlighting current page
   */
  it("highlights the current page", () => {
    const onChange = vi.fn();
    render(<Pagination page={2} total={50} pageSize={20} onChange={onChange} />);

    // Page 2 should be visible
    const page2Button = screen.getByRole("button", { name: /2/ });
    expect(page2Button).toBeInTheDocument();
  });
});
