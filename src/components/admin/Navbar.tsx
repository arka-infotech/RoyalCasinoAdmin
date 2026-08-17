"use client";

import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { APP_NAME } from "@/lib/appConfig";

interface NavbarProps {
  onOpenSidebar: () => void;
  onToggleDesktopSidebar: () => void;
}

export default function Navbar({ onOpenSidebar, onToggleDesktopSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const username = user?.username ?? "admin";
  const initial = (username?.trim()?.[0] ?? "A").toUpperCase();

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.replace("/login");
  };

  const handleEditPassword = () => {
    setMenuOpen(false);
    router.push("/profile");
  };

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setMenuOpen(false);
    }

    function onDocKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    if (menuOpen) {
      document.addEventListener("pointerdown", onDocPointerDown);
      document.addEventListener("keydown", onDocKeyDown);
      return () => {
        document.removeEventListener("pointerdown", onDocPointerDown);
        document.removeEventListener("keydown", onDocKeyDown);
      };
    }
  }, [menuOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-indigo-950 text-white shadow-md shadow-indigo-900/50">
      <div className="h-full px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleDesktopSidebar}
            className="hidden md:inline-flex rounded-md p-2 hover:bg-indigo-800"
            aria-label="Toggle sidebar"
            type="button"
          >
            ☰
          </button>
          <button
            onClick={onOpenSidebar}
            className="md:hidden rounded-md p-2 hover:bg-indigo-800"
            aria-label="Open sidebar"
            type="button"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-lg md:text-xl font-semibold">{APP_NAME}</h1>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="w-9 h-9 rounded-full bg-indigo-800 hover:bg-indigo-700 flex items-center justify-center text-sm font-semibold transition-colors"
          >
            {initial}
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-3 w-64 rounded-xl bg-white text-gray-900 shadow-xl ring-1 ring-black/10 overflow-hidden"
            >
              <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                <div className="text-[15px] font-semibold leading-5">{username}</div>
                {user?.role && (
                  <div className="mt-1 text-[13px] text-gray-500 capitalize">{user.role.replace(/_/g, " ")}</div>
                )}
              </div>

              <div className="p-2">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleEditPassword}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <span className="grid place-items-center text-gray-600">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      className="h-5 w-5"
                    >
                      <rect
                        x="4"
                        y="10"
                        width="16"
                        height="10"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M8 10V8a4 4 0 1 1 8 0v2"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <span>Edit Password</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <span className="grid place-items-center text-gray-600">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      className="h-5 w-5"
                    >
                      <path
                        d="M10 7H6.5A2.5 2.5 0 0 0 4 9.5v8A2.5 2.5 0 0 0 6.5 20H10"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M20 12H10"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M16 8l4 4-4 4"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
