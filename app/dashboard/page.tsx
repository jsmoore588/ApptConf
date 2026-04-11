import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { generateActionSummary } from "@/lib/openai";
import { getDashboardMetrics } from "@/lib/storage";
import { listAdvisorUsers } from "@/lib/users";
import { DashboardAppointmentActions } from "@/components/dashboard-appointment-actions";
import { DashboardCreateForm } from "@/components/dashboard-create-form";

type DashboardAppointment = {
  id: string;
  name: string;
  vehicle: string;
  formattedTime: string;
  appointment_at?: string;
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
  payoff_lender_name?: string;
  payoff_photo_urls?: string[];
};

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

  const needsAttention = dashboard.allAppointments.filter(
    (appointment) => appointment.priority === "high" || appointment.status === "running_late"
  );
  const nextAppointments = dashboard.allAppointments.slice(0, 8);
  const confirmed = dashboard.allAppointments.filter((appointment) => appointment.status === "confirmed");
  const payoffCount = dashboard.allAppointments.filter(
    (appointment) => appointment.payoff_lender_name || (appointment.payoff_photo_urls?.length ?? 0) > 0
  ).length;
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,rgba(255,255,255,0.85),transparent_25%),radial-gradient(circle_at_80%_10%,rgba(186,203,191,0.35),transparent_24%),linear-gradient(180deg,#f8f3ea_0%,#eee4d6_58%,#e8ddcd_100%)] px-4 py-5 text-[#171410] sm:px-6 sm:py-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className="overflow-hidden rounded-[2rem] border border-white/18 bg-[#173d33] p-6 text-white shadow-[0_34px_90px_rgba(20,42,35,0.24)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/52">Bullard board</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">
              {currentUser.advisor_name || currentUser.display_name}
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/72">
              Create links, watch intent, and open each customer portfolio from one clean workspace.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard/settings" className="rounded-full border border-white/14 bg-white/10 px-5 py-3 text-sm font-semibold text-white">
                Settings
              </Link>
              <form action="/api/auth/logout" method="post">
                <button className="rounded-full border border-white/14 bg-transparent px-5 py-3 text-sm font-semibold text-white">
                  Log out
                </button>
              </form>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/55 bg-white/58 p-5 shadow-[0_22px_60px_rgba(45,35,24,0.09)] backdrop-blur-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6f50]">Snapshot</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric label="All" value={String(dashboard.totalAppointments)} />
              <Metric label="Attention" value={String(needsAttention.length)} />
              <Metric label="Confirmed" value={String(confirmed.length)} />
              <Metric label="Payoff" value={String(payoffCount)} />
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/55 bg-white/58 p-5 shadow-[0_22px_60px_rgba(45,35,24,0.09)] backdrop-blur-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6f50]">Today</p>
            <div className="mt-4 grid gap-3">
              {dashboard.todayAppointments.length > 0 ? (
                dashboard.todayAppointments.slice(0, 4).map((appointment) => (
                  <MiniAppointment key={appointment.id} appointment={appointment} />
                ))
              ) : (
                <p className="rounded-[1.1rem] bg-white/50 p-4 text-sm text-[#62584f]">No appointments today.</p>
              )}
            </div>
          </section>
        </aside>

        <section className="space-y-6">
          <DashboardCreateForm advisors={advisors} currentUserId={currentUser.id} />

          <section className="rounded-[2rem] border border-white/55 bg-white/58 p-6 shadow-[0_22px_60px_rgba(45,35,24,0.09)] backdrop-blur-2xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6f50]">Priority</p>
                <h2 className="mt-2 text-2xl font-semibold">Needs attention</h2>
              </div>
              <p className="text-sm text-[#62584f]">{needsAttention.length} appointment{needsAttention.length === 1 ? "" : "s"}</p>
            </div>
            <div className="mt-5 grid gap-3">
              {needsAttention.length > 0 ? (
                needsAttention.slice(0, 5).map((appointment) => (
                  <AppointmentRow key={appointment.id} appointment={appointment} />
                ))
              ) : (
                <EmptyState label="Nothing urgent right now." />
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/55 bg-white/58 p-6 shadow-[0_22px_60px_rgba(45,35,24,0.09)] backdrop-blur-2xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6f50]">Pipeline</p>
                <h2 className="mt-2 text-2xl font-semibold">All appointments</h2>
              </div>
              <p className="text-sm text-[#62584f]">Showing the next {nextAppointments.length}</p>
            </div>
            <div className="mt-5 grid gap-3">
              {nextAppointments.length > 0 ? (
                nextAppointments.map((appointment) => (
                  <AppointmentRow key={appointment.id} appointment={appointment} />
                ))
              ) : (
                <EmptyState label="No appointments yet." />
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/55 bg-white/58 p-6 shadow-[0_22px_60px_rgba(45,35,24,0.09)] backdrop-blur-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6f50]">Readout</p>
            <h2 className="mt-2 text-2xl font-semibold">What matters now</h2>
            <div className="mt-5 grid gap-3">
              {aiSummary ? <Readout text={aiSummary} /> : null}
              {dashboard.suggestions.length > 0 ? (
                dashboard.suggestions.map((suggestion) => <Readout key={suggestion} text={suggestion} />)
              ) : (
                <Readout text="No urgent intervention signals right now." />
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/60 bg-white/52 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6f50]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#171410]">{value}</p>
    </div>
  );
}

function MiniAppointment({ appointment }: { appointment: DashboardAppointment }) {
  return (
    <Link
      href={{ pathname: "/dashboard/appointments/[id]", query: { id: appointment.id } }}
      className="block rounded-[1.15rem] border border-white/55 bg-white/50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
    >
      <p className="font-semibold text-[#171410]">{appointment.name}</p>
      <p className="mt-1 text-sm text-[#62584f]">{appointment.formattedTime}</p>
      <p className="mt-1 truncate text-xs text-[#7a7065]">{appointment.vehicle}</p>
    </Link>
  );
}

function AppointmentRow({ appointment }: { appointment: DashboardAppointment }) {
  const statusTone =
    appointment.status === "confirmed"
      ? "bg-[#d9eadf] text-[#224735]"
      : appointment.status === "running_late" || appointment.status === "reschedule_requested"
        ? "bg-[#f3e3c9] text-[#835628]"
        : appointment.status === "canceled" || appointment.status === "calendar_sync_failed"
          ? "bg-[#f1deda] text-[#8b3d34]"
          : "bg-[#ece3d5] text-[#6a5135]";

  return (
    <div className="rounded-[1.35rem] border border-white/58 bg-white/52 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] backdrop-blur-xl">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={{ pathname: "/dashboard/appointments/[id]", query: { id: appointment.id } }}
              className="text-lg font-semibold text-[#171410] hover:underline"
            >
              {appointment.name}
            </Link>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusTone}`}>
              {appointment.status.replaceAll("_", " ")}
            </span>
            {appointment.priority === "high" ? (
              <span className="rounded-full bg-[#8b3d34] px-3 py-1 text-xs font-semibold uppercase text-white">High</span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-[#322d27]">{appointment.vehicle}</p>
          <p className="mt-1 text-sm text-[#6d6358]">{appointment.formattedTime}</p>
          {(appointment.payoff_lender_name || (appointment.payoff_photo_urls?.length ?? 0) > 0) ? (
            <div className="mt-3 inline-flex rounded-full border border-[#d8cdbc] bg-[#fffaf2]/70 px-3 py-1 text-xs font-semibold text-[#6a5135]">
              Payoff info received
            </div>
          ) : null}
        </div>
        <DashboardAppointmentActions appointmentId={appointment.id} phone={appointment.advisor_phone || appointment.phone} />
      </div>
    </div>
  );
}

function Readout({ text }: { text: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/58 bg-white/52 p-4 text-sm leading-7 text-[#574e44] shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] backdrop-blur-xl">
      {text}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-[1.25rem] border border-white/58 bg-white/52 p-4 text-sm text-[#62584f]">{label}</div>;
}
