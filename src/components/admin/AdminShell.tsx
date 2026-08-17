"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/admin/Navbar";
import Sidebar from "@/components/admin/Sidebar";
import Footer from "@/components/admin/Footer";
import PlayerPresenceSync from "@/components/admin/PlayerPresenceSync";
import { useAuth } from "@/providers/AuthProvider";

export default function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const loadingScreen = (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-indigo-700 font-medium">Loading...</p>
      </div>
    </div>
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return loadingScreen;
  }

  if (!isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-indigo-50">
      <PlayerPresenceSync />
      <Navbar
        onOpenSidebar={() => setMobileOpen(true)}
        onToggleDesktopSidebar={() => setDesktopOpen((v) => !v)}
      />
      <Sidebar
        open={mobileOpen}
        onOpen={() => setMobileOpen(true)}
        onClose={() => setMobileOpen(false)}
        desktopOpen={desktopOpen}
        onToggleDesktop={() => setDesktopOpen((v) => !v)}
      />

      <div
        className={`pt-20 min-h-screen flex flex-col transition-[margin] duration-300 ml-0 ${
          desktopOpen ? "md:ml-72" : "md:ml-16"
        }`}
      >
        <div className="flex-1 p-4 md:p-6">{children}</div>
        <Footer />
      </div>
    </main>
  );
}
