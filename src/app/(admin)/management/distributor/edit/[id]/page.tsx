"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EntityEditForm from "@/components/admin/EntityEditForm";
import { useGetUserById, useUpdateUser } from "@/hooks/useUsers";
import { useAuth } from "@/providers/AuthProvider";
import type { EditUserFormData } from "@/validators/auth.validator";

export default function DistributorEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = useGetUserById(id);
  const { mutateAsync: updateUser } = useUpdateUser();
  const { user: loggedInUser } = useAuth();

  const user = data?.data?.user;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  return (
    <EntityEditForm
      title="EDIT DISTRIBUTER"
      role="distributor"
      isEdit
      userId={user?.unique_id ?? "—"}
      submitLabel="Update"
      loggedInUser={loggedInUser}
      initialValues={{
        username: user?.username ?? "",
        password: user?.password ?? "",
        commission: String(user?.commission_rate ?? ""),
        status: user?.is_blocked ? "deactive" : "active",
        superDistributorId: user?.parent_id ?? "",
      }}
      onSubmit={async (values) => {
        if (!values.superDistributorId) {
          toast.error("Please select a Super Distributor");
          return;
        }
        const updatePayload: Partial<EditUserFormData> & { isBlocked?: boolean; parentId?: string } = {
          commissionRate: values.commission ? parseFloat(values.commission) : undefined,
          isBlocked: values.status === "deactive",
          parentId: values.superDistributorId,
        };
        if (values.password.trim().length >= 6) {
          updatePayload.password = values.password.trim();
        }
        await updateUser({
          id,
          data: updatePayload,
        });
        router.push("/management/distributor");
      }}
    />
  );
}
