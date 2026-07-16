import type { Row } from "@tanstack/react-table";
import type { CellValue } from "../types";

export type ColumnWidth = "narrow" | "medium" | "wide";

// Numeric/text columns mix numbers, strings, and nulls (e.g. "17%" next to 6).
// Sort nulls last regardless of direction, then compare numbers as numbers.
export function nullsLastSort<T>(rowA: Row<T>, rowB: Row<T>, columnId: string) {
  const a = rowA.getValue<CellValue>(columnId);
  const b = rowB.getValue<CellValue>(columnId);
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

// Backs a "has value" checkbox filter (e.g. "only items with a Special
// effect"). Only engages when the column actually has an active filter entry.
export function hasValueFilter<T>(row: Row<T>, columnId: string, filterValue: unknown) {
  if (!filterValue) return true;
  return row.getValue<CellValue>(columnId) !== null;
}

export function formatCell(value: CellValue): string {
  if (value === null) return "–";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  return value;
}
