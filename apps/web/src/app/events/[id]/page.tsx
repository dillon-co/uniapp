"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";

interface EventDashboard {
  eventId: string;
  title: string;
  status: string;
  type: string;
  startDate: string | null;
  endDate: string | null;
  attendanceMax: number | null;
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    approved: number;
    venues: number;
    vendors: number;
  };
  budget: {
    totalCents: number;
    committedCents: number;
    remainingCents: number;
    utilizationPct: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    fromStatus: string | null;
    toStatus: string | null;
    note: string | null;
    createdAt: string;
  }>;
  warnings: string[];
  nextActions: string[];
  generatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-secondary text-secondary-foreground",
  planning: "bg-blue-100 text-blue-800",
  negotiating: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  live: "bg-emerald-100 text-emerald-800",
  completed: "bg-gray-100 text-gray-800",
  settled: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-100 text-red-800",
};

const TRANSITIONS: Record<string, string[]> = {
  draft: ["planning", "cancelled"],
  planning: ["negotiating", "cancelled"],
  negotiating: ["confirmed", "planning", "cancelled"],
  confirmed: ["live", "cancelled"],
  live: ["completed"],
  completed: ["settled"],
};

export default function EventDashboardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user, token, isLoading } = useAuth();
  const [dashboard, setDashboard] = useState<EventDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!token || !params.id) return;
    apiFetch<{ data: EventDashboard }>(`/api/v1/events/${params.id}/dashboard`, { token: token ?? undefined })
      .then((res) => setDashboard(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, params.id]);

  async function transition(toStatus: string) {
    if (!token || !params.id) return;
    setTransitioning(true);
    try {
      await apiFetch(`/api/v1/events/${params.id}/transition`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ status: toStatus }),
      });
      // Refresh dashboard
      const res = await apiFetch<{ data: EventDashboard }>(
        `/api/v1/events/${params.id}/dashboard`,
        { token: token ?? undefined },
      );
      setDashboard(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setTransitioning(false);
    }
  }

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!dashboard) return null;

  const allowedTransitions = TRANSITIONS[dashboard.status] ?? [];
  const fmt = (cents: number) => `$${(cents / 100).toLocaleString()}`;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/events" className="text-sm text-muted-foreground hover:text-foreground">
              ← Events
            </Link>
            <h1 className="text-lg font-semibold">{dashboard.title}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[dashboard.status] ?? ""}`}>
              {dashboard.status}
            </span>
          </div>
          <div className="flex gap-2">
            {allowedTransitions.filter((s) => s !== "cancelled").map((s) => (
              <button
                key={s}
                onClick={() => transition(s)}
                disabled={transitioning}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50 capitalize"
              >
                → {s}
              </button>
            ))}
            {allowedTransitions.includes("cancelled") && (
              <button
                onClick={() => transition("cancelled")}
                disabled={transitioning}
                className="rounded-lg border border-destructive px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        {/* Warnings */}
        {dashboard.warnings.length > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-1">
            {dashboard.warnings.map((w, i) => (
              <p key={i} className="text-sm text-yellow-800">⚠ {w}</p>
            ))}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Bookings" value={`${dashboard.bookings.confirmed}/${dashboard.bookings.total}`} sub="confirmed" />
          <StatCard label="Pending" value={String(dashboard.bookings.pending)} sub="awaiting response" />
          <StatCard label="Budget Used" value={`${dashboard.budget.utilizationPct}%`} sub={fmt(dashboard.budget.committedCents)} />
          <StatCard label="Remaining" value={fmt(dashboard.budget.remainingCents)} sub={`of ${fmt(dashboard.budget.totalCents)}`} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Next Actions */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-xl border border-border p-5">
              <h2 className="font-semibold mb-3">Next Actions</h2>
              {dashboard.nextActions.length > 0 ? (
                <ul className="space-y-2">
                  {dashboard.nextActions.map((a, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-primary mt-0.5">→</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No immediate actions needed.</p>
              )}
            </div>

            <div className="rounded-xl border border-border p-5">
              <h2 className="font-semibold mb-3">Event Info</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="capitalize">{dashboard.type}</dd>
                </div>
                {dashboard.startDate && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Date</dt>
                    <dd>{new Date(dashboard.startDate).toLocaleDateString()}</dd>
                  </div>
                )}
                {dashboard.attendanceMax && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Max Attendees</dt>
                    <dd>{dashboard.attendanceMax.toLocaleString()}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Venues</dt>
                  <dd>{dashboard.bookings.venues}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Vendors</dt>
                  <dd>{dashboard.bookings.vendors}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="lg:col-span-2 rounded-xl border border-border p-5">
            <h2 className="font-semibold mb-4">Activity Timeline</h2>
            {dashboard.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ol className="relative border-l border-border space-y-4 ml-2">
                {dashboard.recentActivity.map((entry) => (
                  <li key={entry.id} className="pl-5 relative">
                    <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                    <p className="text-sm font-medium capitalize">
                      {entry.action.replace(/_/g, " ")}
                      {entry.fromStatus && entry.toStatus && (
                        <span className="text-muted-foreground font-normal">
                          {" "}· {entry.fromStatus} → {entry.toStatus}
                        </span>
                      )}
                    </p>
                    {entry.note && (
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.note}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
