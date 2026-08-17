"use client";

import type { ReactNode } from "react";
import QueryProvider from "./QueryProvider";
import { AuthProvider } from "./AuthProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );
}
