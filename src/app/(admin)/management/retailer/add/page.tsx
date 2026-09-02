"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import EntityEditForm from "@/components/admin/EntityEditForm";
import { useCreateUser } from "@/hooks/useUsers";
import { useAuth } from "@/providers/AuthProvider";

export default function AddRetailerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutateAsync: createUser } = useCreateUser();
  const { user } = useAuth();
  const distributorId = searchParams.get("distributorId") ?? "";
  const returnTo = searchParams.get("returnTo");
  const afterSave = returnTo?.startsWith("/") ? returnTo : "/management/retailer";

  return (
    <EntityEditForm
      title="ADD RETAILER"
      role="retailer"
      submitLabel="Submit"
      loggedInUser={user}
      initialValues={distributorId ? { distributorId } : undefined}
      onSubmit={async (values) => {
        if (!values.username.trim()) {
          toast.error("Username is required");
          return;
        }
        if (values.password.length < 6) {
          toast.error("Password must be at least 6 characters");
          return;
        }
        if (!values.distributorId) {
          toast.error("Please select a Distributor");
          return;
        }

        await createUser({
          username: values.username.trim(),
          password: values.password,
          role: "retailer",
          commissionRate: values.commission ? parseFloat(values.commission) : 0,
          parentId: values.distributorId,
        });

        router.push(afterSave);
      }}
    />
  );
}
