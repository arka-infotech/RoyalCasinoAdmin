"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EntityEditForm from "@/components/admin/EntityEditForm";
import { useCreateUser } from "@/hooks/useUsers";

export default function AddSuperDistributorPage() {
  const router = useRouter();
  const { mutateAsync: createUser } = useCreateUser();

  return (
    <EntityEditForm
      title="ADD SUPER DISTRIBUTER"
      role="super_distributor"
      submitLabel="Submit"
      onSubmit={async (values) => {
        if (!values.username.trim()) {
          toast.error("Username is required");
          return;
        }
        if (values.password.length < 6) {
          toast.error("Password must be at least 6 characters");
          return;
        }

        await createUser({
          username: values.username.trim(),
          password: values.password,
          role: "super_distributor",
          commissionRate: values.commission ? parseFloat(values.commission) : 0,
        });

        router.push("/management/super-distributor");
      }}
    />
  );
}
