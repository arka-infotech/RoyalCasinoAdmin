"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useHierarchySuperDistributors, useDistributors, useHierarchyRetailers } from "@/hooks/useUsers";
import type { AuthUser } from "@/providers/AuthProvider";
import { userService } from "@/services/user.service";
import { withoutHiddenGames } from "@/lib/hiddenGames";

export type EntityEditFormTitle =
  | "ADD SUPER DISTRIBUTER"
  | "ADD DISTRIBUTER"
  | "ADD RETAILER"
  | "ADD USER"
  | "EDIT SUPER DISTRIBUTER"
  | "EDIT DISTRIBUTER"
  | "EDIT RETAILER"
  | "EDIT USER";

export type EntityEditFormValues = {
  username: string;
  password: string;
  commission: string;
  status: "active" | "deactive";
  superDistributorId?: string;
  distributorId?: string;
  retailerId?: string;
  /** Backend game IDs that should be enabled */
  enabledGameIds: string[];
};

type GameOption = {
  gameId: string;
  displayName: string;
  enabled: boolean;
};

type Props = {
  title: EntityEditFormTitle;
  role?: "super_distributor" | "distributor" | "retailer" | "user";
  isEdit?: boolean;
  /** Display unique_id in edit form */
  userId?: string;
  /** Real DB uuid — used to load/save game access on edit */
  entityId?: string;
  initialValues?: Partial<EntityEditFormValues>;
  onSubmit?: (values: EntityEditFormValues) => Promise<void> | void;
  submitLabel?: string;
  loggedInUser?: AuthUser | null;
};

