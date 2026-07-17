import type { FilterFn, Row } from "@tanstack/react-table";

// Column-scoped search for the chart tables.
//
//   Lvl:60            column "Lvl" contains "60"
//   Lvl:>=40          numeric compare (>=, <=, >, < on number columns)
//   Item:Cruel Barb   value runs until the next "field:" — spaces allowed
//   Source:Naxx Lvl:60  multiple fields are AND-ed
//   Cruel             plain text (no field) searches across all columns
//
// Field names match a column's id or its header (case-insensitive).

export type FieldMap = Map<string, string>; // alias (lowercased) -> column id

type CompareOp = ">=" | "<=" | ">" | "<";
type Op = CompareOp | "contains";

interface FieldConstraint {
  colId: string;
  op: Op;
  value: string;
}

interface ParsedQuery {
  fields: FieldConstraint[];
  global: string;
}

const OP_RE = /^(>=|<=|>|<)/;

export function buildFieldMap(columns: { id?: string; header?: unknown }[]): FieldMap {
  const map: FieldMap = new Map();
  for (const col of columns) {
    if (!col.id) continue;
    map.set(col.id.toLowerCase(), col.id);
    if (typeof col.header === "string") {
      map.set(col.header.toLowerCase(), col.id);
      map.set(col.header.replace(/\s+/g, "").toLowerCase(), col.id);
    }
  }
  return map;
}

export function parseQuery(query: string, fieldMap: FieldMap): ParsedQuery {
  const words = query.trim().split(/\s+/).filter(Boolean);
  const fields: FieldConstraint[] = [];
  const globals: string[] = [];
  let current: { colId: string; parts: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const raw = current.parts.join(" ").trim();
    const m = raw.match(OP_RE);
    if (m) {
      fields.push({ colId: current.colId, op: m[1] as CompareOp, value: raw.slice(m[1].length).trim() });
    } else {
      fields.push({ colId: current.colId, op: "contains", value: raw });
    }
    current = null;
  };

  for (const word of words) {
    const idx = word.indexOf(":");
    const key = idx > 0 ? word.slice(0, idx).toLowerCase() : "";
    if (idx > 0 && fieldMap.has(key)) {
      flush();
      current = { colId: fieldMap.get(key)!, parts: [] };
      const rest = word.slice(idx + 1);
      if (rest) current.parts.push(rest);
    } else if (current) {
      current.parts.push(word);
    } else {
      globals.push(word);
    }
  }
  flush();
  return { fields, global: globals.join(" ") };
}

const cellString = (v: unknown): string => (v == null ? "" : String(v));

function passesCompare(value: number, op: CompareOp, target: number): boolean {
  switch (op) {
    case ">=":
      return value >= target;
    case "<=":
      return value <= target;
    case ">":
      return value > target;
    case "<":
      return value < target;
  }
}

/**
 * A react-table global filter that understands `field:value` tokens.
 *
 * @param firstColId  Gate evaluation to this one column id so the row is scored
 *                    once, not once per column (global filter OR-s across all
 *                    columns, so a single true is enough).
 */
export function makeGlobalFilter<T>(
  fieldMap: FieldMap,
  firstColId: string,
  // How a cell reads on screen (e.g. "O" shows as "One-H"), so text search
  // matches what the user sees. Numeric comparisons still use the raw value.
  format: (columnId: string, value: unknown) => string = (_id, v) => cellString(v),
): FilterFn<T> {
  let cacheKey: string | null = null;
  let cached: ParsedQuery | null = null;

  const fn: FilterFn<T> = (row: Row<T>, columnId: string, filterValue: unknown) => {
    if (columnId !== firstColId) return false;
    const query = String(filterValue ?? "");
    if (!query.trim()) return true;

    if (query !== cacheKey) {
      cacheKey = query;
      cached = parseQuery(query, fieldMap);
    }
    const { fields, global } = cached!;

    for (const f of fields) {
      const raw = row.getValue(f.colId);
      if (f.op !== "contains") {
        // Comparisons coerce the cell to a number, so a stray "-"/null (or a
        // column not flagged numeric) simply fails rather than silently
        // matching the operand as text.
        const value = typeof raw === "number" ? raw : Number.parseFloat(cellString(raw));
        const target = Number.parseFloat(f.value);
        if (Number.isNaN(value) || Number.isNaN(target)) return false;
        if (!passesCompare(value, f.op, target)) return false;
      } else if (!format(f.colId, raw).toLowerCase().includes(f.value.toLowerCase())) {
        return false;
      }
    }

    if (global) {
      const needle = global.toLowerCase();
      const hit = row
        .getAllCells()
        .some((c) => format(c.column.id, c.getValue()).toLowerCase().includes(needle));
      if (!hit) return false;
    }
    return true;
  };

  fn.autoRemove = (value) => !value;
  return fn;
}
