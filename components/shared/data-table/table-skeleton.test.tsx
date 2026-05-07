/**
 * data-table/TableSkeleton + TablePagination smoke tests.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Table } from "@/components/ui/table";
import { TableSkeleton } from "./table-skeleton";
import { TablePagination } from "./pagination";

afterEach(cleanup);

describe("TableSkeleton", () => {
  it("renders columnCount cells per row", () => {
    const { container } = render(
      <Table>
        <TableSkeleton columnCount={4} rows={2} />
      </Table>,
    );
    expect(container.querySelectorAll("tr").length).toBe(2);
    expect(container.querySelectorAll("td").length).toBe(8);
  });
  it("defaults to 5 rows", () => {
    const { container } = render(
      <Table>
        <TableSkeleton columnCount={2} />
      </Table>,
    );
    expect(container.querySelectorAll("tr").length).toBe(5);
  });
});

describe("TablePagination", () => {
  it("renders nothing when totalPages <= 1", () => {
    const { container } = render(
      <TablePagination
        page={1}
        totalPages={1}
        total={5}
        perPage={10}
        onPageChange={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders row range and page indicator", () => {
    render(
      <TablePagination
        page={2}
        totalPages={5}
        total={47}
        perPage={10}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByText(/11–20/)).toBeTruthy();
    expect(screen.getByText(/47/)).toBeTruthy();
    expect(screen.getByText("2 / 5")).toBeTruthy();
  });

  it("disables prev on first page", () => {
    render(
      <TablePagination
        page={1}
        totalPages={3}
        total={30}
        perPage={10}
        onPageChange={() => {}}
      />,
    );
    const prev = screen.getByRole("button", { name: "עמוד קודם" }) as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
  });

  it("disables next on last page", () => {
    render(
      <TablePagination
        page={3}
        totalPages={3}
        total={30}
        perPage={10}
        onPageChange={() => {}}
      />,
    );
    const next = screen.getByRole("button", { name: "עמוד הבא" }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
  });

  it("calls onPageChange with prev/next", () => {
    const fn = vi.fn();
    render(
      <TablePagination
        page={2}
        totalPages={5}
        total={50}
        perPage={10}
        onPageChange={fn}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "עמוד קודם" }));
    fireEvent.click(screen.getByRole("button", { name: "עמוד הבא" }));
    expect(fn).toHaveBeenNthCalledWith(1, 1);
    expect(fn).toHaveBeenNthCalledWith(2, 3);
  });
});
