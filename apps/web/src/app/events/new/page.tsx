"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch, ApiError } from "@/lib/api";

type Step = "describe" | "review" | "confirm";

interface City {
  id: string;
  name: string;
  state: string;
}

interface EdlPreview {
  edl_version: string;
  type: string;
  visibility: string;
  title: string;
  description?: string;
  schedule: {
    flexibility: string;
    start?: string;
    end?: string;
    durationHours?: number;
  };
  location: { type: string; preferredArea?: string };
  attendance: { min: number; max: number };
  budget?: { totalCents: number; currency: string };
  requirements: {
    permitTypes: string[];
    vendors: unknown[];
    stages: number;
  };
  clarifications_needed: string[];
}

export default function NewEventPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();

  const [step, setStep] = useState<Step>("describe");
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [nlInput, setNlInput] = useState("");
  const [edlPreview, setEdlPreview] = useState<EdlPreview | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ data: City[] }>("/api/v1/cities", { token })
      .then((res) => {
        setCities(res.data);
        if (res.data.length > 0) setSelectedCityId(res.data[0]!.id);
      })
      .catch(console.error);
  }, [token]);

  async function handleParse() {
    if (!nlInput.trim() || !selectedCityId) return;
    setError("");
    setLoading(true);

    try {
      const res = await apiFetch<{ data: { edl: EdlPreview } }>(
        "/api/v1/events/parse",
        {
          method: "POST",
          token: token ?? undefined,
          body: JSON.stringify({ input: nlInput, cityId: selectedCityId }),
        },
      );
      setEdlPreview(res.data.edl);
      setEventTitle(res.data.edl.title);
      setStep("review");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.detail
          : "Failed to parse event description",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!edlPreview || !selectedCityId || !eventTitle) return;
    setError("");
    setLoading(true);

    try {
      const res = await apiFetch<{ data: { id: string } }>("/api/v1/events", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          title: eventTitle,
          type: edlPreview.type,
          cityId: selectedCityId,
          edl: { ...edlPreview, title: eventTitle },
          attendanceMin: edlPreview.attendance.min,
          attendanceMax: edlPreview.attendance.max,
          budgetCents: edlPreview.budget?.totalCents,
          startDate: edlPreview.schedule.start,
          endDate: edlPreview.schedule.end,
        }),
      });

      router.push(`/events/${res.data.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.detail : "Failed to create event",
      );
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-4">
          <Link href="/events" className="text-sm text-muted-foreground hover:text-foreground">
            ← Events
          </Link>
          <h1 className="text-lg font-semibold">New Event</h1>
        </div>
      </header>

      {/* Step indicator */}
      <div className="border-b border-border bg-muted/30">
        <div className="mx-auto flex max-w-3xl gap-0 px-6">
          {(["describe", "review", "confirm"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                step === s
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                step === s ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                {i + 1}
              </span>
              <span className="capitalize">{s}</span>
            </div>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {step === "describe" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Describe your event</h2>
              <p className="mt-1 text-muted-foreground">
                Tell us about your event in plain English. Our AI will
                structure it for you.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">City</label>
              <select
                value={selectedCityId}
                onChange={(e) => setSelectedCityId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}, {c.state}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Event Description</label>
              <textarea
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="e.g. Street food festival in downtown Austin, around 2000 people, first weekend of June, $30k budget, need 20 food vendors and a small stage..."
              />
              <p className="text-xs text-muted-foreground">
                Include: event type, expected attendance, dates, location preferences, budget, and any special requirements.
              </p>
            </div>

            <button
              onClick={handleParse}
              disabled={loading || !nlInput.trim() || !selectedCityId}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Analyzing with AI..." : "Generate Event Plan →"}
            </button>
          </div>
        )}

        {step === "review" && edlPreview && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Review your event plan</h2>
              <p className="mt-1 text-muted-foreground">
                AI has structured your event description. Review and adjust before creating.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Event Title</label>
              <input
                type="text"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="rounded-xl border border-border divide-y divide-border">
              <EdlRow label="Type" value={edlPreview.type} />
              <EdlRow label="Visibility" value={edlPreview.visibility} />
              <EdlRow
                label="Attendance"
                value={`${edlPreview.attendance.min.toLocaleString()} – ${edlPreview.attendance.max.toLocaleString()} people`}
              />
              <EdlRow
                label="Location"
                value={[edlPreview.location.type, edlPreview.location.preferredArea]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <EdlRow
                label="Schedule"
                value={
                  edlPreview.schedule.start
                    ? `${new Date(edlPreview.schedule.start).toLocaleDateString()} – ${new Date(edlPreview.schedule.end ?? "").toLocaleDateString()}`
                    : `Flexibility: ${edlPreview.schedule.flexibility}`
                }
              />
              {edlPreview.budget && (
                <EdlRow
                  label="Budget"
                  value={`${edlPreview.budget.currency} ${(edlPreview.budget.totalCents / 100).toLocaleString()}`}
                />
              )}
              {edlPreview.requirements.permitTypes.length > 0 && (
                <EdlRow
                  label="Permits"
                  value={edlPreview.requirements.permitTypes.join(", ")}
                />
              )}
            </div>

            {edlPreview.clarifications_needed.length > 0 && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm font-medium text-yellow-800">
                  Clarifications needed:
                </p>
                <ul className="mt-2 space-y-1">
                  {edlPreview.clarifications_needed.map((note, i) => (
                    <li key={i} className="text-sm text-yellow-700">
                      • {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("describe")}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-accent transition"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep("confirm")}
                disabled={!eventTitle.trim()}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
              >
                Looks Good →
              </button>
            </div>
          </div>
        )}

        {step === "confirm" && edlPreview && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Confirm & Create</h2>
              <p className="mt-1 text-muted-foreground">
                Your event will be created as a draft. You can continue editing after.
              </p>
            </div>

            <div className="rounded-xl border border-border p-6 space-y-2">
              <h3 className="text-lg font-semibold">{eventTitle}</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {edlPreview.type} · {edlPreview.visibility} ·{" "}
                {edlPreview.attendance.max.toLocaleString()} max attendees
              </p>
              {edlPreview.budget && (
                <p className="text-sm text-muted-foreground">
                  Budget: {edlPreview.budget.currency}{" "}
                  {(edlPreview.budget.totalCents / 100).toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("review")}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-accent transition"
              >
                ← Back
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Event"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function EdlRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium capitalize">{value}</span>
    </div>
  );
}
