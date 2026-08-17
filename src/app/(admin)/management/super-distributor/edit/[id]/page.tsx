"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import EntityEditForm from "@/components/admin/EntityEditForm";
import { useGetUserById, useUpdateUser } from "@/hooks/useUsers";

export default function SuperDistributorEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = useGetUserById(id);
  const { mutateAsync: updateUser } = useUpdateUser();

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
      title="EDIT SUPER DISTRIBUTER"
      role="super_distributor"
      isEdit
      userId={user?.unique_id ?? "—"}
      submitLabel="Update"
      initialValues={{
        username: user?.username ?? "",
        password: user?.password ?? "",
        commission: String(user?.commission_rate ?? ""),
        status: user?.is_blocked ? "deactive" : "active",
      }}
      onSubmit={async (values) => {
        const data: { password?: string; commissionRate?: number; isBlocked?: boolean } = {
          commissionRate: values.commission ? parseFloat(values.commission) : undefined,
          isBlocked: values.status === "deactive",
        };
        if (values.password.trim().length >= 6) data.password = values.password.trim();
        await updateUser({ id, data });
        router.push("/management/super-distributor");
      }}
    />
  );
}
