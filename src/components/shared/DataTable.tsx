"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { TablePaginationFooter } from "@/components/admin/TablePaginationFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageSkeleton } from "@/components/shared/skeletons/PageSkeleton";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  title: string;
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  keyField?: string;
  onAddNew?: () => void;
  addNewLabel?: string;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  extraFilters?: React.ReactNode;
}

export function DataTable<T extends Record<string, unknown>>({
  title,
  columns,
  data,
  isLoading,
  keyField = "id",
  onAddNew,
  addNewLabel = "Add New",
  searchPlaceholder = "Search...",
  searchKeys = [],
  extraFilters,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search || searchKeys.length === 0) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(q))
    );
  }, [data, search, searchKeys]);

  const totalPages = Math.ceil(filtered.length / entriesPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginated = filtered.slice((safePage - 1) * entriesPerPage, safePage * entriesPerPage);
  const startEntry = filtered.length === 0 ? 0 : (safePage - 1) * entriesPerPage + 1;
  const endEntry = filtered.length === 0 ? 0 : Math.min(safePage * entriesPerPage, filtered.length);

  if (isLoading) return <PageSkeleton showStats={false} />;

  return (
    <div className="p-3">
      <div className="max-w-full bg-white rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {onAddNew && (
            <Button onClick={onAddNew} size="sm" className="gap-2 w-fit">
              <Plus size={16} />
              {addNewLabel}
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap">Show</span>
            <Select value={String(entriesPerPage)} onValueChange={(v) => { setEntriesPerPage(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-20 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">entries</span>
          </div>

          {extraFilters}

          <div className="relative sm:ml-auto">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-8 h-8 text-sm w-full sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-indigo-50">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={`text-left px-4 py-3 font-semibold text-indigo-900 ${col.className ?? ""}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                    No data found
                  </td>
                </tr>
              ) : (
                paginated.map((row, i) => (
                  <tr key={String(row[keyField] ?? i)} className={i % 2 === 0 ? "bg-white" : "bg-indigo-50/30"}>
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 text-gray-700 ${col.className ?? ""}`}>
                        {col.render ? col.render(row) : String(row[col.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePaginationFooter
          showingFrom={startEntry}
          showingTo={endEntry}
          totalEntries={filtered.length}
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
