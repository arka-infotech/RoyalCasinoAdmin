"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAdjustChips } from "@/hooks/useUsers";

type EntityType = "user" | "distributor" | "super-distributor" | "retailer";

function formatCredits(value: string | null) {
  const n = Number(value ?? "");
  if (!Number.isFinite(n)) return value ?? "0";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function backPath(entity: EntityType) {
  if (entity === "user") return "/management/users";
  if (entity === "retailer") return "/management/retailer";
  return `/management/${entity}`;
}

export default function CreditTransferPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const entity = (searchParams.get("entity") as EntityType | null) ?? "user";
  const username = searchParams.get("username") ?? params.id;
  const parentBalanceRaw = searchParams.get("parentBalance");

  const parentBalanceLabel = useMemo(() => {
    if (parentBalanceRaw === 'unlimited') return 'Unlimited';
    return formatCredits(parentBalanceRaw);
  }, [parentBalanceRaw]);

  const [amount, setAmount] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const adjustMutation = useAdjustChips();

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Please enter a valid transfer amount.");
      return;
    }
    if (!adminPassword.trim()) {
      setError("Please enter your password.");
      return;
    }

    try {
      await adjustMutation.mutateAsync({
        id: params.id,
        amount: amt,
        type: "add",
        adminPassword,
      });
      toast.success(`Transferred ${amt.toLocaleString()} credits to ${username}`);
      router.push(backPath(entity));
    } catch {
      setError("Transfer failed. Please check admin password and try again.");
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 md:text-xl">Credit Transfer</h1>
        </div>
        <Link
          href={backPath(entity)}
          className="inline-flex w-fit items-center justify-center rounded border border-gray-300 bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-800 transition hover:bg-gray-200 md:text-sm"
        >
          Back
        </Link>
      </div>

      <div className="mx-auto max-w-3xl">
        <div className="mb-6 grid grid-cols-1 gap-3">
          <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">
            <span className="text-gray-600">User:</span>{" "}
            <span className="font-semibold">{username}</span>
          </div>
          <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">
            <span className="text-gray-600">Available to Transfer:</span>{" "}
            <span className="font-semibold">{parentBalanceLabel}</span>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm text-gray-700">Amount to Transfer</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="Enter amount"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-indigo-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-gray-700">Your Password</span>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-indigo-400"
            />
          </label>

          {error ? (
            <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={adjustMutation.isPending}
            className="rounded bg-indigo-500 px-5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-60 md:text-sm"
          >
            {adjustMutation.isPending ? "Processing..." : "Credit Transfer"}
          </button>
        </form>
      </div>
    </section>
  );
}
