"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch, ApiError } from "@/lib/api";

interface ApprovalGate {
  id: string;
  eventId: string;
  type: string;
  status: string;
  title: string;
  description: string | null;
  data: Record<string, unknown>;
  requestedAt: string;
  expiresAt: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  plan_review: "Plan Review",
  booking_confirmation: "Booking Confirmation",
  budget_threshold: "Budget Threshold",
  contract_signing: "Contract Signing",
  agent_action: "Agent Action",
};

export default function ApprovalsPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const [gates, setGates] = useState<ApprovalGate[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ data: ApprovalGate[]; meta: { total: number } }>(
      "/api/v1/approvals/pending",
      { token: token ?? undefined },
    )
      .then((res) => setGates(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  async function respond(gate: ApprovalGate, action: "approve" | "reject") {
    if (!token) return;
    setResponding(gate.id);
    try {
      await apiFetch(`/api/v1/events/${gate.eventId}/approvals/${gate.id}/respond`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ action, note: notes[gate.id] }),
      });
      setGates((prev) => prev.filter((g) => g.id !== gate.id));
    } catch (err) {
      alert(err instanceof ApiError ? err.detail : "Failed to respond");
    } finally {
      setResponding(null);
    }
  }

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
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <Link href="/dashboard" className="text-xl font-bold">
            Uni<span className="text-primary">App</span>
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="font-semibold">Approval Queue</h1>
          {gates.length > 0 && (
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
              {gates.length}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {gates.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-2xl font-bold">All clear</p>
            <p className="mt-2 text-muted-foreground">No pending approvals. Agents are working autonomously.</p>
            <Link href="/dashboard" className="mt-6 inline-block text-sm text-primary hover:underline">
              Back to dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {gates.length} item{gates.length !== 1 ? "s" : ""} need{gates.length === 1 ? "s" : ""} your review.
            </p>

            {gates.map((gate) => (
              <div key={gate.id} className="rounded-xl border border-border p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                        {TYPE_LABELS[gate.type] ?? gate.type}
                      </span>
                      <Link
                        href={`/events/${gate.eventId}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View Event →
                      </Link>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold">{gate.title}</h3>
                    {gate.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{gate.description}</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    <p>Requested {new Date(gate.requestedAt).toLocaleDateString()}</p>
                    {gate.expiresAt && (
                      <p className="mt-0.5">
                        Expires {new Date(gate.expiresAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Plan data preview */}
                {gate.type === "plan_review" && gate.data.plan != null && (
                  <div className="rounded-lg bg-muted/40 p-4 text-sm space-y-2">
                    <PlanSummary plan={gate.data.plan as Record<string, unknown>} />
                  </div>
                )}

                <div className="space-y-2">
                  <textarea
                    placeholder="Optional note or feedback..."
                    value={notes[gate.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [gate.id]: e.target.value }))}
                    rows={2}
                    className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => respond(gate, "approve")}
                      disabled={responding === gate.id}
                      className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
                    >
                      {responding === gate.id ? "Processing..." : "Approve"}
                    </button>
                    <button
                      onClick={() => respond(gate, "reject")}
                      disabled={responding === gate.id}
                      className="flex-1 rounded-lg border border-destructive px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function PlanSummary({ plan }: { plan: Record<string, unknown> }) {
  const conflicts = (plan.conflicts as string[]) ?? [];
  const nextSteps = (plan.nextSteps as string[]) ?? [];

  return (
    <div className="space-y-3">
      {conflicts.length > 0 && (
        <div>
          <p className="font-medium text-yellow-700">⚠ Conflicts Detected</p>
          {conflicts.map((c, i) => <p key={i} className="text-yellow-600 mt-0.5">• {c}</p>)}
        </div>
      )}
      {nextSteps.length > 0 && (
        <div>
          <p className="font-medium">Recommended Next Steps</p>
          {nextSteps.map((s, i) => <p key={i} className="text-muted-foreground mt-0.5">→ {s}</p>)}
        </div>
      )}
    </div>
  );
}
