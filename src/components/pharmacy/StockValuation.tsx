import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { useCurrency } from "@/hooks/use-currency";
import {
  getValuation,
  getWriteoffSummary,
  type WriteOffReason,
  type WriteOffStatus,
} from "./pharmacyStockService";

const REASON_LABELS: Record<WriteOffReason, string> = {
  expired: "Expired",
  damaged: "Damaged",
  broken: "Broken",
  temperature: "Temperature excursion",
  stolen: "Stolen / missing",
  other: "Other",
};

const STATUS_BADGE_STYLES: Record<WriteOffStatus, string> = {
  posted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  pending_approval: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

const STATUS_LABELS: Record<WriteOffStatus, string> = {
  posted: "Posted",
  rejected: "Rejected",
  approved: "Approved",
  pending_approval: "Pending approval",
};

function StatusBadge({ status }: { status: WriteOffStatus }) {
  return <Badge className={STATUS_BADGE_STYLES[status]}>{STATUS_LABELS[status]}</Badge>;
}

function monthLabel(month: string): string {
  // month arrives as a YYYY-MM-DD string from the view
  const part = month.slice(0, 7).split("-");
  const year = Number(part[0]);
  const m = Number(part[1]);
  if (!Number.isFinite(year) || !Number.isFinite(m) || m < 1 || m > 12) {
    return month;
  }
  return format(new Date(year, m - 1, 1), "MMM yyyy");
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return format(new Date(value), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export function StockValuation() {
  const { institutionId } = useInstitutionContext();
  const { formatPrice } = useCurrency();

  const valuationQuery = useQuery({
    queryKey: ["stock-valuation", institutionId],
    queryFn: () => getValuation(institutionId as string),
    enabled: !!institutionId,
  });

  const summaryQuery = useQuery({
    queryKey: ["writeoff-summary", institutionId],
    queryFn: () => getWriteoffSummary(institutionId as string),
    enabled: !!institutionId,
  });

  const rows = valuationQuery.data ?? [];

  const totals = useMemo(() => {
    let stockValue = 0;
    let units = 0;
    for (const r of rows) {
      stockValue += Number(r.stock_value) || 0;
      units += Number(r.total_units) || 0;
    }
    return { stockValue, units, products: rows.length };
  }, [rows]);

  const monthlySummary = useMemo(() => {
    const groups = new Map<string, typeof (summaryQuery.data ?? [])>();
    for (const row of summaryQuery.data ?? []) {
      const key = row.month;
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    }
    return Array.from(groups.entries())
      .map(([month, entries]) => ({
        month,
        entries,
        totalLoss: entries.reduce((sum, e) => sum + (Number(e.total_loss) || 0), 0),
        totalCount: entries.reduce((sum, e) => sum + (Number(e.writeoff_count) || 0), 0),
      }))
      .sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));
  }, [summaryQuery.data]);

  if (!institutionId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Select an institution to view stock valuation.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stock valuation */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Stock valuation</h2>
          <p className="text-sm text-muted-foreground">
            Current on-hand stock valued at cost, aggregated per product.
          </p>
        </div>

        {valuationQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No stock on hand. Receive batches to see valuation here.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total stock value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatPrice(totals.stockValue)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total units
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{totals.units.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Products tracked
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{totals.products}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Units</TableHead>
                        <TableHead className="text-right">Stock value</TableHead>
                        <TableHead className="text-right">Batches</TableHead>
                        <TableHead>Earliest expiry</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={`${r.inventory_table}-${r.inventory_item_id}`}>
                          <TableCell className="font-medium">{r.product_name}</TableCell>
                          <TableCell className="text-right">
                            {(Number(r.total_units) || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPrice(Number(r.stock_value) || 0)}
                          </TableCell>
                          <TableCell className="text-right">{Number(r.batch_count) || 0}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(r.earliest_expiry)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </section>

      {/* Write-off P&L summary */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Write-off P&amp;L summary</h2>
          <p className="text-sm text-muted-foreground">
            Write-off losses grouped by month, reason, and status.
          </p>
        </div>

        {summaryQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : monthlySummary.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No write-off activity to summarize yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {monthlySummary.map(({ month, entries, totalLoss, totalCount }) => (
              <Card key={month}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <CardTitle className="text-base">{monthLabel(month)}</CardTitle>
                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        {totalCount} write-off{totalCount === 1 ? "" : "s"} ·{" "}
                      </span>
                      <span className="font-semibold">{formatPrice(totalLoss)}</span>
                      <span className="text-muted-foreground"> total loss</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reason</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Write-offs</TableHead>
                          <TableHead className="text-right">Total loss</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.map((e) => (
                          <TableRow
                            key={`${e.month}-${e.reason}-${e.status}`}
                          >
                            <TableCell>{REASON_LABELS[e.reason] ?? e.reason}</TableCell>
                            <TableCell>
                              <StatusBadge status={e.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              {Number(e.writeoff_count) || 0}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatPrice(Number(e.total_loss) || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
