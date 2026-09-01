import type { ReactNode } from "react";

export type Column<Row> = {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  /** Hidden below the small breakpoint to keep narrow screens readable. */
  secondary?: boolean;
  align?: "left" | "right";
};

export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  caption,
}: {
  columns: Column<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  caption?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="w-full min-w-[36rem] text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-surface-muted/60 text-left">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={[
                  "px-4 py-3 font-medium text-muted",
                  column.align === "right" ? "text-right" : "",
                  column.secondary ? "hidden sm:table-cell" : "",
                ].join(" ")}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="bg-surface">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={[
                    "px-4 py-3",
                    column.align === "right" ? "text-right" : "",
                    column.secondary ? "hidden sm:table-cell" : "",
                  ].join(" ")}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
