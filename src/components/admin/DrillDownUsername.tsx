"use client";

import Link from "next/link";
import type { UserRole } from "@/types/user";
import { buildDrillDownUrl, isDrillableRole } from "@/lib/hierarchyDrillDown";

type Props = {
  id: string;
  username: string;
  role: UserRole;
  returnTo: string;
};

export default function DrillDownUsername({ id, username, role, returnTo }: Props) {
  if (!isDrillableRole(role)) {
    return <span>{username}</span>;
  }

  const href = buildDrillDownUrl(role, id, username, returnTo);
  if (!href) {
    return <span>{username}</span>;
  }

  return (
    <Link href={href} className="text-blue-600 hover:text-blue-800 hover:underline">
      {username}
    </Link>
  );
}
