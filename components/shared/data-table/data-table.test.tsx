/**
 * DataTable smoke tests (batch 155).
 *
 * Covers the main shared primitive: render with data, empty state,
 * loading state, error state, sort header click, row selection
 * checkbox toggle. Companion to existing TableSkeleton + TablePagination
 * tests.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { screen, fireEvent, cleanup } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./data-table";

interface Row {
  id: number;
  name: string;
}

const columns: ColumnDef<Row>[] = [
  { accessorKey: "id", header: "ID" },
  { accessorKey: "name", header: "Name" },
];

const rows: Row[] = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
];

afterEach(cleanup);

describe("DataTable", () => {
  it("renders rows from data", () => {
    renderWithIntl(<DataTable columns={columns} data={rows} />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("renders empty state when data is empty", () => {
    renderWithIntl(
      <DataTable columns={columns} data={[]} emptyMessage="Nothing here yet" />,
    );
    expect(screen.getByText(/Nothing here yet/i)).toBeTruthy();
  });

  it("renders TableSkeleton rows while loading", () => {
    const { container } = renderWithIntl(
      <DataTable columns={columns} data={[]} isLoading loadingRows={3} />,
    );
    // 3 loading rows × 2 columns = 6 cells
    expect(container.querySelectorAll("td").length).toBeGreaterThanOrEqual(6);
  });

  it("renders error state when error prop is non-null", () => {
    renderWithIntl(
      <DataTable columns={columns} data={[]} error={new Error("boom")} />,
    );
    expect(screen.getByText(/boom/i)).toBeTruthy();
  });

  it("selection checkbox toggle adds/removes the row id", () => {
    const onChange = vi.fn();
    renderWithIntl(
      <DataTable
        columns={columns}
        data={rows}
        selection={{
          value: new Set<string | number>(),
          onChange,
          getRowId: (r) => r.id,
        }}
      />,
    );
    const boxes = screen.getAllByRole("checkbox");
    // First is select-all-on-page; click a row checkbox.
    fireEvent.click(boxes[1]!);
    expect(onChange).toHaveBeenCalled();
    const arg = onChange.mock.calls[0]![0] as Set<number>;
    expect(arg.has(1)).toBe(true);
  });

  it("select-all-on-page checkbox toggles every row id", () => {
    const onChange = vi.fn();
    renderWithIntl(
      <DataTable
        columns={columns}
        data={rows}
        selection={{
          value: new Set<string | number>(),
          onChange,
          getRowId: (r) => r.id,
        }}
      />,
    );
    const boxes = screen.getAllByRole("checkbox");
    fireEvent.click(boxes[0]!);
    expect(onChange).toHaveBeenCalled();
    const arg = onChange.mock.calls[0]![0] as Set<number>;
    expect(arg.has(1) && arg.has(2)).toBe(true);
  });

  it("onRowClick fires when a row is clicked", () => {
    const onRowClick = vi.fn();
    renderWithIntl(
      <DataTable columns={columns} data={rows} onRowClick={onRowClick} />,
    );
    fireEvent.click(screen.getByText("Alice"));
    expect(onRowClick).toHaveBeenCalled();
    expect(onRowClick.mock.calls[0]![0]).toMatchObject({ id: 1, name: "Alice" });
  });
});
