import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Uni<span className="text-primary">App</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          AI-powered city coordination platform. Plan events, discover venues,
          and bring communities together.
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link
            href="/signup"
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-border px-6 py-3 text-sm font-medium hover:bg-accent transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
