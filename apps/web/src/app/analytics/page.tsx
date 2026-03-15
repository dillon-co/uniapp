"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";

interface AnalyticsRecord {
  id: string;
  entityType: string;
  entityId: string;
  metric: string;
  value: number;
  dimensions: Record<string, unknown>;
  recordedAt: string;
}

interface EventSummary {
  id: string;
  title: string;
  type: string;
  status: string;
  attendanceMax: number | null;
  startDate: string | null;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<{
    records: AnalyticsRecord[];
    aggregates: Record<string, { count: number; sum: number; latest: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ data: EventSummary[] }>("/api/v1/events", { token })
      .then((res) => {
        setEvents(res.data);
        if (res.data.length > 0 && res.data[0]) setSelectedEventId(res.data[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || !selectedEventId) return;
    apiFetch<{ data: typeof analyticsData }>(`/api/v1/analytics/events/${selectedEventId}`, { token })
      .then((res) => setAnalyticsData(res.data))
      .catch(() => setAnalyticsData(null));
  }, [token, selectedEventId]);

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const metricDisplayNames: Record<string, string> = {
    attendance: "Attendance",
    revenue_cents: "Revenue ($)",
    booking_count: "Bookings",
    volunteer_hours: "Volunteer Hours",
    conversion_rate: "Conversion Rate (%)",
    cost_cents: "Cost ($)",
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
          <Link href="/dashboard" className="text-xl font-bold">
            Uni<span className="text-primary">App</span>
          </Link>
          <span className="text-sm text-muted-foreground">Analytics</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Event Analytics</h1>
          <select
            className="rounded-lg border border-border px-3 py-2 text-sm bg-background"
            value={selectedEventId ?? ""}
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            <option value="" disabled>Select an event</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </div>

        {selectedEvent && (
          <div className="mb-6 rounded-xl border border-border p-4 bg-accent/20">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold">{selectedEvent.title}</span>
              <span className="rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-medium capitalize">
                {selectedEvent.status}
              </span>
              <span className="text-sm text-muted-foreground capitalize">{selectedEvent.type}</span>
              {selectedEvent.attendanceMax && (
                <span className="text-sm text-muted-foreground">
                  Capacity: {selectedEvent.attendanceMax.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}

        {!analyticsData || analyticsData.records.length === 0 ? (
          <div className="rounded-xl border border-border p-12 text-center">
            <p className="text-muted-foreground">No analytics data recorded yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Analytics records appear as events progress and data is tracked.
            </p>
          </div>
        ) : (
          <>
            {/* Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {Object.entries(analyticsData.aggregates).map(([metric, agg]) => (
                <div key={metric} className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground truncate">
                    {metricDisplayNames[metric] ?? metric}
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {metric.includes("cents")
                      ? `$${(agg.latest / 100).toLocaleString()}`
                      : metric.includes("rate")
                      ? `${agg.latest.toFixed(1)}%`
                      : Math.round(agg.latest).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{agg.count} data points</p>
                </div>
              ))}
            </div>

            {/* Recent Records */}
            <h2 className="text-lg font-semibold mb-4">Recent Records</h2>
            <div className="divide-y divide-border rounded-xl border border-border">
              {analyticsData.records.slice(0, 20).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4">
                  <div>
                    <span className="font-medium text-sm capitalize">
                      {metricDisplayNames[record.metric] ?? record.metric}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {new Date(record.recordedAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="font-bold">
                    {record.metric.includes("cents")
                      ? `$${(record.value / 100).toLocaleString()}`
                      : record.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
