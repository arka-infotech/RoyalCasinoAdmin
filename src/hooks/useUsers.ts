"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/user.service";
import type { CreateUserFormData, EditUserFormData } from "@/validators/auth.validator";
import { getDirectChildRole } from "@/lib/hierarchyDrillDown";
import type { UserRole } from "@/types/user";
import { toast } from "sonner";

type UpdateUserPayload = Partial<EditUserFormData> & { parentId?: string; isBlocked?: boolean };

export function useSuperDistributors() {
  return useQuery({ queryKey: ["users", "super_distributor"], queryFn: () => userService.getUsers({ role: "super_distributor", limit: 500 }) });
}

export function useDistributors(parentId?: string) {
  return useQuery({
    queryKey: ["users", "distributor", parentId],
    queryFn: () => userService.getUsers({ role: "distributor", ...(parentId && { parent_id: parentId }), limit: 500 }),
  });
}

export function useRetailers(parentId?: string) {
  return useQuery({
    queryKey: ["users", "retailer", parentId],
    queryFn: () => userService.getUsers({ role: "retailer", ...(parentId && { parent_id: parentId }), limit: 500 }),
  });
}

export function useUsers(parentId?: string) {
  return useQuery({
    queryKey: ["users", "user", parentId],
    queryFn: () => userService.getUsers({ role: "user", ...(parentId && { parent_id: parentId }), limit: 500 }),
  });
}

export function useDownline(parentId?: string, parentRole?: UserRole) {
  const childRole = parentRole ? getDirectChildRole(parentRole) : null;
  const roleParam = Array.isArray(childRole) ? childRole.join(",") : (childRole ?? "retailer,user");
  return useQuery({
    queryKey: ["users", "downline", parentId, roleParam],
    queryFn: () => userService.getUsers({ role: roleParam, ...(parentId && { parent_id: parentId }), limit: 500 }),
    enabled: !!parentId,
  });
}

export function useHierarchyStats() {
  return useQuery({ queryKey: ["users", "stats"], queryFn: () => userService.getStats(), refetchInterval: 60_000 });
}

export function useOnlineUsers() {
  return useQuery({
    queryKey: ["users", "online"],
    queryFn: () => userService.getOnlineUsers(),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useGetUserById(id: string | null) {
  return useQuery({ queryKey: ["user", id], queryFn: () => userService.getUserById(id!), enabled: !!id });
}

export function useHierarchyDropdown(sdId?: string, distId?: string) {
  return useQuery({
    queryKey: ["hierarchy", sdId, distId],
    queryFn: () => userService.getHierarchy(distId ? { distributor_id: distId } : sdId ? { super_distributor_id: sdId } : undefined),
    enabled: true,
  });
}

export function useHierarchySuperDistributors() {
  return useQuery({
    queryKey: ["hierarchy", "super-distributors"],
    queryFn: async () => {
      const res = await userService.getSuperDistributorsForDropdown();
      return res.data?.superDistributors ?? [];
    },
  });
}

export function useHierarchyDistributors(superDistributorId?: string) {
  return useQuery({
    queryKey: ["hierarchy", "distributors", superDistributorId],
    queryFn: async () => {
      const res = await userService.getDistributorsUnderSD(superDistributorId!);
      return res.data?.distributors ?? [];
    },
    enabled: !!superDistributorId,
  });
}

export function useHierarchyRetailers(distributorId?: string) {
  return useQuery({
    queryKey: ["hierarchy", "retailers", distributorId],
    queryFn: () => userService.getUsers({ role: "retailer", ...(distributorId && { parent_id: distributorId }), limit: 500 }),
    enabled: true,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserFormData) => userService.createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserPayload }) => userService.updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.blockUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User blocked");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.unblockUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User unblocked");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAdjustChips() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      amount,
      type,
      adminPassword,
    }: {
      id: string;
      amount: number;
      type: "add" | "subtract" | "set";
      adminPassword: string;
    }) => userService.adjustChips(id, amount, type, adminPassword),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Chips adjusted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTransferCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, toUserId, amount }: { id: string; toUserId: string; amount: number }) =>
      userService.transferCredit(id, toUserId, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Transfer successful");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
