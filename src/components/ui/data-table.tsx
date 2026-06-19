import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Blackcrest DataTable — ONE semantic, responsive table for all dense admin
 * lists. Real <table>/<thead>/<tbody> with `scope="col"` headers (a11y), the
 * institutional inverted-black header, alternating rows, and an overflow-x
 * scroll container + `minWidth` so it scrolls on mobile instead of crushing.
 * Server-renderable (no hooks); cells render their own Links/Badges/forms.
 */
export interface Column<T> {
  /** Column header label. */
  header: React.ReactNode;
  /** Cell renderer. */
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  /** sr-only header for icon/action columns. */
  srHeader?: boolean;
  headerClassName?: string;
  cellClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  /** Shown (spanning all columns) when there are no rows. */
  empty?: React.ReactNode;
  /** Accessible table caption (visually hidden). */
  caption?: string;
  /** Min table width (px) before horizontal scroll kicks in. @default 760 */
  minWidth?: number;
  className?: string;
}

const alignClass = (a?: "left" | "right" | "center") =>
  a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  empty,
  caption,
  minWidth = 760,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table
        className="w-full border-collapse text-left"
        style={{ minWidth }}
      >
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-y border-line bg-inverse text-on-accent">
            {columns.map((c, i) => (
              <th
                key={i}
                scope="col"
                className={cn(
                  "px-[18px] py-[10px] text-[10px] font-medium uppercase tracking-caps",
                  alignClass(c.align),
                  c.srHeader && "sr-only",
                  c.headerClassName,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-0">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={getRowKey(row)}
                style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
                className="bc-rise border-b border-line transition-colors duration-[180ms] even:bg-surface-2/40 hover:bg-surface-hover"
              >
                {columns.map((c, i) => (
                  <td
                    key={i}
                    className={cn(
                      "px-[18px] py-[var(--density-cell-py)] align-middle",
                      alignClass(c.align),
                      c.cellClassName,
                    )}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
