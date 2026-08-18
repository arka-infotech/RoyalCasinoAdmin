"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useTurnoverReport } from "@/hooks/useGames";
import { reportService } from "@/services/game.service";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/user";
import { parseDrillPath, serializeDrillPath, getDirectChildRole, type DrillPathNode } from "@/lib/hierarchyDrillDown";

import { TablePaginationFooter } from "@/components/admin/TablePaginationFooter";
import { SortableTh } from "@/components/admin/SortableTh";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { compareForSort, sortRowsByKey, type SortDir } from "@/lib/tableSort";

type ApiTurnoverRow = {
  id: string;
  username: string;
  role: UserRole;
  play_amount: string | number;
  win_amount: string | number;
  claim_amount: string | number;
  unclaim_amount: string | number;
  end_amount: string | number;
  retailer_commission_rate: string | number;
  distributor_commission_rate: string | number;
  super_commission_rate: string | number;
  own_commission_amount?: string | number;
  retailer_commission_amount?: string | number;
  distributor_commission_amount?: string | number;
  super_commission_amount?: string | number;
};

type QuickRangeKey =
  | "last6Months"
  | "currentMonth"
  | "lastMonth"
  | "lastWeek"
  | "currentWeek"
  | "yesterday"
  | "today"
  | "dateRange";

type TurnoverRow = {
  id: string;
  role: UserRole;
  username: string;
  playPoint: number;
  winPoint: number;
  endPoint: number;
  ownCommission: number;
  retailerCommission: number;
  superCommission: number;
  distributorCommission: number;
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  super_distributor: "Super Distributor",
  distributor: "Distributor",
  retailer: "Retailer",
  user: "User",
};

function getCommissionVisibilityForRole(role: UserRole): {
  showSuperCommission: boolean;
  showDistributorCommission: boolean;
  showRetailerCommission: boolean;
  showOwnCommission: boolean;
} {
  return {
    showSuperCommission: role === "admin" || role === "super_distributor",
    showDistributorCommission:
      role === "admin" || role === "super_distributor" || role === "distributor",
    showRetailerCommission:
      role === "admin" ||
      role === "super_distributor" ||
      role === "distributor" ||
      role === "retailer",
    // The bettor's own-level tier (user) sits below every panel role, so it's always visible
    // to any panel viewer, same as retailer commission was when retailer was the leaf role.
    showOwnCommission: true,
  };
}

