import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  role: z.enum(["super_distributor", "distributor", "retailer", "user"]),
  parentId: z.string().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  creditBalance: z.number().min(0).optional(),
  chips: z.number().min(0).optional(),
  superDistributorId: z.string().optional(),
  distributorId: z.string().optional(),
  retailerId: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const editUserSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(6).optional().or(z.literal("")),
  parentId: z.string().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  creditBalance: z.number().min(0).optional(),
  chips: z.number().min(0).optional(),
});

export const chipAdjustSchema = z.object({
  amount: z.number().min(0, "Amount must be positive"),
  type: z.enum(["add", "subtract", "set"]),
});

export const creditTransferSchema = z.object({
  toUserId: z.string().min(1, "Recipient is required"),
  amount: z.number().min(1, "Amount must be at least 1"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type EditUserFormData = z.infer<typeof editUserSchema>;
