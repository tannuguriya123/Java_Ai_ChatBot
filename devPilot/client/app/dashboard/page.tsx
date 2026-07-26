"use client";

import { RequireAuth } from "@/components/providers/require-auth";
import { AppShell } from "@/components/layout/app-shell";
import { RepoDashboard } from "@/components/dashboard/repo-dashboard";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <AppShell
        title="Dashboard"
        description="Connect, index, and chat with your GitHub repositories"
      >
        <RepoDashboard />
      </AppShell>
    </RequireAuth>
  );
}