const quickRanges: Array<{ key: QuickRangeKey; label: string }> = [
  { key: "last6Months", label: "Last 6 Months" },
  { key: "currentMonth", label: "Current Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "lastWeek", label: "Last Week" },
  { key: "currentWeek", label: "Current Week" },
  { key: "yesterday", label: "Yesterday" },
  { key: "today", label: "Today" },
  { key: "dateRange", label: "Date Range" },
];

function formatNumber(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatPillDate(date: Date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function toISODateInputValue(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

// Week starts Monday (matches most admin dashboards).
function startOfWeekMonday(d: Date) {
  const day = d.getDay(); // 0=Sun ... 6=Sat
  const diff = (day + 6) % 7; // Mon->0, Tue->1, ... Sun->6
  const res = new Date(d);
  res.setDate(d.getDate() - diff);
  return startOfDay(res);
}


function toISO(d: Date) {
  return d.toISOString().replace("T", " ").slice(0, 19);
}

export default function TurnoverReportPage() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const loginRole = (user?.role ?? "admin") as UserRole;
  const drillPath = useMemo(
    () => parseDrillPath(searchParams.get("drill")),
    [searchParams]
  );

  const updateDrillPath = useCallback(
    (next: DrillPathNode[] | ((prev: DrillPathNode[]) => DrillPathNode[])) => {
      const resolved = typeof next === "function" ? next(drillPath) : next;
      const params = new URLSearchParams(searchParams.toString());
      if (resolved.length === 0) {
        params.delete("drill");
      } else {
        params.set("drill", serializeDrillPath(resolved));
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [drillPath, pathname, router, searchParams]
  );

  const parentRole = drillPath.length > 0 ? drillPath[drillPath.length - 1].role : loginRole;
  const viewingRoleOrRoles = getDirectChildRole(parentRole);
  const isCombinedChildView = Array.isArray(viewingRoleOrRoles);
  const viewingRole = isCombinedChildView ? null : viewingRoleOrRoles;
  const nextRole = viewingRole ? getDirectChildRole(viewingRole) : null;
  const currentParentId = drillPath.length > 0 ? drillPath[drillPath.length - 1].id : undefined;
  const [selectedRange, setSelectedRange] = useState<QuickRangeKey>("today");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const requestSort = useCallback(
    (key: string) => {
      if (sortKey !== key) {
        setSortKey(key);
        setSortDir("asc");
      } else {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      }
    },
    [sortKey]
  );

  const [deleteFromDate, setDeleteFromDate] = useState<string>("");
  const [deleteToDate, setDeleteToDate] = useState<string>("");
  const [isDeleteBusy, setIsDeleteBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ from: string; to: string; count: number; token: string } | null>(null);

  const now = useMemo(() => new Date(), []);

  const computedRange = useMemo(() => {
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);

    switch (selectedRange) {
      case "today":
        return { from: today, to: todayEnd };
      case "yesterday": {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        return { from: startOfDay(y), to: endOfDay(y) };
      }
      case "currentWeek": {
        const from = startOfWeekMonday(now);
        return { from, to: todayEnd };
      }
      case "lastWeek": {
        const startThisWeek = startOfWeekMonday(now);
        const from = new Date(startThisWeek);
        from.setDate(from.getDate() - 7);
        const to = new Date(startThisWeek);
        to.setMilliseconds(to.getMilliseconds() - 1);
        return { from: startOfDay(from), to: endOfDay(to) };
      }
      case "currentMonth": {
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: startOfDay(from), to: todayEnd };
      }
      case "lastMonth": {
        const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const to = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from: startOfDay(from), to: endOfDay(to) };
      }
      case "last6Months": {
        const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        return { from: startOfDay(from), to: todayEnd };
      }
      case "dateRange": {
        const from =
          fromDate && /^\d{4}-\d{2}-\d{2}$/.test(fromDate)
            ? startOfDay(new Date(`${fromDate}T00:00:00`))
            : today;
        const to =
          toDate && /^\d{4}-\d{2}-\d{2}$/.test(toDate)
            ? endOfDay(new Date(`${toDate}T00:00:00`))
            : todayEnd;
        return { from, to };
      }
    }
  }, [fromDate, now, selectedRange, toDate]);

  const pillLabel = useMemo(() => {
    const fromLabel = formatPillDate(computedRange.from);
    const toLabel = formatPillDate(computedRange.to);
    if (fromLabel === toLabel) return fromLabel;
    return `${fromLabel} - ${toLabel}`;
  }, [computedRange.from, computedRange.to]);

  const apiParams = useMemo(() => ({
    from_date: toISO(computedRange.from),
    to_date: toISO(computedRange.to),
    ...(currentParentId ? { parent_id: currentParentId } : {}),
    ...(viewingRole ? { child_role: viewingRole } : {}),
  }), [computedRange.from, computedRange.to, currentParentId, viewingRole]);

  const { data: reportData, isLoading: reportLoading, error: reportError, refetch: refetchReport } = useTurnoverReport(apiParams);

  useEffect(() => {
    if (reportError) toast.error("Failed to load turnover report");
  }, [reportError]);

  const allRows: TurnoverRow[] = useMemo(() => {
    const raw = (reportData?.data?.report ?? []) as ApiTurnoverRow[];
    return raw.map((r) => {
      const playPoint = Number(r.play_amount);
      const ownCommission = Number(r.own_commission_amount ?? 0);
      const retailerCommission = Number(r.retailer_commission_amount ?? 0);
      const distributorCommission = Number(r.distributor_commission_amount ?? 0);
      const superCommission = Number(r.super_commission_amount ?? 0);
      return {
        id: r.id,
        role: r.role,
        username: r.username,
        playPoint,
        winPoint: Number(r.win_amount),
        endPoint: Number(r.end_amount),
        ownCommission,
        retailerCommission,
        superCommission,
        distributorCommission,
      };
    });
  }, [reportData]);

  const { showSuperCommission, showDistributorCommission, showRetailerCommission, showOwnCommission } =
    getCommissionVisibilityForRole(loginRole);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((r) =>
      r.username.toLowerCase().includes(q) ||
      String(r.playPoint).includes(q) ||
      String(r.winPoint).includes(q) ||
      String(r.endPoint).includes(q) ||
      String(r.retailerCommission).includes(q)
    );
  }, [allRows, searchQuery]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    if (sortKey === "net") {
      const netOf = (r: TurnoverRow) => {
        let comm = 0;
        if (showOwnCommission) comm += r.ownCommission;
        if (showRetailerCommission) comm += r.retailerCommission;
        if (showDistributorCommission) comm += r.distributorCommission;
        if (showSuperCommission) comm += r.superCommission;
        return r.endPoint - comm;
      };
      return [...filteredRows].sort((a, b) => compareForSort(netOf(a), netOf(b), sortDir));
    }
    return sortRowsByKey(filteredRows, sortKey as keyof TurnoverRow, sortDir);
  }, [filteredRows, sortKey, sortDir, showOwnCommission, showRetailerCommission, showDistributorCommission, showSuperCommission]);

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (
        acc: {
          play: number;
          win: number;
          end: number;
          ownCommission: number;
          actualRetailerCommission: number;
          superCommission: number;
          distributorCommission: number;
        },
        r: TurnoverRow
      ) => {
        acc.play += r.playPoint;
        acc.win += r.winPoint;
        acc.end += r.endPoint;
        acc.ownCommission += r.ownCommission;
        acc.actualRetailerCommission += r.retailerCommission;
        acc.superCommission += r.superCommission;
        acc.distributorCommission += r.distributorCommission;
        return acc;
      },
      {
        play: 0,
        win: 0,
        end: 0,
        ownCommission: 0,
        actualRetailerCommission: 0,
        superCommission: 0,
        distributorCommission: 0,
      }
    );
  }, [filteredRows]);

  const totalCommission = useMemo(() => {
    let sum = 0;
    if (showOwnCommission) sum += totals.ownCommission;
    if (showRetailerCommission) sum += totals.actualRetailerCommission;
    if (showDistributorCommission) sum += totals.distributorCommission;
    if (showSuperCommission) sum += totals.superCommission;
    return sum;
  }, [
    totals.ownCommission,
    totals.actualRetailerCommission,
    totals.superCommission,
    totals.distributorCommission,
    showOwnCommission,
    showRetailerCommission,
    showDistributorCommission,
    showSuperCommission,
  ]);

  const totalNet = useMemo(() => {
    return totals.end - totalCommission;
  }, [totals.end, totalCommission]);

  // Export/print should match what the viewed role would see (hides upstream commissions).
  // Example: super distributor exporting a distributor report should not include Super Commission.
  const exportPerspectiveRole = viewingRole ?? loginRole;
  const {
    showSuperCommission: exportShowSuperCommission,
    showDistributorCommission: exportShowDistributorCommission,
    showRetailerCommission: exportShowRetailerCommission,
    showOwnCommission: exportShowOwnCommission,
  } = getCommissionVisibilityForRole(exportPerspectiveRole);

  const tableColumnCount =
    (isCombinedChildView ? 7 : 6) +
    (showSuperCommission ? 1 : 0) +
    (showDistributorCommission ? 1 : 0) +
    (showRetailerCommission ? 1 : 0) +
    (showOwnCommission ? 1 : 0);

  const totalEntries = sortedRows.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [entriesPerPage, searchQuery, selectedRange]);

  useEffect(() => {
    const todayISO = toISODateInputValue(now);
    setFromDate((v) => (v ? v : todayISO));
    setToDate((v) => (v ? v : todayISO));
  }, [now]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentEntries = sortedRows.slice(startIndex, endIndex);

  const handlePrintExport = useCallback(() => {
    const headers = ["No", "Username"];
    if (isCombinedChildView) headers.push("Role");
    headers.push("Play Point", "Win Point", "End Point");
    if (exportShowSuperCommission) headers.push("Super Commission");
    if (exportShowDistributorCommission) headers.push("Distributor Commission");
    if (exportShowRetailerCommission) headers.push("Retailer Commission");
    if (exportShowOwnCommission) headers.push("User Commission");
    headers.push("Net");

    const rows = currentEntries.map((row, idx) => {
      const values = [
        String(startIndex + idx + 1),
        row.username,
      ];
      if (isCombinedChildView) values.push(ROLE_LABELS[row.role] ?? row.role);
      values.push(String(row.playPoint), String(row.winPoint), String(row.endPoint));

      let commissionTotal = 0;
      if (exportShowSuperCommission) {
        values.push(String(row.superCommission));
        commissionTotal += row.superCommission;
      }
      if (exportShowDistributorCommission) {
        values.push(String(row.distributorCommission));
        commissionTotal += row.distributorCommission;
      }
      if (exportShowRetailerCommission) {
        values.push(String(row.retailerCommission));
        commissionTotal += row.retailerCommission;
      }
      if (exportShowOwnCommission) {
        values.push(String(row.ownCommission));
        commissionTotal += row.ownCommission;
      }

      values.push(String(row.endPoint - commissionTotal));
      return values.map(escapeCsv).join(",");
    });

    const csvContent = [headers.map(escapeCsv).join(","), ...rows].join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const now = new Date();
    const fileDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate()
    ).padStart(2, "0")}`;
    link.href = url;
    link.download = `turnover_report_${fileDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [
    currentEntries,
    exportShowDistributorCommission,
    exportShowRetailerCommission,
    exportShowSuperCommission,
    exportShowOwnCommission,
    isCombinedChildView,
    startIndex,
  ]);

  const showingFrom = totalEntries === 0 ? 0 : startIndex + 1;
  const showingTo = totalEntries === 0 ? 0 : Math.min(endIndex, totalEntries);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-2">
            <div className="w-full overflow-x-auto md:overflow-visible">
              <div className="inline-flex min-w-max flex-nowrap overflow-hidden rounded-md border border-gray-200 bg-white">
                {quickRanges.map((r) => {
                  const active = r.key === selectedRange;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setSelectedRange(r.key)}
                      className={`shrink-0 border-r border-gray-200 px-3 py-1.5 text-xs font-medium ${
                        active
                          ? "bg-teal-500 text-white"
                          : "bg-white text-teal-500 hover:bg-gray-50"
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <span className="inline-flex w-fit items-center rounded bg-green-500 px-3 py-1.5 text-xs font-semibold text-white">
              {pillLabel}
            </span>
          </div>

          {selectedRange === "dateRange" ? (
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
                />
              </div>
            </div>
          ) : null}

          <div className="w-full overflow-x-auto">
            <div className="min-w-78 overflow-hidden rounded-md border border-gray-200 bg-gray-100 md:min-w-90">
              <div className="grid grid-cols-5 overflow-hidden rounded-md">
                <div className="bg-linear-to-r from-purple-600 to-indigo-500 px-2 py-1.5 text-center text-[11px] font-semibold text-white md:px-4 md:py-2 md:text-xs">
                  Total PlayPoints
                </div>
                <div className="bg-linear-to-r from-rose-300 via-pink-500 to-rose-500 px-2 py-1.5 text-center text-[11px] font-semibold text-white md:px-4 md:py-2 md:text-xs">
                  Total WinPoints
                </div>
                <div className="bg-linear-to-r from-blue-600 to-blue-400 px-2 py-1.5 text-center text-[11px] font-semibold text-white md:px-4 md:py-2 md:text-xs">
                  End Point
                </div>
                <div className="bg-linear-to-r from-amber-400 via-orange-500 to-orange-600 px-2 py-1.5 text-center text-[11px] font-semibold text-white md:px-4 md:py-2 md:text-xs">
                  Actual Commission
                </div>
                <div className="bg-linear-to-r from-blue-600 to-indigo-500 px-2 py-1.5 text-center text-[11px] font-semibold text-white md:px-4 md:py-2 md:text-xs">
                  Net
                </div>
              </div>

              <div className="grid grid-cols-5 gap-px bg-gray-200">
                <div className="bg-gray-100 px-2 py-2 text-center text-xs font-medium text-gray-700 md:px-4 md:py-3 md:text-sm">
                  {formatNumber(totals.play)}
                </div>
                <div className="bg-gray-100 px-2 py-2 text-center text-xs font-medium text-gray-700 md:px-4 md:py-3 md:text-sm">
                  {formatNumber(totals.win)}
                </div>
                <div className="bg-gray-100 px-2 py-2 text-center text-xs font-medium text-gray-700 md:px-4 md:py-3 md:text-sm">
                  {formatNumber(totals.end)}
                </div>
                <div className="bg-gray-100 px-2 py-2 text-center text-xs font-medium text-gray-700 md:px-4 md:py-3 md:text-sm">
                  {formatNumber(totalCommission)}
                </div>
                <div className="bg-gray-100 px-2 py-2 text-center text-xs font-medium text-gray-700 md:px-4 md:py-3 md:text-sm">
                  {formatNumber(totalNet)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="text-sm font-semibold text-gray-800">
          {isCombinedChildView
            ? "Retailer + User Turnover Report"
            : (viewingRole ? `${ROLE_LABELS[viewingRole]} Turnover Report` : "Turnover Report")}
        </h2>

        <div className="mb-2 mt-2 flex flex-wrap items-center gap-2">
          {drillPath.length > 0 && (
            <button
              type="button"
              className="rounded border border-gray-300 px-2 py-0.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => {
                updateDrillPath((prev) => prev.slice(0, -1));
                setCurrentPage(1);
              }}
            >
              Back
            </button>
          )}
          {drillPath.length > 0 && (
            <button
              type="button"
              className="rounded border border-gray-300 px-2 py-0.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => {
                updateDrillPath([]);
                setCurrentPage(1);
              }}
            >
              Reset
            </button>
          )}
        </div>

        {drillPath.length > 0 && (
          <p className="mb-2 text-xs font-medium text-gray-700">
            {drillPath.map((node) => node.username).join(" > ")}
          </p>
        )}

        <div className="mb-3 mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <span>Show</span>
              <select
                value={entriesPerPage}
                onChange={(e) => setEntriesPerPage(parseInt(e.target.value, 10))}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>entries</span>
            </label>
            <button
              type="button"
              onClick={handlePrintExport}
              className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Print
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <span>Search:</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
            />
          </label>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-full border border-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                <SortableTh
                  columnKey="no"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={requestSort}
                  className="border border-gray-200 px-3 py-2"
                >
                  No
                </SortableTh>
                <SortableTh
                  columnKey="username"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={requestSort}
                  className="border border-gray-200 px-3 py-2"
                >
                  Username
                </SortableTh>
                {isCombinedChildView && (
                  <SortableTh
                    columnKey="role"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                    className="border border-gray-200 px-3 py-2"
                  >
                    Role
                  </SortableTh>
                )}
                <SortableTh
                  columnKey="playPoint"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={requestSort}
                  className="border border-gray-200 px-3 py-2"
                >
                  Play Point
                </SortableTh>
                <SortableTh
                  columnKey="winPoint"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={requestSort}
                  className="border border-gray-200 px-3 py-2"
                >
                  Win Point
                </SortableTh>
                <SortableTh
                  columnKey="endPoint"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={requestSort}
                  className="border border-gray-200 px-3 py-2"
                >
                  End Point
                </SortableTh>
                {showSuperCommission && (
                  <SortableTh columnKey="superCommission" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">
                    Super Commission
                  </SortableTh>
                )}
                {showDistributorCommission && (
                  <SortableTh columnKey="distributorCommission" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">
                    Distributor Commission
                  </SortableTh>
                )}
                {showRetailerCommission && (
                  <SortableTh
                    columnKey="retailerCommission"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                    className="border border-gray-200 px-3 py-2"
                  >
                    Retailer Commission
                  </SortableTh>
                )}
                {showOwnCommission && (
                  <SortableTh
                    columnKey="ownCommission"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                    className="border border-gray-200 px-3 py-2"
                  >
                    User Commission
                  </SortableTh>
                )}
                <SortableTh
                  columnKey="net"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={requestSort}
                  className="border border-gray-200 px-3 py-2"
                >
                  Net
                </SortableTh>
              </tr>
            </thead>

            <tbody>
              {reportLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: tableColumnCount }).map((__, j) => (
                      <td key={j} className="border border-gray-200 px-3 py-3">
                        <div className="h-4 animate-pulse rounded bg-gray-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : null}
              {!reportLoading && currentEntries.map((row, idx) => {
                let rowCommission = 0;
                if (showRetailerCommission) rowCommission += row.retailerCommission;
                if (showDistributorCommission) rowCommission += row.distributorCommission;
                if (showSuperCommission) rowCommission += row.superCommission;
                if (showOwnCommission) rowCommission += row.ownCommission;
                const net = row.endPoint - rowCommission;
                return (
                  <tr key={row.id} className="text-gray-700">
                    <td className="border border-gray-200 px-3 py-3">{startIndex + idx + 1}</td>
                    <td className="border border-gray-200 px-3 py-3">
                      {nextRole ? (
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                          onClick={() => {
                            updateDrillPath((prev) => [...prev, { id: row.id, username: row.username, role: row.role }]);
                            setCurrentPage(1);
                          }}
                        >
                          {row.username}
                        </button>
                      ) : (
                        row.username
                      )}
                    </td>
                    {isCombinedChildView && (
                      <td className="border border-gray-200 px-3 py-3">
                        {ROLE_LABELS[row.role] ?? row.role}
                      </td>
                    )}
                    <td className="border border-gray-200 px-3 py-3">
                      {formatNumber(row.playPoint)}
                    </td>
                    <td className="border border-gray-200 px-3 py-3">
                      {formatNumber(row.winPoint)}
                    </td>
                    <td className="border border-gray-200 px-3 py-3">
                      {formatNumber(row.endPoint)}
                    </td>
                    {showSuperCommission && (
                      <td className="border border-gray-200 px-3 py-3">{formatNumber(row.superCommission)}</td>
                    )}
                    {showDistributorCommission && (
                      <td className="border border-gray-200 px-3 py-3">{formatNumber(row.distributorCommission)}</td>
                    )}
                    {showRetailerCommission && (
                      <td className="border border-gray-200 px-3 py-3">
                        {formatNumber(row.retailerCommission)}
                      </td>
                    )}
                    {showOwnCommission && (
                      <td className="border border-gray-200 px-3 py-3">
                        {formatNumber(row.ownCommission)}
                      </td>
                    )}
                    <td className="border border-gray-200 px-3 py-3">{formatNumber(net)}</td>
                  </tr>
                );
              })}

              {!reportLoading && currentEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableColumnCount}
                    className="border border-gray-200 px-3 py-8 text-center text-sm text-gray-500"
                  >
                    No data available in table
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <TablePaginationFooter
          showingFrom={showingFrom}
          showingTo={showingTo}
          totalEntries={totalEntries}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="text-sm font-semibold text-gray-800">
          Date Wise Player History Data Delete
        </h2>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-700">From</label>
              <input
                type="date"
                value={deleteFromDate}
                onChange={(e) => setDeleteFromDate(e.target.value)}
                className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-700">To</label>
              <input
                type="date"
                value={deleteToDate}
                onChange={(e) => setDeleteToDate(e.target.value)}
                className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={isDeleteBusy}
            className="inline-flex h-10 items-center justify-center rounded bg-indigo-500 px-10 text-sm font-semibold text-white hover:bg-indigo-600"
            onClick={async () => {
              if (!deleteFromDate || !deleteToDate) {
                toast.error("From and To dates are required");
                return;
              }
              try {
                setIsDeleteBusy(true);
                const preview = await reportService.previewDeleteRange({
                  target: "turnover",
                  from: deleteFromDate,
                  to: deleteToDate,
                });
                const previewCount = Number(preview.data?.previewCount ?? 0);
                const token = String(preview.data?.confirmToken ?? "");
                if (previewCount <= 0) {
                  toast.info("No records found for selected range");
                  return;
                }
                setPendingDelete({ from: deleteFromDate, to: deleteToDate, count: previewCount, token });
                setConfirmOpen(true);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Delete failed");
              } finally {
                setIsDeleteBusy(false);
              }
            }}
          >
            {isDeleteBusy ? "Deleting..." : "Delete"}
          </button>
        </div>
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Turnover Delete</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Delete ${pendingDelete.count} turnover source records from ${pendingDelete.from} to ${pendingDelete.to}? This cannot be undone.`
                : "Are you sure you want to continue?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleteBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleteBusy || !pendingDelete}
              onClick={async (e) => {
                e.preventDefault();
                if (!pendingDelete) return;
                try {
                  setIsDeleteBusy(true);
                  const res = await reportService.confirmDeleteRange({
                    target: "turnover",
                    from: pendingDelete.from,
                    to: pendingDelete.to,
                    confirmToken: pendingDelete.token,
                  });
                  toast.success(res.data?.message ?? `Deleted ${res.data?.deletedCount ?? 0} records`);
                  await refetchReport();
                  setConfirmOpen(false);
                  setPendingDelete(null);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Delete failed");
                } finally {
                  setIsDeleteBusy(false);
                }
              }}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {isDeleteBusy ? "Deleting..." : "Delete Records"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
