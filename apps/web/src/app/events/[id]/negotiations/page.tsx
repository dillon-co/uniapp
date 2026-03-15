"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";

interface Negotiation {
  id: string;
  eventId: string;
  initiatorType: string;
  initiatorId: string;
  responderType: string;
  responderId: string;
  status: string;
  subject: string;
  currentRound: number;
  maxRounds: number;
  createdAt: string;
  resolvedAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  escalated: "bg-yellow-100 text-yellow-800",
  expired: "bg-gray-100 text-gray-600",
};

export default function EventNegotiationsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { user, token, isLoading } = useAuth();
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!token || !eventId) return;
    apiFetch<{ data: Negotiation[] }>(`/api/v1/negotiations?eventId=${eventId}`, { token })
      .then((res) => setNegotiations(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, eventId]);

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
            href={`/events/${eventId}`}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition"
          >
            Back to Event
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">Negotiations</h1>
        <p className="text-muted-foreground mb-6">All negotiations for this event</p>

        {negotiations.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-muted-foreground">No negotiations yet for this event.</p>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border">
            {negotiations.map((neg) => (
              <div
                key={neg.id}
                className="flex items-center justify-between p-5 hover:bg-accent/50 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold capitalize">{neg.subject.replace(/_/g, " ")}</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[neg.status] ?? "bg-gray-100"}`}
                    >
                      {neg.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="capitalize">{neg.responderType}</span> negotiation &middot; Round{" "}
                    {neg.currentRound}/{neg.maxRounds} &middot;{" "}
                    {new Date(neg.createdAt).toLocaleDateString()}
                    {neg.resolvedAt && ` · Resolved ${new Date(neg.resolvedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <Link
                  href={`/negotiations/${neg.id}`}
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
