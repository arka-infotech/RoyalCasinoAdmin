"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { toast } from "sonner";

export type UserRole = "admin" | "super_distributor" | "distributor" | "retailer" | "user";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  email?: string;
  chips?: number;
  creditBalance?: number;
  commissionRate?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getStoredUser = (): AuthUser | null => {
  try {
    const data = localStorage.getItem("admin_user");
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const setStoredUser = (u: AuthUser | null) => {
  if (u) localStorage.setItem("admin_user", JSON.stringify(u));
  else localStorage.removeItem("admin_user");
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (credentials: { username: string; password: string }) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Login failed");
      setUser(data.data.user);
      setStoredUser(data.data.user);
    } catch (error) {
      setUser(null);
      setStoredUser(null);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("liveResultAccess");
    }
    setUser(null);
    setStoredUser(null);
    toast.success("Logged out successfully");
  };

  // On mount: restore user from localStorage — cookie is the server-side truth,
  // middleware will redirect to /login if the cookie is expired/missing.
  useEffect(() => {
    const stored = getStoredUser();
    setUser(stored);
    setIsLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
