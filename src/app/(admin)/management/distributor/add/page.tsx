"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import EntityEditForm from "@/components/admin/EntityEditForm";
import { useCreateUser } from "@/hooks/useUsers";
import { useAuth } from "@/providers/AuthProvider";

export default function AddDistributorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutateAsync: createUser } = useCreateUser();
  const { user } = useAuth();
  const superDistributorId = searchParams.get("superDistributorId") ?? "";
  const returnTo = searchParams.get("returnTo");
  const afterSave = returnTo?.startsWith("/") ? returnTo : "/management/distributor";

  return (
    <EntityEditForm
      title="ADD DISTRIBUTER"
      role="distributor"
      submitLabel="Submit"
      loggedInUser={user}
      initialValues={superDistributorId ? { superDistributorId } : undefined}
      onSubmit={async (values) => {
        if (!values.username.trim()) {
          toast.error("Username is required");
          return;
        }
        if (values.password.length < 6) {
          toast.error("Password must be at least 6 characters");
          return;
        }
        if (!values.superDistributorId) {
          toast.error("Please select a Super Distributor");
          return;
        }

        await createUser({
          username: values.username.trim(),
          password: values.password,
          role: "distributor",
          commissionRate: values.commission ? parseFloat(values.commission) : 0,
          parentId: values.superDistributorId,
        });

        router.push(afterSave);
      }}
    />
  );
}
