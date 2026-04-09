import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardMetrics } from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth";
import { generateActionSummary } from "@/lib/openai";
import { DashboardCreateForm } from "@/components/dashboard-create-form";
import { listAdvisorUsers } from "@/lib/users";
import { DashboardAppointmentActions } from "@/components/dashboard-appointment-actions";

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const [dashboard, teamMembers] = await Promise.all([getDashboardMetrics(), listAdvisorUsers()]);
  const advisors =
    teamMembers.length > 0
      ? teamMembers
      : [
          {
            id: currentUser.id,
            display_name: currentUser.display_name,
            advisor_name: currentUser.advisor_name,
            advisor_phone: currentUser.advisor_phone,
            advisor_photo_url: currentUser.advisor_photo_url,
            advisor_email: currentUser.advisor_email
          }
        ];
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

  const needsAttention = dashboard.allAppointments.filter(
    (appointment) => appointment.priority === "high" || appointment.status === "running_late"
  );
  const confirmed = dashboard.allAppointments.filter((appointment) => appointment.status === "confirmed");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(200,174,127,0.22),transparent_28%),linear-gradient(180deg,#f8f3ea_0%,#efe6da_52%,#ece2d4_100%)] px-4 py-5 text-[#16130f] sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2.2rem] border border-[#d8cfbf] bg-[#173d33] p-6 text-white shadow-[0_32px_90px_rgba(20,42,35,0.24)] sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">Dashboard</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
                {currentUser.display_name}, here&apos;s the full board.
              </h1>
              <p className="mt-4 max-w-2xl text-[16px] leading-8 text-white/74">
                Your default advisor info follows your account, your coworker can use her own login,
                and every appointment is visible in one place instead of getting buried in a day-only view.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/dashboard/settings"
                  className="rounded-full border border-white/14 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/14"
                >
                  Edit account and template
                </Link>
                <form action="/api/auth/logout" method="post">
                  <button className="rounded-full border border-white/14 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                    Log out
                  </button>
                </form>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FocusCard label="Your default advisor" value={currentUser.advisor_name || currentUser.display_name} />
              <FocusCard label="Team members" value={String(advisors.length)} />
              <FocusCard label="Needs attention" value={String(needsAttention.length)} />
              <FocusCard label="Confirmed" value={String(confirmed.length)} />
            </div>
          </div>
        </section>

        <DashboardCreateForm advisors={advisors} currentUserId={currentUser.id} />

        <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <div className="space-y-6">
            <section className="rounded-[1.9rem] border border-[#d8cfbf] bg-white/78 p-6 shadow-[0_18px_45px_rgba(38,27,16,0.08)] backdrop-blur">
              <SectionEyebrow label="Quick Read" />
              <h2 className="mt-3 text-2xl font-semibold text-[#181510]">What matters right now</h2>
              <div className="mt-5 space-y-3 text-sm leading-7 text-[#574e44]">
                {aiSummary ? (
                  <div className="rounded-[1.3rem] border border-[#ece2d5] bg-[#fcfaf6] p-4">{aiSummary}</div>
                ) : null}
                {dashboard.suggestions.length > 0 ? (
                  dashboard.suggestions.map((suggestion) => (
                    <div key={suggestion} className="rounded-[1.3rem] border border-[#ece2d5] bg-[#fcfaf6] p-4">
                      {suggestion}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.3rem] border border-[#ece2d5] bg-[#fcfaf6] p-4">
                    No urgent intervention signals right now.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[1.9rem] border border-[#d8cfbf] bg-white/78 p-6 shadow-[0_18px_45px_rgba(38,27,16,0.08)] backdrop-blur">
              <SectionEyebrow label="Metrics" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MetricCard label="Show rate" value={`${dashboard.showRate}%`} />
                <MetricCard label="Confirmation" value={`${dashboard.confirmationRate}%`} />
                <MetricCard label="Open rate" value={`${dashboard.openRate}%`} />
                <MetricCard label="High intent" value={String(dashboard.highIntent)} />
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <AppointmentSection
              eyebrow="Needs attention"
              title="The appointments that need intervention first"
              subtitle="High-priority appointments surface first so the board feels operational instead of decorative."
              appointments={needsAttention}
              emptyLabel="Nothing urgent right now."
            />

            <AppointmentSection
              eyebrow="All appointments"
              title="Every appointment in one portfolio view"
              subtitle="This board is no longer limited to today. It shows the whole pipeline."
              appointments={dashboard.allAppointments}
              emptyLabel="No appointments found yet."
            />

            <section className="grid gap-6 lg:grid-cols-2">
              <AppointmentSection
                eyebrow="Today"
                title="Today"
                subtitle="Live appointments happening today."
                appointments={dashboard.todayAppointments}
                emptyLabel="No appointments on today’s board."
                compact
              />
              <AppointmentSection
                eyebrow="Tomorrow"
                title="Tomorrow"
                subtitle="Tomorrow’s appointments that still need momentum."
                appointments={dashboard.tomorrowAppointments}
                emptyLabel="No appointments lined up for tomorrow."
                compact
              />
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionEyebrow({ label }: { label: string }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a6f50]">{label}</p>;
}

function FocusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.45rem] border border-white/10 bg-white/6 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/48">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.45rem] border border-[#ece2d5] bg-[#fcfaf6] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6f50]">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-[#171410]">{value}</p>
    </div>
  );
}

function AppointmentSection({
  eyebrow,
  title,
  subtitle,
  appointments,
  emptyLabel,
  compact = false
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  appointments: Array<{
    id: string;
    name: string;
    vehicle: string;
    formattedTime: string;
    appointment_at?: string;
    appointment_page_url?: string;
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
  }>;
  emptyLabel: string;
  compact?: boolean;
}) {
  return (
    <section className="rounded-[1.9rem] border border-[#d8cfbf] bg-white/78 p-6 shadow-[0_18px_45px_rgba(38,27,16,0.08)] backdrop-blur">
      <SectionEyebrow label={eyebrow} />
      <h2 className="mt-3 text-2xl font-semibold text-[#181510]">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-[#5f554b]">{subtitle}</p>

      <div className="mt-5 grid gap-4">
        {appointments.length > 0 ? (
          appointments.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} compact={compact} />
          ))
        ) : (
          <div className="rounded-[1.35rem] border border-[#ece2d5] bg-[#fcfaf6] p-5 text-sm text-[#655b50]">
            {emptyLabel}
          </div>
        )}
      </div>
    </section>
  );
}

function AppointmentCard({
  appointment,
  compact = false
}: {
  appointment: {
    id: string;
    name: string;
    vehicle: string;
    formattedTime: string;
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
  compact?: boolean;
}) {
  const statusTone =
    appointment.status === "confirmed"
      ? "bg-[#d9eadf] text-[#224735]"
      : appointment.status === "running_late"
        ? "bg-[#f3e3c9] text-[#835628]"
        : appointment.status === "reschedule_requested"
          ? "bg-[#e6ddf3] text-[#5f3c82]"
          : appointment.status === "canceled" || appointment.status === "calendar_sync_failed"
            ? "bg-[#f1deda] text-[#8b3d34]"
            : appointment.status === "viewed"
              ? "bg-[#ece3d5] text-[#7a5328]"
              : "bg-[#e5e2dd] text-[#4b4640]";
  const priorityTone =
    appointment.priority === "high"
      ? "bg-[#8b3d34] text-white"
      : appointment.priority === "low"
        ? "bg-[#d9eadf] text-[#224735]"
        : "bg-black/6 text-black/65";

  return (
    <div
      className={`rounded-[1.45rem] border border-[#ece2d5] bg-[#fcfaf6] p-4 ${
        compact ? "" : "md:grid md:grid-cols-[1.2fr_auto] md:items-center"
      }`}
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-semibold text-[#171410]">{appointment.name}</p>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusTone}`}>
            {appointment.status.replaceAll("_", " ")}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${priorityTone}`}>
            {appointment.priority}
          </span>
        </div>
        <p className="mt-2 text-sm text-[#322d27]">{appointment.vehicle}</p>
        <p className="mt-1 text-sm text-[#6d6358]">{appointment.formattedTime}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 md:mt-0 md:justify-end">
        <DashboardAppointmentActions
          appointmentId={appointment.id}
          phone={appointment.advisor_phone || appointment.phone}
        />
      </div>
    </div>
  );
}
