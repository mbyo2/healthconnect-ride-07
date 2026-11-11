import { csvCell } from "@/utils/csvSafe";

/**
 * Shared CSV building + download helpers.
 *
 * Every cell goes through csvCell (src/utils/csvSafe.ts), which quotes the
 * value and neutralizes spreadsheet formula injection — exporters must use
 * buildCsv instead of hand-rolling their own escaping/joining.
 */
export function buildCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
}

/** Trigger a browser download of an already-built CSV string. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** `base-YYYY-MM-DD.csv` — the filename convention used across the app. */
export function csvFilename(base: string): string {
  return `${base}-${new Date().toISOString().split("T")[0]}.csv`;
}
