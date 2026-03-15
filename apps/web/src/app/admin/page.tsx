"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";

interface CityStats {
  cityId: string;
  cityName: string;
  totalEvents: number;
  activeEvents: number;
  pendingPermits: number;
  approvedPermits: number;
}

interface ComplianceEvent {
  id: string;
  title: string;
  status: string;
  cityId: string;
  permitStatus: string;
  capacityCompliant: boolean;
  startDate: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const [cityStats, setCityStats] = useState<CityStats[]>([]);
  const [complianceEvents, setComplianceEvents] = useState<ComplianceEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
    if (!isLoading && user && !user.roles.includes("city_admin") && !user.roles.includes("platform_admin")) {
      router.push("/dashboard");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch<{ data: ComplianceEvent[] }>("/api/v1/compliance/events", { token }).catch(() => ({ data: [] })),
    ])
      .then(([compliance]) => {
        setComplianceEvents(compliance.data);
      })
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

  const pendingPermits = complianceEvents.filter((e) => e.permitStatus === "submitted" || e.permitStatus === "under_review").length;
  const approvedPermits = complianceEvents.filter((e) => e.permitStatus === "approved").length;
  const nonCompliant = complianceEvents.filter((e) => !e.capacityCompliant).length;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
          <Link href="/dashboard" className="text-xl font-bold">
            Uni<span className="text-primary">App</span>
          </Link>
          <span className="text-sm text-muted-foreground">City Admin Dashboard</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">City Administration</h1>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Events", value: complianceEvents.length, color: "text-blue-600" },
            { label: "Pending Permits", value: pendingPermits, color: "text-yellow-600" },
            { label: "Approved Permits", value: approvedPermits, color: "text-green-600" },
            { label: "Non-Compliant", value: nonCompliant, color: "text-red-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-border p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Permit Status Overview */}
        <h2 className="text-lg font-semibold mb-4">Events &amp; Compliance</h2>
        {complianceEvents.length === 0 ? (
          <div className="rounded-xl border border-border p-8 text-center">
            <p className="text-muted-foreground">No events to review.</p>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border">
            {complianceEvents.map((event) => (
              <div key={event.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3">
                <div className="space-y-1">
                  <h3 className="font-medium">{event.title}</h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${
                      event.status === "confirmed" ? "bg-green-100 text-green-800" :
                      event.status === "planning" ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {event.status}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 font-medium ${
                      event.permitStatus === "approved" ? "bg-green-100 text-green-800" :
                      event.permitStatus === "submitted" ? "bg-yellow-100 text-yellow-800" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      Permit: {event.permitStatus}
                    </span>
                    {!event.capacityCompliant && (
                      <span className="rounded-full px-2 py-0.5 font-medium bg-red-100 text-red-800">
                        Capacity Issue
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/events/${event.id}`}
                  className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent transition"
                >
                  Review →
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
