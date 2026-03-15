"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";

interface Vendor {
  id: string;
  name: string;
  categories: string[];
  serviceArea: string[];
  pricingRange: { minCents: number; maxCents: number; unit: string };
  trustScore: number | null;
  verifiedAt: string | null;
}

const CATEGORIES = [
  "food", "beverage", "AV", "lighting", "security", "staffing",
  "photography", "videography", "cleanup", "logistics", "medical", "other",
];

export default function VendorDirectoryPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [compared, setCompared] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!token) return;
    fetchVendors();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchVendors() {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (maxPrice) params.set("maxPriceCents", String(parseInt(maxPrice) * 100));

    try {
      const res = await apiFetch<{ data: Vendor[] }>(
        `/api/v1/vendors/search?${params}`,
        { token: token ?? undefined },
      );
      setVendors(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function toggleCompare(id: string) {
    setCompared((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  }

  if (isLoading) return null;

  const fmt = (cents: number) => `$${(cents / 100).toLocaleString()}`;
  const compareList = vendors.filter((v) => compared.has(v.id));

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-xl font-bold">
            Uni<span className="text-primary">App</span>
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/events" className="hover:text-foreground">Events</Link>
            <Link href="/venues" className="hover:text-foreground">Venues</Link>
            <Link href="/vendors" className="text-foreground font-medium">Vendors</Link>
            <Link href="/volunteers" className="hover:text-foreground">Volunteers</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-2xl font-bold">Vendor Directory</h1>
        <p className="mt-1 text-muted-foreground">Find service providers for your event.</p>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Max price ($)"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="rounded-lg border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring w-36"
          />
          <button
            onClick={fetchVendors}
            disabled={loading}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
          {compared.size > 0 && (
            <button
              onClick={() => setCompared(new Set())}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition"
            >
              Clear compare ({compared.size})
            </button>
          )}
        </div>

        {/* Compare panel */}
        {compared.size > 1 && (
          <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5">
            <h2 className="font-semibold mb-4">Comparing {compared.size} vendors</h2>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${compareList.length}, 1fr)` }}>
              {compareList.map((v) => (
                <div key={v.id} className="text-sm space-y-1">
                  <p className="font-medium">{v.name}</p>
                  <p className="text-muted-foreground">{v.categories.join(", ")}</p>
                  <p>{fmt(v.pricingRange.minCents)}–{fmt(v.pricingRange.maxCents)}/{v.pricingRange.unit}</p>
                  <p>Trust: {v.trustScore ?? 50}/100{v.verifiedAt ? " ✓" : ""}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.length === 0 && !loading && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No vendors found. Try adjusting filters.
            </div>
          )}
          {vendors.map((vendor) => (
            <div key={vendor.id} className="rounded-xl border border-border p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{vendor.name}</h3>
                    {vendor.verifiedAt && (
                      <span className="text-xs text-green-600 font-medium">✓ Verified</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {vendor.categories.map((c) => (
                      <span key={c} className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">{c}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => toggleCompare(vendor.id)}
                  className={`text-xs px-2 py-1 rounded border transition ${
                    compared.has(vendor.id)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {compared.has(vendor.id) ? "Comparing" : "Compare"}
                </button>
              </div>

              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price range</span>
                  <span className="font-medium">
                    {fmt(vendor.pricingRange.minCents)}–{fmt(vendor.pricingRange.maxCents)}/{vendor.pricingRange.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trust score</span>
                  <span className="font-medium">{vendor.trustScore ?? 50}/100</span>
                </div>
                {vendor.serviceArea.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serves</span>
                    <span className="font-medium text-right">{vendor.serviceArea.slice(0, 2).join(", ")}</span>
                  </div>
                )}
              </div>

              <Link
                href={`/vendors/${vendor.id}`}
                className="block w-full rounded-lg border border-border py-2 text-center text-sm hover:bg-accent transition"
              >
                View Profile →
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
