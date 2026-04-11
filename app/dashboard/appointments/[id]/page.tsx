import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAppointmentAnalytics } from "@/lib/storage";
import { DashboardAppointmentNotes } from "@/components/dashboard-appointment-notes";

type Props = {
  params: Promise<{ id: string }>;
};

const eventLabels: Record<string, string> = {
  page_opened: "Opened appointment page",
  confirm_clicked: "Confirmed attendance",
  calendar_clicked: "Clicked Add to Calendar",
  reminder_clicked: "Downloaded reminder",
  directions_clicked: "Clicked Get Directions",
  contact_opened: "Opened contact options",
  google_reviews_clicked: "Clicked Google Reviews",
  more_reviews_clicked: "Viewed more reviews",
  payoff_info_submitted: "Submitted payoff info",
  running_late_clicked: "Marked running late",
  reschedule_requested_clicked: "Asked to reschedule",
  cant_make_it_clicked: "Said they can't make it"
};

function formatDate(value?: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago"
  }).format(date);
}

export default async function DashboardAppointmentDetailPage({ params }: Props) {
  if (!(await getCurrentUser())) {
    redirect("/login");
  }

  const { id } = await params;
  const analytics = await getAppointmentAnalytics(id);

  if (!analytics) {
    notFound();
  }

  const { appointment, events, metrics } = analytics;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f3ea_0%,#efe6da_55%,#ece2d4_100%)] px-4 py-6 text-[#171410] sm:px-6 sm:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-[2rem] bg-[#173d33] p-6 text-white shadow-[0_30px_80px_rgba(20,42,35,0.22)]">
          <Link href="/dashboard" className="text-sm font-semibold text-white/68">
            Back to dashboard
          </Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-white/50">Customer Portfolio</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight">{appointment.name}</h1>
          <p className="mt-3 text-lg text-white/78">{appointment.vehicle}</p>
          <div className="mt-6 grid gap-3">
            <InfoPill label="Appointment" value={formatDate(appointment.appointment_at)} />
            <InfoPill label="Status" value={metrics.status.replaceAll("_", " ")} />
            <InfoPill label="Priority" value={metrics.priority} />
            <InfoPill label="Advisor" value={appointment.advisor_name || appointment.advisor} />
            {appointment.customer_phone ? <InfoPill label="Customer phone" value={appointment.customer_phone} /> : null}
            {appointment.email ? <InfoPill label="Email" value={appointment.email} /> : null}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/appt/${appointment.id}`} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#173d33]">
              Open customer page
            </Link>
            {appointment.customer_phone ? (
              <a href={`sms:${appointment.customer_phone}`} className="rounded-full border border-white/15 bg-white/8 px-5 py-3 text-sm font-semibold text-white">
                Text customer
              </a>
            ) : null}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-[#d8cfbf] bg-white/78 p-6 shadow-[0_18px_45px_rgba(38,27,16,0.08)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6f50]">Activity</p>
            <h2 className="mt-3 text-2xl font-semibold">What they have done</h2>
            <div className="mt-5 space-y-3">
              {events.length > 0 ? (
                events.map((event) => (
                  <div key={event.id} className="rounded-[1.2rem] border border-[#ece2d5] bg-[#fcfaf6] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-[#211d18]">{eventLabels[event.type] || event.type}</p>
                      <p className="text-xs text-[#73685d]">{formatDate(event.created_at)}</p>
                    </div>
                    {event.metadata && Object.keys(event.metadata).length > 0 ? (
                      <p className="mt-2 text-xs leading-6 text-[#73685d]">
                        {Object.entries(event.metadata)
                          .map(([key, value]) => `${key}: ${String(value)}`)
                          .join(" | ")}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-[1.2rem] border border-[#ece2d5] bg-[#fcfaf6] p-4 text-sm text-[#62584f]">
                  No activity logged yet.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#d8cfbf] bg-white/78 p-6 shadow-[0_18px_45px_rgba(38,27,16,0.08)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6f50]">Payoff</p>
            <h2 className="mt-3 text-2xl font-semibold">Payoff information</h2>
            {appointment.payoff_lender_name ? (
              <p className="mt-4 text-sm font-semibold text-[#2e2924]">Bank: {appointment.payoff_lender_name}</p>
            ) : (
              <p className="mt-4 text-sm text-[#62584f]">No bank name submitted yet.</p>
            )}
            {(appointment.payoff_photo_urls?.length ?? 0) > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {appointment.payoff_photo_urls?.map((url, index) => (
                  <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-[1.2rem] border border-[#ddd3c8] bg-[#f8f3ec]">
                    <img src={url} alt={`Payoff upload ${index + 1}`} className="h-44 w-full object-cover" />
                  </a>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-[2rem] border border-[#d8cfbf] bg-white/78 p-6 shadow-[0_18px_45px_rgba(38,27,16,0.08)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6f50]">Private info</p>
            <h2 className="mt-3 text-2xl font-semibold">Add internal notes</h2>
            <p className="mt-2 text-sm leading-7 text-[#62584f]">Only dashboard users see this. Customers do not see these notes.</p>
            <div className="mt-5">
              <DashboardAppointmentNotes appointmentId={appointment.id} initialNotes={appointment.notes} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-white/6 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
