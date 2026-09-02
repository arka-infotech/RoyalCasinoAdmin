"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import EntityEditForm from "@/components/admin/EntityEditForm";
import { useCreateUser } from "@/hooks/useUsers";
import { useAuth } from "@/providers/AuthProvider";

export default function AddUserPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutateAsync: createUser } = useCreateUser();
  const { user } = useAuth();
  const retailerId = searchParams.get("retailerId") ?? "";
  const returnTo = searchParams.get("returnTo");
  const afterSave = returnTo?.startsWith("/") ? returnTo : "/management/users";

  return (
    <EntityEditForm
      title="ADD USER"
      role="user"
      submitLabel="Submit"
      loggedInUser={user}
      initialValues={retailerId ? { retailerId } : undefined}
      onSubmit={async (values) => {
        if (!values.username.trim()) {
          toast.error("Username is required");
          return;
        }
        if (values.password.length < 6) {
          toast.error("Password must be at least 6 characters");
          return;
        }
        if (!values.retailerId) {
          toast.error("Please select a Retailer");
          return;
        }

        await createUser({
          username: values.username.trim(),
          password: values.password,
          role: "user",
          commissionRate: 0,
          parentId: values.retailerId,
        });

        router.push(afterSave);
      }}
    />
  );
}
