import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardMetrics } from "@/lib/storage";
import { isAuthenticated } from "@/lib/auth";
import { generateActionSummary } from "@/lib/openai";

export default async function DashboardPage() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect("/login");
  }

  const dashboard = await getDashboardMetrics();
  let aiSummary: string | null = null;

  try {
    aiSummary = await generateActionSummary({
      suggestions: dashboard.suggestions,
      todayAppointments: dashboard.todayAppointments,
      tomorrowAppointments: dashboard.tomorrowAppointments
    });
  } catch {
    aiSummary = null;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <section className="rounded-[2rem] border border-black/5 bg-white/75 p-6 shadow-card backdrop-blur md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/40">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-ink md:text-5xl">
              Every appointment, with the urgent ones surfaced first
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/settings"
              className="inline-flex rounded-full border border-black/10 px-4 py-3 text-sm font-medium text-ink"
            >
              Edit template
            </Link>
            <Link
              href="/"
              className="inline-flex rounded-full border border-black/10 px-4 py-3 text-sm font-medium text-ink"
            >
              Back home
            </Link>
            <form action="/api/auth/logout" method="post">
              <button className="inline-flex rounded-full bg-ink px-4 py-3 text-sm font-medium text-white">
                Log out
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <MetricCard label="Show rate" value={`${dashboard.showRate}%`} />
          <MetricCard label="Confirmation rate" value={`${dashboard.confirmationRate}%`} />
          <MetricCard label="Open rate" value={`${dashboard.openRate}%`} />
          <MetricCard label="High-intent" value={dashboard.highIntent.toString()} />
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-black/5 bg-[#1d2a26] p-6 text-white shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
            AI Action Panel
          </p>
          {aiSummary ? (
            <div className="mt-4 rounded-[1.3rem] bg-white/5 p-4 text-sm leading-7 text-white/85">
              {aiSummary}
            </div>
          ) : null}
          <div className="mt-4 space-y-3 text-sm leading-7 text-white/80">
            {dashboard.suggestions.length > 0 ? (
              dashboard.suggestions.map((suggestion) => (
                <div key={suggestion} className="rounded-[1.3rem] bg-white/5 p-4">
                  {suggestion}
                </div>
              ))
            ) : (
              <div className="rounded-[1.3rem] bg-white/5 p-4">
                No urgent intervention signals right now.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-black/5 bg-white/75 p-6 shadow-card backdrop-blur">
          <SectionHeader
            eyebrow="Today"
            title="Appointments scheduled for today"
            subtitle="Status reflects confirmations, late arrivals, reschedule requests, and cancellations."
          />
        <div className="mt-5 grid gap-4">
          {dashboard.todayAppointments.length > 0 ? (
            dashboard.todayAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            ) : (
              <EmptyState label="No appointments on today's board." />
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-black/5 bg-white/75 p-6 shadow-card backdrop-blur">
        <SectionHeader
          eyebrow="All Appointments"
          title="Full appointment list"
          subtitle="This shows every appointment in the database, not just today's board."
        />
        <div className="mt-5 grid gap-4">
          {dashboard.allAppointments.length > 0 ? (
            dashboard.allAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))
          ) : (
            <EmptyState label="No appointments found yet." />
          )}
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-black/5 bg-white/75 p-6 shadow-card backdrop-blur">
        <SectionHeader
          eyebrow="Tomorrow"
          title="Needs Confirmation"
          subtitle="Tomorrow's appointments should be pushed toward a micro-commitment."
        />
        <div className="mt-5 grid gap-4">
          {dashboard.tomorrowAppointments.length > 0 ? (
            dashboard.tomorrowAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} tomorrow />
            ))
          ) : (
            <EmptyState label="No appointments lined up for tomorrow." />
          )}
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-black/5 bg-white/75 p-6 shadow-card backdrop-blur">
        <SectionHeader
          eyebrow="Debug"
          title="Overdue and persistence debug"
          subtitle="Temporary visibility to confirm every appointment exists in the database and is queryable."
        />
        <div className="mt-5 grid gap-4">
          {dashboard.overdueAppointments.length > 0 ? (
            dashboard.overdueAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} debug />
            ))
          ) : (
            <EmptyState label="No overdue appointments right now." />
          )}
        </div>
      </section>
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/40">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-black/60">{subtitle}</p>
    </div>
  );
}

