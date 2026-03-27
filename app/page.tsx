import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-10 md:px-10">
      <section className="grid gap-8 rounded-[2rem] border border-black/5 bg-white/70 p-8 shadow-card backdrop-blur md:grid-cols-[1.15fr_0.85fr] md:p-12">
        <div className="space-y-6">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-bronze">
            Appointment Engine
          </p>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-ink md:text-6xl">
              Appointment pages that feel already in motion.
            </h1>
            <p className="max-w-xl text-base leading-7 text-black/65 md:text-lg">
              Generate personal lock-in pages and extension-powered links that raise
              show rates through momentum, expectation, and low-friction confirmation.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-white transition hover:bg-black"
            >
              View dashboard
            </Link>
            <a
              href="#setup"
              className="rounded-full border border-black/10 px-6 py-3 text-sm font-medium text-ink transition hover:border-black/20 hover:bg-black/5"
            >
              Setup guide
            </a>
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-black/5 bg-[#f8f5ee] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">
            Included
          </p>
          <div className="mt-6 space-y-4 text-sm text-black/70">
            <div className="rounded-2xl bg-white p-4">
              Dynamic appointment pages at <code>/appt/[id]</code>
            </div>
            <div className="rounded-2xl bg-white p-4">
              API creation endpoint and engagement tracking
            </div>
            <div className="rounded-2xl bg-white p-4">
              Manifest V3 extension with autofill and clipboard copy
            </div>
          </div>
        </div>
      </section>

      <section
        id="setup"
        className="grid gap-6 rounded-[2rem] border border-black/5 bg-white/60 p-8 shadow-card backdrop-blur md:grid-cols-2"
      >
        <div>
          <h2 className="text-2xl font-semibold text-ink">Quick start</h2>
          <ol className="mt-4 space-y-3 text-sm leading-7 text-black/70">
            <li>1. Install dependencies with <code>npm install</code>.</li>
            <li>2. Start the app with <code>npm run dev</code> on <code>http://localhost:6767</code>.</li>
            <li>3. Load <code>extension/</code> as an unpacked Chrome extension.</li>
            <li>4. Set the popup API base URL to your local or deployed app.</li>
          </ol>
        </div>
        <div className="rounded-[1.5rem] bg-ink p-6 text-sm text-white/80">
          <p className="font-medium text-white">Live appointment pages</p>
          <p className="mt-3 leading-7">
            Create links from the extension or API and each appointment page will be
            generated from Supabase-backed data.
          </p>
        </div>
      </section>
    </main>
  );
}
