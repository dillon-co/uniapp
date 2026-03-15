"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";

interface Shift {
  id: string;
  eventId: string;
  title: string;
  role: string;
  slots: number;
  filled: number;
  startTime: string;
  endTime: string;
  requirements: string[];
}

interface VolunteerProfile {
  id: string;
  skills: string[];
  availability: Record<string, unknown>;
  preferences: Record<string, unknown>;
}

export default function VolunteersPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingUp, setSigningUp] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch<{ data: Shift[] }>("/api/v1/volunteers/shifts", { token: token ?? undefined }),
      apiFetch<{ data: VolunteerProfile }>("/api/v1/volunteers/me", { token: token ?? undefined })
        .catch(() => ({ data: null })),
    ]).then(([shiftsRes, profileRes]) => {
      setShifts(shiftsRes.data);
      setProfile(profileRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  async function signup(shiftId: string) {
    if (!token) return;
    setSigningUp(shiftId);
    try {
      await apiFetch(`/api/v1/volunteers/shifts/${shiftId}/signup`, {
        method: "POST",
        token: token ?? undefined,
      });
      setShifts((prev) =>
        prev.map((s) => s.id === shiftId ? { ...s, filled: s.filled + 1 } : s)
      );
    } catch (e) {
      console.error(e);
    } finally {
      setSigningUp(null);
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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-xl font-bold">
            Uni<span className="text-primary">App</span>
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/vendors" className="hover:text-foreground">Vendors</Link>
            <Link href="/volunteers" className="text-foreground font-medium">Volunteer</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Volunteer Opportunities</h1>
            <p className="mt-1 text-muted-foreground">Find shifts that match your skills and availability.</p>
          </div>
          {!profile && (
            <Link
              href="/profile"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              Set Up Profile
            </Link>
          )}
        </div>

        {profile && (
          <div className="rounded-xl border border-border p-5">
            <h2 className="font-semibold mb-2">Your Skills</h2>
            <div className="flex flex-wrap gap-2">
              {(profile.skills as string[]).length > 0 ? (
                (profile.skills as string[]).map((skill) => (
                  <span key={skill} className="rounded-full bg-primary/10 text-primary px-3 py-1 text-sm">
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No skills listed — <Link href="/profile" className="text-primary hover:underline">add skills</Link> for better matching.</p>
              )}
            </div>
          </div>
        )}

        {shifts.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p>No open shifts available right now.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shifts.map((shift) => {
              const available = shift.slots - shift.filled;
              const isFull = available <= 0;
              const startDate = new Date(shift.startTime);
              const endDate = new Date(shift.endTime);
              const durationHours = Math.round(
                (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
              );

              return (
                <div key={shift.id} className="rounded-xl border border-border p-5 space-y-3">
                  <div>
                    <h3 className="font-semibold">{shift.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5 capitalize">{shift.role}</p>
                  </div>

                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span>{startDate.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span>{startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span>{durationHours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Spots</span>
                      <span className={isFull ? "text-red-600" : "text-green-600"}>
                        {isFull ? "Full" : `${available} of ${shift.slots} open`}
                      </span>
                    </div>
                  </div>

                  {shift.requirements.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {shift.requirements.map((req) => (
                        <span key={req} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{req}</span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => signup(shift.id)}
                    disabled={isFull || signingUp === shift.id}
                    className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
                  >
                    {signingUp === shift.id ? "Signing up..." : isFull ? "Shift Full" : "Sign Up"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
