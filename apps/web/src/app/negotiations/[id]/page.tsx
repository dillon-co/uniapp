"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch, ApiError } from "@/lib/api";

interface NegotiationRound {
  round: number;
  proposedBy: string;
  proposedAt: string;
  proposal: { priceCents: number; terms: Record<string, unknown>; notes?: string };
  responseAt?: string;
  response?: { priceCents?: number; notes?: string };
  status: "pending" | "countered" | "accepted" | "rejected";
}

interface Negotiation {
  id: string;
  eventId: string;
  responderType: string;
  responderId: string;
  subject: string;
  status: string;
  rounds: NegotiationRound[];
  currentRound: number;
  maxRounds: number;
  outcome: Record<string, unknown> | null;
  createdAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  active: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  escalated: "bg-yellow-100 text-yellow-800",
  expired: "bg-gray-100 text-gray-600",
};

const ROUND_STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  countered: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function NegotiationPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user, token, isLoading } = useAuth();
  const [neg, setNeg] = useState<Negotiation | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"accept" | "reject" | "counter" | null>(null);
  const [counterPrice, setCounterPrice] = useState("");
  const [counterNote, setCounterNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!token || !params.id) return;
    apiFetch<{ data: Negotiation }>(`/api/v1/negotiations/${params.id}`, {
      token: token ?? undefined,
    })
      .then((res) => setNeg(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, params.id]);

  async function handleRespond() {
    if (!action || !token || !neg) return;
    setSubmitting(true);
    setError("");
    try {
      const body: Record<string, unknown> = { action };
      if (action === "counter" && counterPrice) {
        body.response = {
          priceCents: Math.round(parseFloat(counterPrice) * 100),
          terms: {},
          notes: counterNote,
        };
      }
      const res = await apiFetch<{ data: Negotiation }>(
        `/api/v1/negotiations/${neg.id}/respond`,
        { method: "POST", token: token ?? undefined, body: JSON.stringify(body) },
      );
      setNeg(res.data);
      setAction(null);
      setCounterPrice("");
      setCounterNote("");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to respond");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAiCounter() {
    if (!token || !neg) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await apiFetch<{ data: { priceCents: number; notes: string } }>(
        `/api/v1/negotiations/${neg.id}/ai-counter`,
        { method: "POST", token: token ?? undefined },
      );
      setCounterPrice(String(res.data.priceCents / 100));
      setCounterNote(res.data.notes);
      setAction("counter");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "AI counter failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!neg) return null;

  const fmt = (cents: number) => `$${(cents / 100).toLocaleString()}`;
  const isActive = neg.status === "active";
  const latestRound = neg.rounds.at(-1);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <Link href={`/events/${neg.eventId}`} className="text-sm text-muted-foreground hover:text-foreground">
            ← Event
          </Link>
          <h1 className="font-semibold">Negotiation: {neg.subject}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[neg.status] ?? ""}`}>
            {neg.status}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {/* Meta */}
        <div className="rounded-xl border border-border p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Responder</p>
            <p className="font-medium capitalize">{neg.responderType}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Round</p>
            <p className="font-medium">{neg.currentRound} / {neg.maxRounds}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Started</p>
            <p className="font-medium">{new Date(neg.createdAt).toLocaleDateString()}</p>
          </div>
          {neg.outcome && (
            <div>
              <p className="text-muted-foreground">Final Price</p>
              <p className="font-semibold text-green-700">
                {fmt((neg.outcome as { priceCents?: number }).priceCents ?? 0)}
              </p>
            </div>
          )}
        </div>

        {/* Rounds timeline */}
        <div>
          <h2 className="font-semibold mb-4">Negotiation History</h2>
          <ol className="space-y-4">
            {neg.rounds.map((round) => (
              <li key={round.round} className="rounded-xl border border-border p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Round {round.round}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROUND_STATUS_COLOR[round.status] ?? ""}`}>
                    {round.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-muted-foreground text-xs mb-1">Proposal · {new Date(round.proposedAt).toLocaleString()}</p>
                    <p className="font-semibold">{fmt(round.proposal.priceCents)}</p>
                    {round.proposal.notes && <p className="text-muted-foreground mt-1">{round.proposal.notes}</p>}
                  </div>
                  {round.response && (
                    <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                      <p className="text-blue-600 text-xs mb-1">Response · {round.responseAt ? new Date(round.responseAt).toLocaleString() : ""}</p>
                      {round.response.priceCents && <p className="font-semibold">{fmt(round.response.priceCents)}</p>}
                      {round.response.notes && <p className="text-muted-foreground mt-1">{round.response.notes}</p>}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Response panel (if active and pending) */}
        {isActive && latestRound?.status === "pending" && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 space-y-4">
            <h2 className="font-semibold">Your Response (Round {neg.currentRound})</h2>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <div className="flex flex-wrap gap-2">
              {(["accept", "counter", "reject"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAction(a)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition capitalize ${
                    action === a
                      ? "bg-primary text-primary-foreground"
                      : "border border-border hover:bg-accent"
                  }`}
                >
                  {a}
                </button>
              ))}
              <button
                onClick={handleAiCounter}
                disabled={submitting}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition disabled:opacity-50"
              >
                {submitting ? "Generating..." : "AI Counter"}
              </button>
            </div>

            {action === "counter" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Counter Price ($)</label>
                  <input
                    type="number"
                    value={counterPrice}
                    onChange={(e) => setCounterPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <textarea
                  value={counterNote}
                  onChange={(e) => setCounterNote(e.target.value)}
                  placeholder="Add terms or notes..."
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            )}

            {action && (
              <button
                onClick={handleRespond}
                disabled={submitting || (action === "counter" && !counterPrice)}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50 capitalize"
              >
                {submitting ? "Submitting..." : `Submit ${action}`}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
