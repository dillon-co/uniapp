import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {/* ASCII-style illustration */}
      <pre className="mb-8 select-none font-mono text-muted-foreground/40 leading-tight text-sm sm:text-base">
        {`  ___   _ _  _
 /   | | | || |
| [] | |_  _  |
 \\___/  |_||_|`}
      </pre>

      <h1 className="text-8xl font-bold tracking-tight text-primary">404</h1>
      <h2 className="mt-4 text-2xl font-semibold">Page not found</h2>
      <p className="mt-3 max-w-md text-muted-foreground">
        The page you are looking for does not exist or has been moved. Let us get
        you back on track.
      </p>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/dashboard"
          className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-border px-6 py-3 text-sm font-semibold hover:bg-accent transition"
        >
          Back to Home
        </Link>
      </div>

      <p className="mt-12 text-xs text-muted-foreground">
        If you believe this is a bug, please contact{" "}
        <a href="mailto:support@uniapp.dev" className="underline hover:text-foreground transition">
          support@uniapp.dev
        </a>
      </p>
    </div>
  );
}
