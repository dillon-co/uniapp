"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

export default function MobilePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-primary flex items-center justify-center">
            <span className="text-2xl font-bold text-white">U</span>
          </div>
          <p className="text-muted-foreground">Loading UniApp...</p>
        </div>
      </div>
    );
  }

  const quickActions = [
    { href: "/events/new", label: "New Event", icon: "+" },
    { href: "/events", label: "My Events", icon: "📋" },
    { href: "/venues", label: "Venues", icon: "🏛️" },
    { href: "/vendors", label: "Vendors", icon: "🤝" },
    { href: "/volunteers", label: "Volunteers", icon: "👥" },
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-lg font-bold">
            Uni<span className="text-primary">App</span>
          </span>
          <Link href="/profile" className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
            {user?.name?.charAt(0).toUpperCase() ?? "U"}
          </Link>
        </div>
      </header>

      <main className="px-4 py-6 pb-24">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-xl font-bold">Hi, {user?.name?.split(" ")[0] ?? "there"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">What are you working on today?</p>
        </div>

        {/* Quick actions grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 hover:bg-accent transition text-center"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-xs font-medium leading-tight">{action.label}</span>
            </Link>
          ))}
        </div>

        {/* Recent Activity placeholder */}
        <div className="rounded-xl border border-border p-4">
          <h2 className="font-semibold mb-3">Recent Activity</h2>
          <p className="text-sm text-muted-foreground text-center py-4">
            Your recent activity will appear here.
          </p>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="grid grid-cols-5 divide-x divide-border">
          {[
            { href: "/mobile", label: "Home", icon: "🏠" },
            { href: "/events", label: "Events", icon: "📅" },
            { href: "/dashboard", label: "Dash", icon: "📊" },
            { href: "/notifications", label: "Alerts", icon: "🔔" },
            { href: "/profile", label: "Profile", icon: "👤" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 py-3 hover:bg-accent transition"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
