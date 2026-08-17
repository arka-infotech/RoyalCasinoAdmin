"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { loginSchema } from "@/validators/auth.validator";
import { useAuth } from "@/hooks/useAuth";
import type { z } from "zod";

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const appName = "Admin Login";
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      await login({ username: values.username, password: values.password });

      // Verify the cookie-backed session is readable by the server,
      // otherwise middleware will redirect back to /login.
      const profileRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth/profile`, { credentials: "include" });
      const profileData: { success?: boolean; message?: string } = await profileRes
        .json()
        .catch(() => ({ success: false, message: "Session check failed" }));

      if (!profileData.success) {
        throw new Error(profileData.message || "Session cookie not set");
      }

      window.location.assign(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/dashboard`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Invalid credentials";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-white shadow-xl">
        <div className="text-center px-6 pt-6 pb-2">
          <h1 className="text-2xl md:text-3xl font-bold text-indigo-900">
            {appName}
          </h1>
          <p className="text-gray-600 mt-2">
            Sign in to access the admin dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Username</label>
            <input
              {...register("username")}
              type="text"
              placeholder="Enter your username"
              className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm  text-black  outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.username && (
              <p className="text-xs text-red-500">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Password</label>
            <input
              {...register("password")}
              type="password"
              placeholder="Enter your password"
              className="w-full h-10 rounded-md border border-gray-300 px-3 text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-black text-sm font-medium transition-colors"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}
