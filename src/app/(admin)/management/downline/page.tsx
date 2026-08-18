"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { TablePaginationFooter } from "@/components/admin/TablePaginationFooter";
import HierarchyBreadcrumb from "@/components/admin/HierarchyBreadcrumb";
import { useDownline, useDeleteUser, useBlockUser, useUnblockUser } from "@/hooks/useUsers";
import { useAuth } from "@/providers/AuthProvider";
import { ROLE_LABELS } from "@/lib/hierarchyDrillDown";
import type { User, UserRole } from "@/types/user";

type ActionKey = "edit" | "changePassword" | "view" | "disable" | "delete";
type ActionButton = { key: ActionKey; color: string; label: string };

const actionButtons: ActionButton[] = [
  { key: "edit", color: "bg-cyan-100 text-cyan-700 border-cyan-200", label: "Edit" },
  { key: "changePassword", color: "bg-green-100 text-green-700 border-green-200", label: "Transfer Credit" },
  { key: "view", color: "bg-rose-100 text-rose-700 border-rose-200", label: "Adjust Credit" },
  { key: "disable", color: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Disable" },
  { key: "delete", color: "bg-pink-100 text-pink-700 border-pink-200", label: "Delete" },
];

function SortIcon() {
  return (
    <span className="inline-flex flex-col leading-none text-[10px] text-gray-400">
      <span className="-mb-0.5">▲</span>
      <span>▼</span>
    </span>
  );
}

function ActionIcon({ iconClassName, action, isBlocked = false }: { iconClassName: string; action: ActionKey; isBlocked?: boolean }) {
  switch (action) {
    case "edit":
      return (
        <svg aria-hidden="true" className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" />
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
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z" /><path d="m8 12 2.5 2.5L16 9" />
        </svg>
      ) : (
        <svg aria-hidden="true" className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z" /><path d="M7 7l10 10" />
        </svg>
      );
    default:
      return (
        <svg aria-hidden="true" className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
        </svg>
      );
  }
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "—";
  try { return new Date(dateStr).toLocaleString("en-IN"); } catch { return dateStr; }
}

function roleLabel(role: UserRole) {
  return ROLE_LABELS[role] ?? role;
}

function roleEntity(role: UserRole): "retailer" | "user" {
  return role === "retailer" ? "retailer" : "user";
}

function editPath(row: User) {
  return row.role === "retailer"
    ? `/management/retailer/edit/${row.id}`
    : `/management/users/edit/${row.id}`;
}

function DeleteModal({ user, onClose, onConfirm, isPending }: { user: User; onClose: () => void; onConfirm: () => void; isPending: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900">Delete {roleLabel(user.role)}</h2>
        <p className="mt-2 text-sm text-gray-600">Delete <strong>{user.username}</strong>? This cannot be undone.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={isPending} className="rounded bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-60">{isPending ? "Deleting…" : "Delete"}</button>
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
        <h2 className="text-base font-semibold text-gray-900">{isBlocked ? "Enable" : "Disable"} {roleLabel(user.role)}</h2>
        <p className="mt-2 text-sm text-gray-600">{isBlocked ? "Re-enable" : "Disable"} access for <strong>{user.username}</strong>?</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={isPending} className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{isPending ? "Saving…" : isBlocked ? "Enable" : "Disable"}</button>
        </div>
      </div>
    </div>
  );
}

export default function DownlinePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parentId = searchParams.get("parentId") ?? undefined;
  const parentName = searchParams.get("parentName") ?? undefined;
  const parentRole = (searchParams.get("parentRole") as UserRole | null) ?? undefined;
  const returnTo = searchParams.get("returnTo") ?? "/management/distributor";

  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === "admin";
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [disableTarget, setDisableTarget] = useState<User | null>(null);

  useEffect(() => {
    if (!parentId) {
      router.replace("/management/distributor");
    }
  }, [parentId, router]);

  const { data, isLoading, error } = useDownline(parentId, parentRole);
  const deleteMutation = useDeleteUser();
  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();

  useEffect(() => { if (error) toast.error("Failed to load downline users"); }, [error]);

  const allRows = useMemo<User[]>(() => data?.data?.users ?? [], [data?.data?.users]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((r) => r.username.toLowerCase().includes(q) || (r.email ?? "").toLowerCase().includes(q));
  }, [allRows, searchQuery]);

  const totalEntries = filteredRows.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage) || 1;

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentEntries = filteredRows.slice(startIndex, endIndex);
  const showingFrom = totalEntries === 0 ? 0 : startIndex + 1;
  const showingTo = totalEntries === 0 ? 0 : Math.min(endIndex, totalEntries);

  function handleAction(action: ActionKey, row: User) {
    const entity = roleEntity(row.role);
    if (action === "delete") setDeleteTarget(row);
    else if (action === "disable") setDisableTarget(row);
    else if (action === "view") router.push(`/management/credit-adjust/${row.id}?entity=${entity}&username=${encodeURIComponent(row.username)}&credits=${row.chips}&parentBalance=${row.parent_chips ?? 0}`);
    else if (action === "changePassword") router.push(`/management/credit-transfer/${row.id}?entity=${entity}&username=${encodeURIComponent(row.username)}&credits=${row.chips}&parentBalance=${row.parent_chips ?? 0}`);
    else if (action === "edit") router.push(editPath(row));
  }

  if (!parentId) {
    return null;
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 md:text-xl">Downline</h1>
      </div>

      {parentName && (
        <HierarchyBreadcrumb
          parentName={parentName}
          returnTo={returnTo}
          resetTo="/management/distributor"
        />
      )}

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <span>Show</span>
          <select value={entriesPerPage} onChange={(e) => { setEntriesPerPage(parseInt(e.target.value, 10)); setCurrentPage(1); }} className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none">
            <option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option>
          </select>
          <span>entries</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <span>Search:</span>
          <input type="search" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-48 rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none" />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
              {["No", "Username", "Role", "Refer Name", "Unique ID", "Points", "Date & Time"].map((h) => (
                <th key={h} className="border border-gray-200 px-3 py-2">
                  <span className="inline-flex items-center gap-2"><span>{h}</span><SortIcon /></span>
                </th>
              ))}
              <th className="border border-gray-200 px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 8 }).map((__, j) => <td key={j} className="border border-gray-200 px-3 py-3"><div className="h-4 animate-pulse rounded bg-gray-200" /></td>)}</tr>
              ))
            ) : currentEntries.length === 0 ? (
              <tr><td colSpan={8} className="border border-gray-200 px-3 py-8 text-center text-gray-500">
                {searchQuery ? "No results found." : parentName ? `No downline entries under ${parentName}.` : "No records found."}
              </td></tr>
            ) : (
              currentEntries.map((row, idx) => (
                <tr key={row.id} className="text-gray-700">
                  <td className="border border-gray-200 px-3 py-3">{startIndex + idx + 1}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.username}</td>
                  <td className="border border-gray-200 px-3 py-3">{roleLabel(row.role)}</td>
                  <td className="border border-gray-200 px-3 py-3">{row.parent_username ?? "—"}</td>
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
                          <button key={`${row.id}-${action.key}`} type="button" aria-label={actionLabel} title={actionLabel} onClick={() => handleAction(action.key, row)}
                            className={`flex h-8 w-8 items-center justify-center rounded border p-0 overflow-visible cursor-pointer transition-colors hover:opacity-90 ${actionColor}`}>
                            <ActionIcon iconClassName="h-[22px] w-[22px] block" action={action.key} isBlocked={row.is_blocked} />
                          </button>
                        );
                      })}
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
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {deleteTarget && (
        <DeleteModal user={deleteTarget} onClose={() => setDeleteTarget(null)} isPending={deleteMutation.isPending}
          onConfirm={() => toast.promise(deleteMutation.mutateAsync(deleteTarget.id), { loading: "Deleting…", success: () => { setDeleteTarget(null); return "Deleted"; }, error: "Failed" })} />
      )}
      {disableTarget && (
        <DisableModal user={disableTarget} onClose={() => setDisableTarget(null)} isPending={blockMutation.isPending || unblockMutation.isPending}
          onConfirm={() => { const m = disableTarget.is_blocked ? unblockMutation : blockMutation; toast.promise(m.mutateAsync(disableTarget.id), { loading: "Saving…", success: () => { setDisableTarget(null); return "Updated"; }, error: "Failed" }); }} />
      )}
    </section>
  );
}
