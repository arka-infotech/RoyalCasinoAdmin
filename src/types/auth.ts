export type UserRole =
  | "admin"
  | "super_distributor"
  | "distributor"
  | "retailer"
  | "user";

export interface User {
    _id: string;
    username: string;
    email?: string;
    role: UserRole;
    uniqueId: string;
  parentId?: string;
}