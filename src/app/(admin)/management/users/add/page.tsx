"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EntityEditForm from "@/components/admin/EntityEditForm";
import { useCreateUser } from "@/hooks/useUsers";
import { useAuth } from "@/providers/AuthProvider";
import { userService } from "@/services/user.service";

export default function AddUserPage() {
  const router = useRouter();
  const { mutateAsync: createUser } = useCreateUser();
  const { user } = useAuth();

  return (
    <EntityEditForm
      title="ADD USER"
      role="user"
      submitLabel="Submit"
      loggedInUser={user}
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

        const created = await createUser({
          username: values.username.trim(),
          password: values.password,
          role: "user",
          commissionRate: 0,
          parentId: values.distributorId,
        });

        const newId = created.data?.user?.id;
        if (newId && values.enabledGameIds.length > 0) {
          await userService.setUserGames(newId, values.enabledGameIds, true);
        }

        router.push("/management/users");
      }}
    />
  );
}
