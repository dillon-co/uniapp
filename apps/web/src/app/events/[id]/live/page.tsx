"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";

interface Shift {
  id: string;
  title: string;
  role: string;
  slots: number;
  filled: number;
  startTime: string;
  endTime: string;
}

interface AgentRun {
  id: string;
  agentType: string;
  action: string;
  createdAt: string;
  costUsd: number | null;
  durationMs: number | null;
}

interface LiveData {
  eventId: string;
  title: string;
  status: string;
  attendanceMax: number | null;
  checkedInCount: number;
  shifts: Shift[];
  recentAgentActivity: AgentRun[];
  warnings: string[];
}

interface WsMessage {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export default function LiveDashboardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user, token, isLoading } = useAuth();
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [connected, setConnected] = useState(false);
  const [feed, setFeed] = useState<WsMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  // Load initial data
  const loadData = useCallback(async () => {
    if (!token || !params.id) return;
    try {
      const [dashRes, agentRes] = await Promise.all([
        apiFetch<{ data: { eventId: string; title: string; status: string; attendanceMax: number | null; bookings: Record<string, number>; warnings: string[] } }>(
          `/api/v1/events/${params.id}/dashboard`,
          { token: token ?? undefined },
        ),
        apiFetch<{ data: AgentRun[] }>(
          `/api/v1/events/${params.id}/agents`,
          { token: token ?? undefined },
        ).catch(() => ({ data: [] as AgentRun[] })),
      ]);

      setLiveData({
        eventId: dashRes.data.eventId,
        title: dashRes.data.title,
        status: dashRes.data.status,
        attendanceMax: dashRes.data.attendanceMax,
        checkedInCount: 0, // populated from WS
        shifts: [],
        recentAgentActivity: agentRes.data.slice(0, 10),
        warnings: dashRes.data.warnings,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, params.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // WebSocket connection
  useEffect(() => {
    if (!token || !params.id) return;

    const wsUrl = `ws://${window.location.hostname}:3001/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "auth", token }));
    };

    ws.onmessage = (e: MessageEvent<string>) => {
      const msg = JSON.parse(e.data) as WsMessage;

      if (msg.event === "authenticated") {
        setConnected(true);
        ws.send(JSON.stringify({ type: "subscribe", room: `event:${params.id}` }));
      }

      if (["booking_updated", "event_state_changed", "agent_action",
           "approval_gate_resolved", "orchestration_complete",
           "volunteer_matching_complete"].includes(msg.event)) {
        setFeed((prev) => [msg, ...prev.slice(0, 49)]);
        // Refresh data on significant events
        if (msg.event !== "ping") loadData();
      }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    return () => ws.close();
  }, [token, params.id, loadData]);

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [feed]);

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading live dashboard...</p>
      </div>
    );
  }

  if (!liveData) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href={`/events/${params.id}`} className="text-sm text-muted-foreground hover:text-foreground">
              ← Dashboard
            </Link>
            <h1 className="font-semibold">{liveData.title}</h1>
            <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-medium">
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
            <span className="text-xs text-muted-foreground">{connected ? "Connected" : "Disconnected"}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {/* Warnings */}
        {liveData.warnings.length > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 flex flex-wrap gap-2">
            {liveData.warnings.map((w, i) => (
              <span key={i} className="text-sm text-yellow-800">⚠ {w}</span>
            ))}
          </div>
        )}

        {/* Hero stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <LiveStat label="Status" value={liveData.status} highlight />
          <LiveStat label="Max Attendance" value={liveData.attendanceMax?.toLocaleString() ?? "—"} />
          <LiveStat label="Active Agents" value={String(liveData.recentAgentActivity.filter(a =>
            new Date(a.createdAt) > new Date(Date.now() - 5 * 60 * 1000)).length)} />
          <LiveStat label="Open Approvals" value={liveData.warnings.filter(w => w.includes("Approval")).length.toString()} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Agent Activity Stream */}
          <div className="lg:col-span-2 rounded-xl border border-border">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold">Live Activity Feed</h2>
              <span className={`text-xs ${connected ? "text-green-600" : "text-muted-foreground"}`}>
                {connected ? "● Live" : "○ Offline"}
              </span>
            </div>
            <div ref={feedRef} className="overflow-y-auto max-h-96 divide-y divide-border">
              {feed.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  Waiting for events...
                </div>
              ) : (
                feed.map((msg, i) => (
                  <div key={i} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {msg.event.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {JSON.stringify(msg.data).slice(0, 120)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Agent Runs */}
          <div className="rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold">Agent Activity</h2>
            </div>
            <div className="divide-y divide-border overflow-y-auto max-h-96">
              {liveData.recentAgentActivity.length === 0 ? (
                <div className="px-5 py-6 text-sm text-center text-muted-foreground">No agent runs yet</div>
              ) : (
                liveData.recentAgentActivity.map((run) => (
                  <div key={run.id} className="px-5 py-3 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {run.agentType.replace(/-/g, " ")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(run.createdAt).toLocaleTimeString()}</span>
                      {run.costUsd && <span>${run.costUsd.toFixed(4)}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border border-border p-5">
          <h2 className="font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/events/${params.id}`}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition"
            >
              Event Dashboard
            </Link>
            <Link
              href="/approvals"
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition"
            >
              Approval Queue
            </Link>
            <Link
              href={`/events/${params.id}`}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition"
            >
              View Bookings
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function LiveStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-2xl font-bold capitalize ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
