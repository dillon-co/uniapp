"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const REFRESH_INTERVAL_MS = 30_000;

interface HealthData {
  status: string;
  timestamp: string;
  version: string;
  database?: string;
}

interface LatencyHistogramEntry {
  le: number | string;
  count: number;
}

interface RouteMetric {
  route: string;
  count: number;
  errorCount: number;
  avgMs: number;
}

interface MetricsData {
  uptime: { startedAt: string; uptimeSeconds: number };
  requests: { total: number; errorRate: number };
  errors: { total: number };
  latency: { avgMs: number; histogram: LatencyHistogramEntry[] };
  routes: RouteMetric[];
}

type ServiceStatus = "up" | "down" | "unknown";

interface ServiceCard {
  name: string;
  status: ServiceStatus;
  detail: string;
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const colors: Record<ServiceStatus, string> = {
    up: "bg-green-100 text-green-700",
    down: "bg-red-100 text-red-700",
    unknown: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "up" ? "bg-green-500" : status === "down" ? "bg-red-500" : "bg-yellow-500"
        }`}
      />
      {status.toUpperCase()}
    </span>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function HealthDashboardPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  const fetchData = useCallback(async () => {
    setFetchError(null);
    try {
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const [healthRes, metricsRes] = await Promise.allSettled([
        fetch(`${API_BASE}/health`, { headers }),
        fetch(`${API_BASE}/metrics`, { headers }),
      ]);

      if (healthRes.status === "fulfilled" && healthRes.value.ok) {
        setHealth((await healthRes.value.json()) as HealthData);
      } else {
        setHealth(null);
      }

      if (metricsRes.status === "fulfilled" && metricsRes.value.ok) {
        setMetrics((await metricsRes.value.json()) as MetricsData);
      } else {
        setMetrics(null);
      }

      setLastRefreshed(new Date());
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to fetch system status");
    }
  }, [token]);

  useEffect(() => {
    if (isLoading || !user) return;
    void fetchData();
    const interval = setInterval(() => { void fetchData(); }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isLoading, user, fetchData]);

  const services: ServiceCard[] = [
    {
      name: "API",
      status: health?.status === "ok" ? "up" : health === null ? "unknown" : "down",
      detail: health ? `v${health.version}` : "Unreachable",
    },
    {
      name: "Database",
      status:
        health?.database === "connected"
          ? "up"
          : health === null
            ? "unknown"
            : "down",
      detail: health?.database ?? "Unknown",
    },
    {
      name: "Redis",
      status: "unknown",
      detail: "Not monitored yet",
    },
    {
      name: "NATS",
      status: "unknown",
      detail: "Not monitored yet",
    },
  ];

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-muted/20 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">System Health</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {lastRefreshed
                ? `Last updated ${lastRefreshed.toLocaleTimeString()} · Auto-refreshes every 30s`
                : "Loading…"}
            </p>
          </div>
          <button
            onClick={() => { void fetchData(); }}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-accent"
          >
            ↻ Refresh
          </button>
        </div>

        {fetchError && (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            {fetchError}
          </div>
        )}

        {/* Service Status Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {services.map((svc) => (
            <div
              key={svc.name}
              className="rounded-xl border border-border bg-background p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium text-muted-foreground">{svc.name}</span>
                <StatusBadge status={svc.status} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{svc.detail}</p>
            </div>
          ))}
        </div>

        {/* Uptime & Request Stats */}
        {metrics && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Uptime</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {formatUptime(metrics.uptime.uptimeSeconds)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Total Requests</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {metrics.requests.total.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Error Rate</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {(metrics.requests.errorRate * 100).toFixed(2)}%
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">Avg Latency</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {metrics.latency.avgMs.toFixed(0)}ms
              </p>
            </div>
          </div>
        )}

        {/* Top Routes */}
        {metrics && metrics.routes.length > 0 && (
          <div className="rounded-xl border border-border bg-background shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <h2 className="font-semibold">Route Metrics</h2>
            </div>
            <div className="divide-y divide-border">
              {metrics.routes
                .sort((a, b) => b.count - a.count)
                .slice(0, 20)
                .map((route) => (
                  <div key={route.route} className="flex items-center gap-4 px-6 py-3 text-sm">
                    <code className="flex-1 truncate font-mono text-xs text-muted-foreground">
                      {route.route}
                    </code>
                    <span className="w-16 text-right tabular-nums">{route.count} req</span>
                    <span className="w-20 text-right tabular-nums text-muted-foreground">
                      {route.avgMs.toFixed(0)}ms avg
                    </span>
                    <span
                      className={`w-16 text-right tabular-nums ${
                        route.errorCount > 0 ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {route.errorCount} err
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* No data state */}
        {!metrics && !fetchError && (
          <div className="rounded-xl border border-border bg-background p-12 text-center text-muted-foreground shadow-sm">
            <p className="text-sm">No metrics data available. The API may not be running.</p>
          </div>
        )}
      </div>
    </div>
  );
}
