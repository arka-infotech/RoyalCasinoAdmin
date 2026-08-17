"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSuperDistributors, useDeleteUser, useBlockUser, useUnblockUser } from "@/hooks/useUsers";
import { useAuth } from "@/providers/AuthProvider";
import type { User } from "@/types/user";

import { TablePaginationFooter } from "@/components/admin/TablePaginationFooter";
import { SortableTh } from "@/components/admin/SortableTh";
import { sortRowsByKey, type SortDir } from "@/lib/tableSort";
import DrillDownUsername from "@/components/admin/DrillDownUsername";

type ActionKey = "edit" | "changePassword" | "view" | "disable" | "delete";

type ActionButton = {
  key: ActionKey;
  color: string;
  label: string;
};

const actionButtons: ActionButton[] = [
  { key: "edit", color: "bg-cyan-100 text-cyan-700 border-cyan-200", label: "Edit" },
  { key: "changePassword", color: "bg-green-100 text-green-700 border-green-200", label: "Transfer Credit" },
  { key: "view", color: "bg-rose-100 text-rose-700 border-rose-200", label: "Adjust Credit" },
  { key: "disable", color: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Disable" },
  { key: "delete", color: "bg-pink-100 text-pink-700 border-pink-200", label: "Delete" },
];

function ActionIcon({ iconClassName, action, isBlocked = false }: { iconClassName: string; action: ActionKey; isBlocked?: boolean }) {
  switch (action) {
    case "edit":
      return (
        <svg aria-hidden="true" className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" />
        </svg>
      );
    case "changePassword":
      return (
        <svg aria-hidden="true" className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </svg>
      );
    case "view":
      return (
        <svg aria-hidden="true" className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12h8" />
        </svg>
      );
    case "disable":
      return isBlocked ? (
        <svg aria-hidden="true" className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z" />
          <path d="m8 12 2.5 2.5L16 9" />
        </svg>
      ) : (
        <svg aria-hidden="true" className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z" />
          <path d="M7 7l10 10" />
        </svg>
      );
    default:
      return (
        <svg aria-hidden="true" className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      );
  }
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("en-IN", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function DeleteModal({ user, onClose, onConfirm, isPending }: { user: User; onClose: () => void; onConfirm: () => void; isPending: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900">Delete Super Distributor</h2>
        <p className="mt-2 text-sm text-gray-600">Are you sure you want to delete <strong>{user.username}</strong>? This cannot be undone.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={isPending} className="rounded bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-60">
            {isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DisableModal({ user, onClose, onConfirm, isPending }: { user: User; onClose: () => void; onConfirm: () => void; isPending: boolean }) {
  const isBlocked = user.is_blocked;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900">{isBlocked ? "Enable" : "Disable"} Super Distributor</h2>
        <p className="mt-2 text-sm text-gray-600">
          {isBlocked ? "Re-enable" : "Disable"} access for <strong>{user.username}</strong>?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={isPending} className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            {isPending ? "Saving…" : isBlocked ? "Enable" : "Disable"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuperDistributorPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === "admin";
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

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [disableTarget, setDisableTarget] = useState<User | null>(null);

  const { data, isLoading, error } = useSuperDistributors();
  const deleteMutation = useDeleteUser();
  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();

  useEffect(() => {
    if (error) toast.error("Failed to load super distributors");
  }, [error]);

  const allRows: User[] = data?.data?.users ?? [];

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((row) =>
      row.username.toLowerCase().includes(q) ||
      (row.email ?? "").toLowerCase().includes(q)
    );
  }, [allRows, searchQuery]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    return sortRowsByKey(filteredRows, sortKey as keyof User, sortDir);
  }, [filteredRows, sortKey, sortDir]);

  const totalEntries = sortedRows.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage) || 1;

  useEffect(() => { setCurrentPage(1); }, [entriesPerPage, searchQuery]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentEntries = sortedRows.slice(startIndex, endIndex);

  const showingFrom = totalEntries === 0 ? 0 : startIndex + 1;
  const showingTo = totalEntries === 0 ? 0 : Math.min(endIndex, totalEntries);
  function handleAction(action: ActionKey, row: User) {
    if (action === "delete") setDeleteTarget(row);
    else if (action === "disable") setDisableTarget(row);
    else if (action === "view") router.push(`/management/credit-adjust/${row.id}?entity=super-distributor&username=${encodeURIComponent(row.username)}&credits=${row.chips}&parentBalance=unlimited`);
    else if (action === "changePassword") router.push(`/management/credit-transfer/${row.id}?entity=super-distributor&username=${encodeURIComponent(row.username)}&credits=${row.chips}&parentBalance=unlimited`);
    else if (action === "edit") router.push(`/management/super-distributor/edit/${row.id}`);
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 md:text-xl">Super Distributor</h1>
        <Link href="/management/super-distributor/add" className="rounded bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-600 md:text-sm">
          Add Super Distributor
        </Link>
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <span>Show</span>
          <select value={entriesPerPage} onChange={(e) => setEntriesPerPage(parseInt(e.target.value, 10))} className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none">
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span>entries</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <span>Search:</span>
          <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-48 rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none" />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
              <SortableTh columnKey="no" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">No</SortableTh>
              <SortableTh columnKey="username" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Username</SortableTh>
              <SortableTh columnKey="parent_username" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Refer Name</SortableTh>
              <SortableTh columnKey="unique_id" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Unique ID</SortableTh>
              <SortableTh columnKey="chips" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Points</SortableTh>
              <SortableTh columnKey="created_at" sortKey={sortKey} sortDir={sortDir} onSort={requestSort} className="border border-gray-200 px-3 py-2">Date &amp; Time</SortableTh>
              <th className="border border-gray-200 px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="border border-gray-200 px-3 py-3">
                      <div className="h-4 animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : currentEntries.length === 0 ? (
              <tr>
                <td colSpan={7} className="border border-gray-200 px-3 py-8 text-center text-gray-500">
                  {searchQuery ? "No results found." : "No super distributors yet."}
                </td>
              </tr>
            ) : (
              currentEntries.map((row, idx) => (
                <tr key={row.id} className="text-gray-700">
                  <td className="border border-gray-200 px-3 py-3">{startIndex + idx + 1}</td>
                  <td className="border border-gray-200 px-3 py-3">
                    <DrillDownUsername
                      id={row.id}
                      username={row.username}
                      role={row.role}
                      returnTo="/management/super-distributor"
                    />
                  </td>
                  <td className="border border-gray-200 px-3 py-3">{row.parent_username ?? "Admin"}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.unique_id ?? "—"}</td>
                  <td className="border border-gray-200 px-3 py-3">{Number(row.chips ?? 0).toLocaleString()}</td>
                  <td className="border border-gray-200 px-3 py-3">{formatDateTime(row.created_at)}</td>
                  <td className="border border-gray-200 px-2 py-2 overflow-visible">
                    <div className="inline-flex items-center gap-2 rounded bg-white overflow-visible">
                      {actionButtons.filter((action) => action.key !== "delete" || isAdmin).map((action) => {
                        const actionLabel = action.key === "disable" ? (row.is_blocked ? "Enable" : "Disable") : action.label;
                        const actionColor = action.key === "disable"
                          ? (row.is_blocked ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200")
                          : action.color;
                        return (
                        <button
                          key={`${row.id}-${action.key}`}
                          type="button"
                          aria-label={actionLabel}
                          title={actionLabel}
                          onClick={() => handleAction(action.key, row)}
                          className={`flex h-8 w-8 items-center justify-center rounded border p-0 overflow-visible cursor-pointer transition-colors hover:opacity-90 ${actionColor}`}
                        >
                          <ActionIcon iconClassName="h-[22px] w-[22px] block" action={action.key} isBlocked={row.is_blocked} />
                        </button>
                      );})}
                    </div>
                  </td>
                </tr>
              ))
            )}
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

      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          isPending={deleteMutation.isPending}
          onConfirm={() => {
            toast.promise(deleteMutation.mutateAsync(deleteTarget.id), {
              loading: "Deleting…",
              success: () => { setDeleteTarget(null); return "Deleted successfully"; },
              error: "Failed to delete",
            });
          }}
        />
      )}
      {disableTarget && (
        <DisableModal
          user={disableTarget}
          onClose={() => setDisableTarget(null)}
          isPending={blockMutation.isPending || unblockMutation.isPending}
          onConfirm={() => {
            const mutation = disableTarget.is_blocked ? unblockMutation : blockMutation;
            toast.promise(mutation.mutateAsync(disableTarget.id), {
              loading: "Saving…",
              success: () => { setDisableTarget(null); return "Updated successfully"; },
              error: "Failed to update",
            });
          }}
        />
      )}
    </section>
  );
}
