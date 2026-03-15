"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";

interface Sponsor {
  id: string;
  name: string;
  categories: string[];
  budgetCents: number;
  targetEventTypes: string[];
  contactEmail: string | null;
  website: string | null;
  description: string | null;
  active: string;
  createdAt: string;
}

interface Sponsorship {
  id: string;
  sponsorId: string;
  eventId: string;
  amountCents: number;
  type: string;
  paymentStatus: string;
  paidAt: string | null;
  createdAt: string;
}

export default function SponsorsPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"sponsors" | "roi">("sponsors");

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ data: Sponsor[] }>("/api/v1/sponsors?active=true", { token })
      .then((res) => setSponsors(res.data))
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

  const totalBudget = sponsors.reduce((sum, s) => sum + s.budgetCents, 0);
  const categoryBreakdown: Record<string, number> = {};
  sponsors.forEach((s) =>
    s.categories.forEach((c) => {
      categoryBreakdown[c] = (categoryBreakdown[c] ?? 0) + 1;
    }),
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
          <Link href="/dashboard" className="text-xl font-bold">
            Uni<span className="text-primary">App</span>
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Sponsors</h1>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-4 border-b border-border mb-6">
          {(["sponsors", "roi"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium transition ${
                activeTab === tab
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "sponsors" ? "All Sponsors" : "ROI Metrics"}
            </button>
          ))}
        </div>

        {activeTab === "roi" && (
          <div className="space-y-6">
            {/* ROI Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground">Total Sponsors</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{sponsors.length}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground">Total Budget Available</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  ${(totalBudget / 100).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {Object.keys(categoryBreakdown).length}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4">
              <h2 className="font-semibold mb-3">Sponsor Categories</h2>
              <div className="space-y-2">
                {Object.entries(categoryBreakdown).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{category}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 bg-primary/20 rounded-full w-24">
                        <div
                          className="h-2 bg-primary rounded-full"
                          style={{ width: `${(count / sponsors.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "sponsors" && (
          <>
            {sponsors.length === 0 ? (
              <div className="rounded-xl border border-border p-12 text-center">
                <p className="text-muted-foreground">No active sponsors yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border">
                {sponsors.map((sponsor) => (
                  <div key={sponsor.id} className="flex flex-col sm:flex-row sm:items-start justify-between p-5 gap-3">
                    <div className="space-y-1.5">
                      <h3 className="font-semibold">{sponsor.name}</h3>
                      {sponsor.description && (
                        <p className="text-sm text-muted-foreground">{sponsor.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {sponsor.categories.map((cat) => (
                          <span
                            key={cat}
                            className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Budget: <span className="font-medium text-foreground">${(sponsor.budgetCents / 100).toLocaleString()}</span>
                        {sponsor.contactEmail && ` · ${sponsor.contactEmail}`}
                      </p>
                    </div>
                    {sponsor.website && (
                      <a
                        href={sponsor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent transition"
                      >
                        Website →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
