import Link from "next/link";

const features = [
  {
    icon: "✦",
    title: "AI Planning",
    description:
      "Claude Opus 4.6 orchestrates your entire event — from concept to execution — using multi-agent parallelism to compress weeks of planning into minutes.",
  },
  {
    icon: "◈",
    title: "Smart Venues",
    description:
      "Search geospatially-indexed venues with real-time availability, capacity checks, and automated booking negotiation on your behalf.",
  },
  {
    icon: "⬡",
    title: "Vendor Network",
    description:
      "Broadcast RFPs to your vendor network, collect competitive bids, and let the AI evaluate pricing and reliability scores automatically.",
  },
  {
    icon: "◎",
    title: "Volunteer Matching",
    description:
      "AI matches volunteers to shifts based on skills, availability, and past performance — then handles confirmations and reminders.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight">
            Uni<span className="text-primary">App</span>
          </span>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center rounded-full border border-border bg-accent px-3 py-1 text-xs font-medium text-muted-foreground">
            Powered by Claude Opus 4.6
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            AI-Powered City
            <br />
            <span className="text-primary">Event Coordination</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            UniApp brings together venues, vendors, volunteers, and permits into a single
            AI-orchestrated platform — so cities can run world-class events without the chaos.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground hover:opacity-90 transition shadow-sm"
            >
              Start Planning for Free
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-border px-8 py-4 text-base font-semibold hover:bg-accent transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-accent/30 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything your city needs, coordinated by AI
            </h2>
            <p className="mt-3 text-muted-foreground">
              Four specialized agents work in parallel so you never have to juggle spreadsheets again.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-background p-6 shadow-sm hover:shadow-md transition"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary text-2xl">
                  {f.icon}
                </div>
                <h3 className="mb-2 font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="border-t border-border px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to transform how your city plans events?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Join cities already running smarter events with UniApp.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-xl bg-primary px-10 py-4 text-base font-semibold text-primary-foreground hover:opacity-90 transition shadow-sm"
          >
            Create Your Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="text-sm font-semibold">
            Uni<span className="text-primary">App</span>
          </span>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} UniApp. AI-Powered City Coordination Platform.
          </p>
        </div>
      </footer>
    </div>
  );
}
