"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch, ApiError } from "@/lib/api";

type Step = "welcome" | "city" | "preferences";

const STEPS: Step[] = ["welcome", "city", "preferences"];

const STEP_LABELS: Record<Step, string> = {
  welcome: "Welcome",
  city: "Select City",
  preferences: "Set Preferences",
};

const NOTIFICATION_OPTIONS = [
  { id: "email_updates", label: "Email Updates", desc: "Get event updates via email" },
  { id: "sms_alerts", label: "SMS Alerts", desc: "Receive SMS for critical changes" },
  { id: "weekly_digest", label: "Weekly Digest", desc: "A weekly summary of city events" },
  { id: "new_events", label: "New Events", desc: "Notify me when new events are published" },
] as const;

interface City {
  id: string;
  name: string;
  state: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const [step, setStep] = useState<Step>("welcome");
  const [cities, setCities] = useState<City[]>([]);
  const [cityId, setCityId] = useState("");
  const [notifications, setNotifications] = useState<string[]>(["email_updates", "new_events"]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ data: City[] }>("/api/v1/cities", { token: token ?? undefined })
      .then((res) => {
        setCities(res.data);
        if (res.data.length > 0) setCityId(res.data[0]!.id);
      })
      .catch(console.error);
  }, [token]);

  function toggleNotification(id: string) {
    setNotifications((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id],
    );
  }

  function nextStep() {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]!);
  }

  function prevStep() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]!);
  }

  async function complete() {
    if (!token || !cityId) return;
    setSubmitting(true);
    setError("");
    try {
      await apiFetch("/api/v1/onboarding/complete", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ cityId, preferences: { notifications } }),
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Setup failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return null;

  const currentStepIndex = STEPS.indexOf(step);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  i < currentStepIndex
                    ? "bg-primary text-primary-foreground"
                    : i === currentStepIndex
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i < currentStepIndex ? "✓" : i + 1}
              </div>
              <span
                className={`hidden text-xs font-medium sm:block ${
                  i === currentStepIndex ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {STEP_LABELS[s]}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 rounded-full transition-colors ${
                    i < currentStepIndex ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-background p-8 shadow-sm">
          {error && (
            <div className="mb-6 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Step 1: Welcome */}
          {step === "welcome" && (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
                  🏙️
                </div>
                <h1 className="text-2xl font-bold">
                  Welcome to Uni<span className="text-primary">App</span>
                </h1>
                <p className="text-muted-foreground">
                  Your AI-powered city coordination platform. Let&apos;s get you set up in just a
                  few steps.
                </p>
              </div>
              <ul className="space-y-3 text-left">
                {[
                  ["🎪", "Discover and plan city events"],
                  ["🏛️", "Find and book venues instantly"],
                  ["🤝", "Connect with vendors and volunteers"],
                  ["🤖", "AI handles the coordination for you"],
                ].map(([icon, text]) => (
                  <li key={text} className="flex items-center gap-3 text-sm">
                    <span className="text-xl">{icon}</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={nextStep}
                className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Get Started →
              </button>
            </div>
          )}

          {/* Step 2: Select City */}
          {step === "city" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold">Select Your City</h2>
                <p className="text-sm text-muted-foreground">
                  Choose the city you want to coordinate events in.
                </p>
              </div>
              <div className="space-y-3">
                {cities.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Loading cities…
                  </p>
                )}
                {cities.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => setCityId(city.id)}
                    className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                      cityId === city.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <div
                      className={`h-4 w-4 flex-shrink-0 rounded-full border-2 transition ${
                        cityId === city.id
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      }`}
                    />
                    <div>
                      <p className="font-medium">{city.name}</p>
                      <p className="text-sm text-muted-foreground">{city.state}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={prevStep}
                  className="flex-1 rounded-xl border border-border py-3 text-sm transition hover:bg-accent"
                >
                  ← Back
                </button>
                <button
                  onClick={nextStep}
                  disabled={!cityId}
                  className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Set Preferences */}
          {step === "preferences" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold">Set Preferences</h2>
                <p className="text-sm text-muted-foreground">
                  Customize how UniApp keeps you informed.
                </p>
              </div>
              <div className="space-y-3">
                {NOTIFICATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => toggleNotification(opt.id)}
                    className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                      notifications.includes(opt.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition ${
                        notifications.includes(opt.id)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground"
                      }`}
                    >
                      {notifications.includes(opt.id) && (
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 12 12">
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{opt.label}</p>
                      <p className="text-sm text-muted-foreground">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={prevStep}
                  className="flex-1 rounded-xl border border-border py-3 text-sm transition hover:bg-accent"
                >
                  ← Back
                </button>
                <button
                  onClick={complete}
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Saving…" : "Start Exploring →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
