"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import EntityEditForm from "@/components/admin/EntityEditForm";
import { useGetUserById, useUpdateUser } from "@/hooks/useUsers";
import { useAuth } from "@/providers/AuthProvider";
import { userService } from "@/services/user.service";
import type { EditUserFormData } from "@/validators/auth.validator";

export default function UserEditPage({ params }: { params: Promise<{ id: string }> }) {
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
      title="EDIT USER"
      role="user"
      isEdit
      userId={user?.unique_id ?? "—"}
      entityId={user?.id ?? id}
      submitLabel="Update"
      loggedInUser={loggedInUser}
      initialValues={{
        username: user?.username ?? "",
        password: user?.password ?? "",
        commission: "0",
        status: user?.is_blocked ? "deactive" : "active",
        distributorId: user?.parent_id ?? "",
      }}
      onSubmit={async (values) => {
        const updatePayload: Partial<EditUserFormData> & { isBlocked?: boolean } = {
          isBlocked: values.status === "deactive",
        };
        if (values.password.trim().length >= 6) {
          updatePayload.password = values.password.trim();
        }
        await updateUser({
          id,
          data: updatePayload,
        });
        await userService.syncUserGameAccess(user?.id ?? id, values.enabledGameIds);
        router.push("/management/users");
      }}
    />
  );
}
