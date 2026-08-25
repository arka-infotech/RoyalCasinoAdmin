"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

/**
 * Redirects non-admin roles (super_distributor/distributor/retailer) away from
 * admin-only pages (Game, Live Reports, Logs Activity). This is a UX convenience,
 * not real enforcement — the underlying API routes must also check the role,
 * since a page redirect can't stop a direct URL/API call.
 */
export function useRequireAdmin() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);
}
