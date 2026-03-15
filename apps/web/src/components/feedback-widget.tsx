"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch, ApiError } from "@/lib/api";

interface FeedbackFormState {
  message: string;
  rating: number;
  category: "bug" | "feature" | "ux" | "performance" | "general";
}

const CATEGORIES = [
  { id: "general", label: "General" },
  { id: "bug", label: "Bug Report" },
  { id: "feature", label: "Feature Request" },
  { id: "ux", label: "UX / Design" },
  { id: "performance", label: "Performance" },
] as const;

type Category = (typeof CATEGORIES)[number]["id"];

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-2xl transition-transform hover:scale-110 focus:outline-none"
        >
          <span
            className={
              star <= (hovered || value) ? "text-yellow-400" : "text-muted-foreground/30"
            }
          >
            ★
          </span>
        </button>
      ))}
    </div>
  );
}

export function FeedbackWidget() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FeedbackFormState>({
    message: "",
    rating: 0,
    category: "general",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setForm({ message: "", rating: 0, category: "general" });
    setSubmitted(false);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("You must be logged in to submit feedback.");
      return;
    }
    if (form.rating === 0) {
      setError("Please select a rating.");
      return;
    }
    if (!form.message.trim()) {
      setError("Please enter a message.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await apiFetch("/api/v1/feedback", {
        method: "POST",
        token,
        body: JSON.stringify({
          message: form.message.trim(),
          rating: form.rating,
          category: form.category,
          page: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => {
          if (!open) reset();
          setOpen((v) => !v);
        }}
        aria-label="Open feedback"
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus:outline-none"
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-end p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Feedback"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative z-50 mb-16 w-full max-w-sm rounded-2xl border border-border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-semibold">Share Feedback</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-accent"
                aria-label="Close"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {submitted ? (
              <div className="flex flex-col items-center gap-4 p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">
                  ✓
                </div>
                <div>
                  <p className="font-semibold">Thank you!</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your feedback helps us improve UniApp for everyone.
                  </p>
                </div>
                <button
                  onClick={() => {
                    reset();
                    setOpen(false);
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-accent"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4 p-5">
                {error && (
                  <p className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                    {error}
                  </p>
                )}

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, category: cat.id as Category }))}
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          form.category === cat.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-accent"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Rating
                  </label>
                  <StarRating
                    value={form.rating}
                    onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
                  />
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="feedback-message"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Message
                  </label>
                  <textarea
                    id="feedback-message"
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    placeholder="Tell us what you think…"
                    rows={4}
                    maxLength={5000}
                    className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {form.message.length}/5000
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Submit Feedback"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
