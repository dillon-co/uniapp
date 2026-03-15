"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold">
            Uni<span className="text-primary">App</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="rounded-lg border border-border px-4 py-1.5 text-sm hover:bg-accent transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <h2 className="text-2xl font-bold">Welcome, {user.name}</h2>
        <p className="mt-2 text-muted-foreground">
          Your roles: {user.roles.join(", ")}
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            title="Events"
            description="Create and manage city events"
            count={0}
          />
          <DashboardCard
            title="Venues"
            description="Discover and book venues"
            count={0}
          />
          <DashboardCard
            title="Bookings"
            description="Track your reservations"
            count={0}
          />
        </div>
      </main>
    </div>
  );
}

function DashboardCard({
  title,
  description,
  count,
}: {
  title: string;
  description: string;
  count: number;
}) {
  return (
    <div className="rounded-xl border border-border p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <p className="mt-4 text-3xl font-bold text-primary">{count}</p>
    </div>
  );
}
