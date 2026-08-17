import type { UserRole } from "@/types/user";

export type DrillPathNode = { id: string; username: string; role: UserRole };

export function serializeDrillPath(path: DrillPathNode[]): string {
  if (path.length === 0) return "";
  return encodeURIComponent(JSON.stringify(path));
}

export function parseDrillPath(raw: string | null): DrillPathNode[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as DrillPathNode[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n) => n?.id && n?.username && n?.role);
  } catch {
    return [];
  }
}

export function getDirectChildRole(role: UserRole): UserRole | UserRole[] | null {
  switch (role) {
    case "admin":
      return "super_distributor";
    case "super_distributor":
      return "distributor";
    case "distributor":
      return ["retailer", "user"];
    default:
      return null;
  }
}

export function isDrillableRole(role: UserRole): boolean {
  return role === "super_distributor" || role === "distributor";
}

const DRILL_TARGET_PATH: Partial<Record<UserRole, string>> = {
  super_distributor: "/management/distributor",
  distributor: "/management/downline",
};

export function buildDrillDownUrl(
  role: UserRole,
  parentId: string,
  parentName: string,
  returnTo: string
): string | null {
  const basePath = DRILL_TARGET_PATH[role];
  if (!basePath) return null;

  const params = new URLSearchParams({
    parentId,
    parentName,
    returnTo,
  });
  return `${basePath}?${params.toString()}`;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  super_distributor: "Super Distributor",
  distributor: "Distributor",
  retailer: "Retailer",
  user: "User",
};
