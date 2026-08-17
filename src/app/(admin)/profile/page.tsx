"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";

export default function AdminProfilePage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      const res = await fetch(`${base}/api/auth/change-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data: { success?: boolean; message?: string } = await res
        .json()
        .catch(() => ({}));

      if (!res.ok || !data.success) {
        toast.error(data.message ?? "Unable to update password");
        return;
      }

      toast.success(data.message ?? "Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-indigo-900">Admin Profile</h1>

      <div className="rounded-md border border-gray-200 bg-white p-4 md:p-6">
        <h2 className="text-xs font-bold tracking-wide text-gray-800 uppercase">Admin Detail</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-gray-700">Username</label>
            <input
              type="text"
              value={user?.username ?? "admin"}
              disabled
              className="w-full h-10 rounded border border-gray-300 bg-gray-100 px-3 text-sm text-gray-700"
            />
          </div>
        </div>
      </div>

      <div className="rounded-md border border-gray-200 bg-white p-4 md:p-6 md:max-w-2xl">
        <h2 className="text-xs font-bold tracking-wide text-gray-800 uppercase">Change Password</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-700">Old Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your old password"
              className="w-full h-10 rounded border border-gray-300 bg-white px-3 text-sm text-gray-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-700">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
              className="w-full h-10 rounded border border-gray-300 bg-white px-3 text-sm text-gray-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-700">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Enter your confirm password"
              className="w-full h-10 rounded border border-gray-300 bg-white px-3 text-sm text-gray-800"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Changing..." : "Change Password"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