function AppointmentCard({
  appointment,
  tomorrow = false,
  debug = false
}: {
  appointment: {
    id: string;
    name: string;
    vehicle: string;
    formattedTime: string;
    appointment_at?: string;
    appointment_page_url?: string;
    google_calendar_event_id?: string;
    created_at: string;
    source?: string;
    status:
      | "scheduled"
      | "confirmed"
      | "viewed"
      | "running_late"
      | "reschedule_requested"
      | "canceled"
      | "not_opened"
      | "calendar_sync_failed";
    priority: "high" | "normal" | "low";
    phone?: string;
    advisor_phone?: string;
  };
  tomorrow?: boolean;
  debug?: boolean;
}) {
  const statusTone =
    appointment.status === "confirmed"
      ? "bg-[#d6e7db] text-[#224735]"
      : appointment.status === "running_late"
        ? "bg-[#f3e3c9] text-[#835628]"
        : appointment.status === "reschedule_requested"
          ? "bg-[#e7ddf3] text-[#5f3c82]"
          : appointment.status === "canceled"
            ? "bg-[#f0ddda] text-[#8b3d34]"
      : appointment.status === "scheduled"
        ? "bg-[#e5e2dd] text-[#4b4640]"
        : appointment.status === "calendar_sync_failed"
          ? "bg-[#f0ddda] text-[#8b3d34]"
      : appointment.status === "viewed"
        ? "bg-[#ece3d5] text-[#7a5328]"
        : "bg-[#f0ddda] text-[#8b3d34]";
  const priorityTone =
    appointment.priority === "high"
      ? "bg-[#8b3d34] text-white"
      : appointment.priority === "low"
        ? "bg-[#d6e7db] text-[#224735]"
        : "bg-black/5 text-black/65";

  return (
    <div className="grid gap-4 rounded-[1.5rem] border border-black/5 bg-[#faf7f0] p-4 md:grid-cols-[1.2fr_0.9fr_auto]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-semibold text-ink">{appointment.name}</p>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusTone}`}>
            {appointment.status.replace("_", " ")}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${priorityTone}`}>
            {appointment.priority} priority
          </span>
          {tomorrow ? (
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold uppercase text-black/55">
              Needs Confirmation
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-black/65">{appointment.vehicle}</p>
        <p className="mt-1 text-sm text-black/55">{appointment.formattedTime}</p>
        {debug ? (
          <div className="mt-3 space-y-1 text-xs text-black/45">
            <p>ID: {appointment.id}</p>
            <p>created_at: {appointment.created_at}</p>
            <p>appointment_at: {appointment.appointment_at || "missing"}</p>
            <p>calendar_event_id: {appointment.google_calendar_event_id || "none"}</p>
            <p>status: {appointment.status}</p>
            <p>source: {appointment.source || "extension"}</p>
            <p>page_url: {appointment.appointment_page_url || "missing"}</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {(appointment.advisor_phone || appointment.phone) ? (
          <>
            <a
              href={`sms:${appointment.advisor_phone || appointment.phone}`}
              className="inline-flex items-center rounded-full border border-black/10 px-4 py-2 font-medium text-ink"
            >
              Text
            </a>
            <a
              href={`tel:${appointment.advisor_phone || appointment.phone}`}
              className="inline-flex items-center rounded-full border border-black/10 px-4 py-2 font-medium text-ink"
            >
              Call
            </a>
          </>
        ) : null}
        <Link
          href={`/appt/${appointment.id}`}
          className="inline-flex items-center rounded-full border border-black/10 px-4 py-2 font-medium text-ink"
        >
          Resend link
        </Link>
      </div>

      <div className="flex items-start justify-start md:justify-end">
        <Link
          href={`/appt/${appointment.id}`}
          className="inline-flex rounded-full bg-ink px-4 py-2 text-sm font-medium text-white"
        >
          Open page
        </Link>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-black/5 bg-[#faf7f0] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/40">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-[1.5rem] bg-[#faf7f0] p-5 text-sm text-black/60">{label}</div>;
}
