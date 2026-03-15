"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";

interface Event {
  id: string;
  title: string;
  type: string;
  status: string;
  cityId: string;
  startDate: string | null;
  attendanceMax: number | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-secondary text-secondary-foreground",
  planning: "bg-blue-100 text-blue-800",
  negotiating: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  live: "bg-emerald-100 text-emerald-800",
  completed: "bg-gray-100 text-gray-800",
  settled: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-800",
};

export default function EventsPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ data: Event[] }>("/api/v1/events", { token })
      .then((res) => setEvents(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-xl font-bold">
            Uni<span className="text-primary">App</span>
          </Link>
          <Link
            href="/events/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            + New Event
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-2xl font-bold">Events</h1>

        {events.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-muted-foreground">No events yet.</p>
            <Link
              href="/events/new"
              className="mt-4 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              Create your first event
            </Link>
          </div>
        ) : (
          <div className="mt-6 divide-y divide-border rounded-xl border border-border">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-5 hover:bg-accent/50 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{event.title}</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[event.status] ?? ""}`}
                    >
                      {event.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground capitalize">
                    {event.type}
                    {event.attendanceMax &&
                      ` · up to ${event.attendanceMax.toLocaleString()} attendees`}
                    {event.startDate &&
                      ` · ${new Date(event.startDate).toLocaleDateString()}`}
                  </p>
                </div>
                <Link
                  href={`/events/${event.id}`}
                  className="rounded-lg border border-border px-4 py-1.5 text-sm hover:bg-accent transition"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
