"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch, ApiError } from "@/lib/api";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  roles: string[];
  cityId: string | null;
  trustScore: number | null;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, isLoading, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ data: UserProfile }>("/api/v1/users/me", { token: token ?? undefined })
      .then((res) => {
        setProfile(res.data);
        setName(res.data.name);
        setPhone(res.data.phone ?? "");
      })
      .catch(console.error);
  }, [token]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    setSaved(false);

    try {
      const res = await apiFetch<{ data: UserProfile }>("/api/v1/users/me", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({
          name: name || undefined,
          phone: phone || null,
        }),
      });
      setProfile(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-xl font-bold">
            Uni<span className="text-primary">App</span>
          </Link>
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="rounded-lg border border-border px-4 py-1.5 text-sm hover:bg-accent transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Profile & Settings</h1>
          <p className="mt-1 text-muted-foreground">Manage your account information.</p>
        </div>

        {/* Account info */}
        <div className="rounded-xl border border-border p-6 space-y-5">
          <h2 className="font-semibold">Account Information</h2>

          <div className="grid gap-2 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Email</span>
              <span>{profile.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Roles</span>
              <span className="capitalize">{profile.roles.join(", ")}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Trust Score</span>
              <span>{profile.trustScore ?? "—"} / 100</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Member since</span>
              <span>{new Date(profile.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Edit profile */}
        <div className="rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-5">Edit Profile</h2>

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {saved && (
            <div className="mb-4 rounded-lg bg-green-100 p-3 text-sm text-green-800">
              Changes saved successfully.
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Danger zone */}
        <div className="rounded-xl border border-destructive/30 p-6">
          <h2 className="font-semibold text-destructive mb-2">Danger Zone</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Sign out from all devices or delete your account.
          </p>
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="rounded-lg border border-destructive px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition"
          >
            Sign out
          </button>
        </div>
      </main>
    </div>
  );
}