export default function EntityEditForm({
  title,
  role,
  isEdit = false,
  userId,
  entityId,
  initialValues,
  onSubmit,
  submitLabel = "Submit",
  loggedInUser,
}: Props) {
  const router = useRouter();
  const showGames = role === "user";

  const safeReturnTo = useMemo(() => {
    if (typeof window === "undefined") return null;
    const raw = new URLSearchParams(window.location.search).get("returnTo");
    if (!raw) return null;
    if (!raw.startsWith("/")) return null;
    return raw;
  }, []);

  const autoSuperDistributorId =
    loggedInUser?.role === "super_distributor" ? loggedInUser.id : undefined;
  const autoDistributorId =
    loggedInUser?.role === "distributor" ? loggedInUser.id : undefined;
  const autoRetailerId =
    loggedInUser?.role === "retailer" ? loggedInUser.id : undefined;

  const defaults = useMemo<EntityEditFormValues>(
    () => ({
      username: initialValues?.username ?? "",
      password: initialValues?.password ?? "",
      commission: initialValues?.commission ?? "",
      status: initialValues?.status ?? "active",
      superDistributorId: initialValues?.superDistributorId ?? autoSuperDistributorId ?? "",
      distributorId: initialValues?.distributorId ?? autoDistributorId ?? "",
      retailerId: initialValues?.retailerId ?? autoRetailerId ?? "",
      enabledGameIds: initialValues?.enabledGameIds ?? [],
    }),
    [
      initialValues?.username,
      initialValues?.password,
      initialValues?.commission,
      initialValues?.status,
      initialValues?.superDistributorId,
      initialValues?.distributorId,
      initialValues?.retailerId,
      initialValues?.enabledGameIds,
      autoSuperDistributorId,
      autoDistributorId,
      autoRetailerId,
    ],
  );

  const [values, setValues] = useState<EntityEditFormValues>(defaults);
  const [isSaving, setIsSaving] = useState(false);
  const [commissionWarning, setCommissionWarning] = useState<string | null>(null);
  const [gameOptions, setGameOptions] = useState<GameOption[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);

  useEffect(() => {
    setValues(defaults);
  }, [defaults]);

  useEffect(() => {
    if (!showGames) return;
    let cancelled = false;

    (async () => {
      setGamesLoading(true);
      try {
        if (isEdit && entityId) {
          const res = await userService.getUserGames(entityId);
          const games = withoutHiddenGames(res.data?.games ?? []);
          if (cancelled) return;
          setGameOptions(
            games.map((g) => ({
              gameId: g.gameId,
              displayName: g.displayName,
              enabled: g.enabled,
            })),
          );
          setValues((v) => ({
            ...v,
            enabledGameIds: games.filter((g) => g.enabled).map((g) => g.gameId),
          }));
        } else {
          const res = await userService.getGameCatalog();
          const games = withoutHiddenGames(res.data?.games ?? []);
          if (cancelled) return;
          setGameOptions(
            games.map((g) => ({
              gameId: g.id,
              displayName: g.displayName,
              enabled: false,
            })),
          );
        }
      } catch {
        if (!cancelled) setGameOptions([]);
      } finally {
        if (!cancelled) setGamesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showGames, isEdit, entityId]);

  const needsSD = role === "distributor";
  const needsDist = role === "retailer";
  const needsRetailer = role === "user";

  const { data: sdData, isLoading: sdLoading } = useHierarchySuperDistributors();
  const { data: allDistData, isLoading: distLoading } = useDistributors();
  const { data: allRetData, isLoading: retLoading } = useHierarchyRetailers();

  const superDistributors = (sdData ?? []) as {
    id: string;
    username: string;
    commission_rate: number;
  }[];
  const distributors = (allDistData?.data?.users ?? []) as {
    id: string;
    username: string;
    commission_rate: number;
  }[];
  const retailers = (allRetData?.data?.users ?? []) as {
    id: string;
    username: string;
    commission_rate: number;
  }[];

  const parentCommissionRate = useMemo(() => {
    if (needsSD) {
      if (autoSuperDistributorId) return loggedInUser?.commissionRate ?? 100;
      const sd = superDistributors.find((s) => s.id === values.superDistributorId);
      return sd ? sd.commission_rate : 100;
    }
    if (needsDist) {
      if (autoDistributorId) return loggedInUser?.commissionRate ?? 100;
      const dist = distributors.find((d) => d.id === values.distributorId);
      return dist ? dist.commission_rate : 100;
    }
    if (needsRetailer) {
      if (autoRetailerId) return loggedInUser?.commissionRate ?? 100;
      const ret = retailers.find((r) => r.id === values.retailerId);
      return ret ? ret.commission_rate : 100;
    }
    return 100;
  }, [
    needsSD,
    needsDist,
    needsRetailer,
    autoSuperDistributorId,
    autoDistributorId,
    autoRetailerId,
    loggedInUser,
    superDistributors,
    distributors,
    retailers,
    values.superDistributorId,
    values.distributorId,
    values.retailerId,
  ]);

  const toggleGame = (gameId: string) => {
    setValues((v) => {
      const has = v.enabledGameIds.includes(gameId);
      return {
        ...v,
        enabledGameIds: has
          ? v.enabledGameIds.filter((id) => id !== gameId)
          : [...v.enabledGameIds, gameId],
      };
    });
    setGameOptions((prev) =>
      prev.map((g) => (g.gameId === gameId ? { ...g, enabled: !g.enabled } : g)),
    );
  };

  const selectAllGames = (enabled: boolean) => {
    setGameOptions((prev) => {
      const next = prev.map((g) => ({ ...g, enabled }));
      setValues((v) => ({
        ...v,
        enabledGameIds: enabled ? next.map((g) => g.gameId) : [],
      }));
      return next;
    });
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
      <h1 className="mb-6 text-base font-semibold text-gray-900 md:text-lg">{title}</h1>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (isSaving) return;
          setIsSaving(true);
          try {
            await onSubmit?.(values);
          } finally {
            setIsSaving(false);
          }
        }}
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-700">User Name :</span>
            <input
              value={values.username}
              onChange={(e) => !isEdit && setValues((v) => ({ ...v, username: e.target.value }))}
              className={`w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none ${
                isEdit
                  ? "cursor-not-allowed bg-gray-100 text-gray-500"
                  : "bg-white focus:border-indigo-400"
              }`}
              placeholder="Enter username"
              readOnly={isEdit}
              required={!isEdit}
            />
          </label>

          {isEdit && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-700">Unique ID :</span>
              <input
                value={userId ?? "—"}
                readOnly
                className="w-full cursor-not-allowed rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500 outline-none"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-700">Password :</span>
            <input
              type="text"
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-indigo-400"
              placeholder={isEdit ? "Account password" : "Enter password"}
              required={!isEdit}
              minLength={isEdit ? undefined : 6}
            />
            {isEdit && (
              <span className="mt-1 block text-xs text-gray-500">
                This account&apos;s password — you can change it here.
              </span>
            )}
          </label>

          {role !== "user" && (
            <label className="block md:col-span-1">
              <span className="mb-1 block text-xs font-medium text-gray-700">Commission (%) :</span>
              <input
                type="number"
                min="0"
                max={parentCommissionRate}
                value={values.commission}
                onChange={(e) => {
                  const raw = e.target.value;
                  const parsed = parseFloat(raw);
                  if (!isNaN(parsed) && parsed > parentCommissionRate) {
                    setValues((v) => ({ ...v, commission: String(parentCommissionRate) }));
                  } else {
                    setValues((v) => ({ ...v, commission: raw }));
                  }
                  setCommissionWarning(null);
                }}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-indigo-400"
                placeholder="Enter commission"
              />
              {(needsSD || needsDist || needsRetailer) && (
                <span className="mt-1 block text-xs text-gray-500">
                  Max allowed: {parentCommissionRate}%
                </span>
              )}
              {commissionWarning && (
                <span className="mt-1 block text-xs font-medium text-red-500">
                  {commissionWarning}
                </span>
              )}
            </label>
          )}

          {needsSD && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-700">
                Super Distributor :
              </span>
              {autoSuperDistributorId ? (
                <input
                  value={loggedInUser?.username ?? ""}
                  readOnly
                  className="w-full cursor-not-allowed rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500 outline-none"
                />
              ) : (
                <select
                  value={values.superDistributorId ?? ""}
                  onChange={(e) => {
                    const newSdId = e.target.value;
                    const newSd = superDistributors.find((s) => s.id === newSdId);
                    const newMax = newSd ? newSd.commission_rate : 100;
                    const current = parseFloat(values.commission);
                    if (!isNaN(current) && current > newMax) {
                      setValues((v) => ({
                        ...v,
                        superDistributorId: newSdId,
                        distributorId: "",
                        commission: "",
                      }));
                      setCommissionWarning(
                        `Parent commission is ${newMax}%. Please re-enter a valid commission.`,
                      );
                    } else {
                      setValues((v) => ({
                        ...v,
                        superDistributorId: newSdId,
                        distributorId: "",
                      }));
                      setCommissionWarning(null);
                    }
                  }}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-indigo-400"
                  required
                  disabled={sdLoading}
                >
                  <option value="">
                    {sdLoading ? "Loading..." : "Select Super Distributor"}
                  </option>
                  {superDistributors.map((sd) => (
                    <option key={sd.id} value={sd.id}>
                      {sd.username}
                    </option>
                  ))}
                </select>
              )}
            </label>
          )}

          {needsDist && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-700">Distributor :</span>
              {autoDistributorId ? (
                <input
                  value={loggedInUser?.username ?? ""}
                  readOnly
                  className="w-full cursor-not-allowed rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500 outline-none"
                />
              ) : (
                <select
                  value={values.distributorId ?? ""}
                  onChange={(e) => {
                    const newDistId = e.target.value;
                    const newDist = distributors.find((d) => d.id === newDistId);
                    const newMax = newDist ? newDist.commission_rate : 100;
                    const current = parseFloat(values.commission);
                    if (!isNaN(current) && current > newMax) {
                      setValues((v) => ({ ...v, distributorId: newDistId, commission: "" }));
                      setCommissionWarning(
                        `Parent commission is ${newMax}%. Please re-enter a valid commission.`,
                      );
                    } else {
                      setValues((v) => ({ ...v, distributorId: newDistId }));
                      setCommissionWarning(null);
                    }
                  }}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-indigo-400"
                  required
                  disabled={distLoading}
                >
                  <option value="">
                    {distLoading
                      ? "Loading..."
                      : distributors.length === 0
                        ? "No distributors found"
                        : "Select Distributor"}
                  </option>
                  {distributors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.username}
                    </option>
                  ))}
                </select>
              )}
            </label>
          )}

          {needsRetailer && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-700">Retailer :</span>
              {autoRetailerId ? (
                <input
                  value={loggedInUser?.username ?? ""}
                  readOnly
                  className="w-full cursor-not-allowed rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500 outline-none"
                />
              ) : (
                <select
                  value={values.retailerId ?? ""}
                  onChange={(e) => {
                    const newRetId = e.target.value;
                    const newRet = retailers.find((r) => r.id === newRetId);
                    const newMax = newRet ? newRet.commission_rate : 100;
                    const current = parseFloat(values.commission);
                    if (!isNaN(current) && current > newMax) {
                      setValues((v) => ({ ...v, retailerId: newRetId, commission: "" }));
                      setCommissionWarning(
                        `Parent commission is ${newMax}%. Please re-enter a valid commission.`,
                      );
                    } else {
                      setValues((v) => ({ ...v, retailerId: newRetId }));
                      setCommissionWarning(null);
                    }
                  }}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-indigo-400"
                  required
                  disabled={retLoading}
                >
                  <option value="">
                    {retLoading
                      ? "Loading..."
                      : retailers.length === 0
                        ? "No retailers found"
                        : "Select Retailer"}
                  </option>
                  {retailers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.username}
                    </option>
                  ))}
                </select>
              )}
            </label>
          )}

          <div className="md:col-span-2">
            <span className="mb-2 block text-xs font-medium text-gray-700">Status :</span>
            <div className="flex items-center gap-6">
              <label className="inline-flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="status"
                  checked={values.status === "active"}
                  onChange={() => setValues((v) => ({ ...v, status: "active" }))}
                  className="h-4 w-4 accent-indigo-600"
                />
                Active
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="status"
                  checked={values.status === "deactive"}
                  onChange={() => setValues((v) => ({ ...v, status: "deactive" }))}
                  className="h-4 w-4 accent-indigo-600"
                />
                Deactive
              </label>
            </div>
          </div>

          {showGames && (
            <div className="md:col-span-2">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-700">Game Access :</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => selectAllGames(true)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    Enable all
                  </button>
                  <button
                    type="button"
                    onClick={() => selectAllGames(false)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    Disable all
                  </button>
                </div>
              </div>
              {gamesLoading ? (
                <p className="text-sm text-gray-500">Loading games...</p>
              ) : gameOptions.length === 0 ? (
                <p className="text-sm text-gray-500">No games found in catalog.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {gameOptions.map((g) => {
                    const checked = values.enabledGameIds.includes(g.gameId);
                    return (
                      <label
                        key={g.gameId}
                        className="flex cursor-pointer items-center gap-3 rounded border border-gray-200 px-3 py-2 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleGame(g.gameId)}
                          className="h-4 w-4 accent-indigo-600"
                        />
                        <span>
                          <span className="block text-sm font-medium text-gray-800">
                            {g.displayName}
                          </span>
                          <span className="block text-xs text-gray-500">{g.gameId}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-60 md:text-sm"
          >
            {isSaving ? "Saving..." : submitLabel}
          </button>
          <button
            type="button"
            onClick={() => (safeReturnTo ? router.push(safeReturnTo) : router.back())}
            className="rounded border border-gray-300 bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-800 transition hover:bg-gray-200 md:text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
