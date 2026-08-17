export type UserRole = "admin" | "super_distributor" | "distributor" | "retailer" | "user";

export interface User {
  id: string;
  username: string;
  email?: string;
  role: UserRole;
  chips: number;
  credit_balance: number;
  commission_rate: number;
  is_blocked: boolean;
  is_online: boolean;
  last_login?: string;
  created_at: string;
  parent_id?: string;
  parent_username?: string;
  parent_chips?: number;
  unique_id?: string;
  password?: string;
}

export interface HierarchyStats {
  totalSuperDistributors: number;
  totalDistributors: number;
  totalRetailers: number;
  totalOnline: number;
  totalChips: number;
}

export interface HierarchyOption {
  id: string;
  username: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}
