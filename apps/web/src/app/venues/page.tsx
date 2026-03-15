"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";

interface Venue {
  id: string;
  name: string;
  address: string;
  capacity: number;
  venueType: string[];
  amenities: string[];
  pricing: { baseRateCents: number; currency: string; unit: string };
  latitude: number;
  longitude: number;
}

export default function VenueBrowserPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState({ capacity: "", type: "", lat: "", lng: "" });

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!token) return;
    fetchVenues();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchVenues() {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (search.capacity) params.set("capacity", search.capacity);
    if (search.type) params.set("venueType", search.type);
    if (search.lat) params.set("lat", search.lat);
    if (search.lng) params.set("lng", search.lng);

    try {
      const res = await apiFetch<{ data: Venue[] }>(
        `/api/v1/venues/search?${params}`,
        { token: token ?? undefined },
      );
      setVenues(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) return null;

  const fmt = (cents: number) => `$${(cents / 100).toLocaleString()}`;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-xl font-bold">
            Uni<span className="text-primary">App</span>
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/events" className="hover:text-foreground">Events</Link>
            <Link href="/venues" className="text-foreground font-medium">Venues</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-2xl font-bold">Venue Browser</h1>
        <p className="mt-1 text-muted-foreground">Find the perfect space for your event.</p>

        {/* Search filters */}
        <div className="mt-6 flex flex-wrap gap-3">
          <input
            type="number"
            placeholder="Min capacity"
            value={search.capacity}
            onChange={(e) => setSearch((s) => ({ ...s, capacity: e.target.value }))}
            className="rounded-lg border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring w-36"
          />
          <input
            type="text"
            placeholder="Venue type (e.g. outdoor)"
            value={search.type}
            onChange={(e) => setSearch((s) => ({ ...s, type: e.target.value }))}
            className="rounded-lg border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring w-48"
          />
          <input
            type="number"
            placeholder="Latitude"
            value={search.lat}
            onChange={(e) => setSearch((s) => ({ ...s, lat: e.target.value }))}
            className="rounded-lg border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring w-32"
          />
          <input
            type="number"
            placeholder="Longitude"
            value={search.lng}
            onChange={(e) => setSearch((s) => ({ ...s, lng: e.target.value }))}
            className="rounded-lg border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring w-32"
          />
          <button
            onClick={fetchVenues}
            disabled={loading}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {/* Results */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {venues.length === 0 && !loading && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No venues found. Try adjusting your search filters.
            </div>
          )}
          {venues.map((venue) => (
            <div
              key={venue.id}
              className="rounded-xl border border-border p-5 space-y-3 hover:shadow-sm transition"
            >
              <div>
                <h3 className="font-semibold text-base">{venue.name}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{venue.address}</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {venue.venueType.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-secondary px-2.5 py-0.5 text-xs capitalize"
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-medium">{venue.capacity.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From</span>
                  <span className="font-medium">
                    {fmt(venue.pricing.baseRateCents)}/{venue.pricing.unit}
                  </span>
                </div>
              </div>

              {venue.amenities.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {venue.amenities.slice(0, 4).join(" · ")}
                  {venue.amenities.length > 4 && ` +${venue.amenities.length - 4} more`}
                </p>
              )}

              <Link
                href={`/venues/${venue.id}`}
                className="block w-full rounded-lg border border-border py-2 text-center text-sm hover:bg-accent transition"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
