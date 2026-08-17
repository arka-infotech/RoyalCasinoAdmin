"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

function formatAmount(value: string | null) {
  const n = Number(value ?? "");
  if (!Number.isFinite(n)) return value ?? "0";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CommissionPayoutEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const username = searchParams.get("username") ?? "";
  const commissionRaw = searchParams.get("commission") ?? "0";

  const commissionLabel = useMemo(
    () => formatAmount(commissionRaw),
    [commissionRaw],
  );

  const [payoutAmount, setPayoutAmount] = useState("");

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    // Wire this up to API when backend is ready.
  }

  function handleCancel() {
    router.back();
  }

  return (
    <>
      {/* Breadcrumb outside white container */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500 md:text-sm">
        <Link
          href="/reports/commission-payout-report"
          className="text-indigo-500 hover:underline"
        >
          Commission
        </Link>
        <span className="text-gray-400">/</span>
        <span className="font-medium text-gray-700">Edit User</span>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        {/* Header without bottom border */}
        <div className="mb-4">
          <h1 className="text-base font-semibold tracking-wide text-gray-800 md:text-lg">
            USER DETAIL
          </h1>
        </div>

        {/* Form content, aligned to left */}
        <div className="max-w-5xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User Name + Commission Amount on same row */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 md:text-sm">
                  User Name :
                </label>
                <input
                  type="text"
                  value={username}
                  readOnly
                  className="block w-full md:w-[30rem] rounded border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-800 shadow-sm outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 md:text-sm">
                  Commission Amount :
                </label>
                <input
                  type="text"
                  value={commissionLabel}
                  readOnly
                  className="block w-full md:w-[30rem] rounded border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-800 shadow-sm outline-none"
                />
              </div>
            </div>

            {/* Payout Amount */}
            <div className="mt-2 max-w-md">
              <label className="mb-1 block text-xs font-medium text-gray-600 md:text-sm">
                Payout Amount :
              </label>
              <input
                type="text"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="Enter Your Amount"
                className="block w-full md:w-[30rem] rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm outline-none focus:border-indigo-400"
              />
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center gap-3">
              <button
                type="submit"
                className="rounded bg-indigo-500 px-6 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-600 md:text-sm"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded border border-gray-300 bg-gray-100 px-6 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-200 md:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}

