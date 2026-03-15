"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch, ApiError } from "@/lib/api";

type Step = "role" | "city" | "done";

const ROLES = [
  { id: "organizer", label: "Event Organizer", desc: "Plan and manage events" },
  { id: "venue_manager", label: "Venue Manager", desc: "List and manage your venue" },
  { id: "vendor", label: "Vendor", desc: "Offer services to event organizers" },
  { id: "volunteer", label: "Volunteer", desc: "Help at community events" },
  { id: "attendee", label: "Attendee", desc: "Discover and attend events" },
] as const;

interface City { id: string; name: string; state: string; }

export default function OnboardingPage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const [step, setStep] = useState<Step>("role");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["attendee"]);
  const [cities, setCities] = useState<City[]>([]);
  const [cityId, setCityId] = useState("");
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

  function toggleRole(id: string) {
    setSelectedRoles((prev) =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter((r) => r !== id) : prev
        : [...prev, id],
    );
  }

  async function complete() {
    if (!token || !cityId) return;
    setSubmitting(true);
    setError("");
    try {
      await apiFetch("/api/v1/onboarding/complete", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ roles: selectedRoles, cityId }),
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Setup failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg bg-background rounded-2xl border border-border shadow-sm p-8 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            Welcome to Uni<span className="text-primary">App</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            {step === "role" ? "What best describes you?" : "Which city are you in?"}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2">
          {(["role", "city"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                step === s || (step === "done") ? "bg-primary" :
                i < ["role", "city"].indexOf(step) ? "bg-primary/50" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {step === "role" && (
          <div className="space-y-3">
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => toggleRole(role.id)}
                className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left transition ${
                  selectedRoles.includes(role.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent"
                }`}
              >
                <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 transition ${
                  selectedRoles.includes(role.id)
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                }`} />
                <div>
                  <p className="font-medium">{role.label}</p>
                  <p className="text-sm text-muted-foreground">{role.desc}</p>
                </div>
              </button>
            ))}
            <button
              onClick={() => setStep("city")}
              disabled={selectedRoles.length === 0}
              className="w-full mt-4 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
            >
              Continue →
            </button>
          </div>
        )}

        {step === "city" && (
          <div className="space-y-4">
            <div className="space-y-3">
              {cities.map((city) => (
                <button
                  key={city.id}
                  onClick={() => setCityId(city.id)}
                  className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left transition ${
                    cityId === city.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 transition ${
                    cityId === city.id ? "border-primary bg-primary" : "border-muted-foreground"
                  }`} />
                  <div>
                    <p className="font-medium">{city.name}</p>
                    <p className="text-sm text-muted-foreground">{city.state}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setStep("role")}
                className="flex-1 rounded-xl border border-border py-3 text-sm hover:bg-accent transition"
              >
                ← Back
              </button>
              <button
                onClick={complete}
                disabled={!cityId || submitting}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
              >
                {submitting ? "Setting up..." : "Get Started"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
