import { formatAppointmentDate, hoursUntil, isToday, isTomorrow } from "@/lib/datetime";
import { getSupabaseServerClient } from "@/lib/supabase";
import { Appointment, AppointmentEvent, AppointmentEventType } from "@/lib/types";

export type AppointmentStatus = "confirmed" | "viewed" | "not_opened";
export type AppointmentPriority = "high" | "normal" | "low";

function getStatus(appointment: Appointment): AppointmentStatus {
  if (appointment.confirmed) {
    return "confirmed";
  }

  if ((appointment.opened_count ?? 0) > 0) {
    return "viewed";
  }

  return "not_opened";
}

function getPriority(appointment: Appointment): AppointmentPriority {
  if (appointment.confirmed) {
    return "low";
  }

  const hours = hoursUntil(appointment.scheduled_at);

  if ((appointment.opened_count ?? 0) === 0 && hours >= 0 && hours <= 3) {
    return "high";
  }

  if ((appointment.opened_count ?? 0) > 2 && !appointment.confirmed) {
    return "high";
  }

  return "normal";
}

function toDashboardAppointment(appointment: Appointment) {
  return {
    ...appointment,
    status: getStatus(appointment),
    priority: getPriority(appointment),
    formattedTime: appointment.scheduled_at
      ? formatAppointmentDate(appointment.scheduled_at)
      : appointment.time
  };
}

function mapAppointment(row: Record<string, unknown>) {
  return row as unknown as Appointment;
}

function mapEvent(row: Record<string, unknown>) {
  const metadata = row.metadata as Record<string, string | number | boolean> | null;

  return {
    id: String(row.id),
    appointmentId: String(row.appointment_id),
    type: row.type as AppointmentEventType,
    created_at: String(row.created_at),
    metadata: metadata ?? undefined
  } satisfies AppointmentEvent;
}

export async function listAppointments() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapAppointment);
}

export async function getDashboardMetrics() {
  const supabase = getSupabaseServerClient();
  const [appointmentsResult, eventsResult] = await Promise.all([
    supabase.from("appointments").select("*").order("scheduled_at", { ascending: true }),
    supabase.from("appointment_events").select("*").order("created_at", { ascending: false })
  ]);

  if (appointmentsResult.error) {
    throw appointmentsResult.error;
  }

  if (eventsResult.error) {
    throw eventsResult.error;
  }

  const appointments = (appointmentsResult.data ?? []).map(mapAppointment).map(toDashboardAppointment);
  const events = (eventsResult.data ?? []).map(mapEvent);
  const totalAppointments = appointments.length;
  const totalOpens = events.filter((event) => event.type === "page_opened").length;
  const totalConfirmations = events.filter((event) => event.type === "confirm_clicked").length;
  const highIntent = appointments.filter((appointment) => (appointment.opened_count ?? 0) > 2).length;
  const viewedAppointments = appointments.filter((appointment) => (appointment.opened_count ?? 0) > 0).length;
  const todayAppointments = appointments.filter((appointment) => isToday(appointment.scheduled_at));
  const tomorrowAppointments = appointments.filter((appointment) => isTomorrow(appointment.scheduled_at));

  const suggestions = [
    appointments.some(
      (appointment) => appointment.priority === "high" && appointment.status === "not_opened"
    )
      ? "Prioritize not-opened appointments that are less than 3 hours away."
      : null,
    highIntent > 0 ? "Prioritize repeat-open appointments. They are signaling strong intent." : null,
    totalConfirmations > 0 ? "Deprioritize confirmed appointments unless timing changes." : null
  ].filter(Boolean) as string[];

  return {
    totalAppointments,
    totalOpens,
    totalConfirmations,
    highIntent,
    openRate: totalAppointments === 0 ? 0 : Math.round((viewedAppointments / totalAppointments) * 100),
    confirmationRate:
      totalAppointments === 0 ? 0 : Math.round((totalConfirmations / totalAppointments) * 100),
    showRate:
      totalAppointments === 0 ? 0 : Math.round((totalConfirmations / totalAppointments) * 100),
    suggestions,
    todayAppointments,
    tomorrowAppointments
  };
}

export async function getAppointmentById(id: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("appointments").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapAppointment(data) : null;
}

export async function createAppointment(appointment: Appointment) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("appointments").insert(appointment);

  if (error) {
    throw error;
  }

  return appointment;
}

export async function updateAppointment(id: string, partial: Partial<Appointment>) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .update(partial)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapAppointment(data) : null;
}

export async function registerEvent(
  appointmentId: string,
  type: AppointmentEventType,
  metadata?: Record<string, string | number | boolean>
) {
  const appointment = await getAppointmentById(appointmentId);

  if (!appointment) {
    return null;
  }

  const timestamp = new Date().toISOString();
  const event: AppointmentEvent = {
    id: crypto.randomUUID(),
    appointmentId,
    type,
    created_at: timestamp,
    metadata
  };

  const supabase = getSupabaseServerClient();
  const { error: eventError } = await supabase.from("appointment_events").insert({
    id: event.id,
    appointment_id: event.appointmentId,
    type: event.type,
    created_at: event.created_at,
    metadata: event.metadata ?? {}
  });

  if (eventError) {
    throw eventError;
  }

  const nextPatch: Partial<Appointment> = {};

  if (type === "page_opened") {
    nextPatch.opened_count = (appointment.opened_count ?? 0) + 1;
    nextPatch.last_opened_at = timestamp;
    nextPatch.first_opened_at = appointment.first_opened_at ?? timestamp;
    nextPatch.engagement_score = Math.min((appointment.engagement_score ?? 0) + 20, 100);
  }

  if (type === "confirm_clicked") {
    nextPatch.confirmed = true;
    nextPatch.confirmed_at = timestamp;
    nextPatch.engagement_score = Math.min((appointment.engagement_score ?? 0) + 35, 100);
  }

  const updatedAppointment =
    Object.keys(nextPatch).length > 0 ? await updateAppointment(appointmentId, nextPatch) : appointment;

  return {
    appointment: updatedAppointment ?? appointment,
    event
  };
}

export async function getAppointmentAnalytics(appointmentId: string) {
  const supabase = getSupabaseServerClient();
  const appointment = await getAppointmentById(appointmentId);

  if (!appointment) {
    return null;
  }

  const { data, error } = await supabase
    .from("appointment_events")
    .select("*")
    .eq("appointment_id", appointmentId);

  if (error) {
    throw error;
  }

  const events = (data ?? []).map(mapEvent);
  const opens = events.filter((event) => event.type === "page_opened").length;
  const confirmations = events.filter((event) => event.type === "confirm_clicked").length;
  const status = getStatus(appointment);
  const priority = getPriority(appointment);

  return {
    appointment,
    metrics: {
      opens,
      confirmations,
      status,
      priority,
      hasHighIntent: opens > 2,
      resendRecommendation:
        opens > 0
          ? "They opened the link. Follow up with a softer reminder because intent is already established."
          : "They have not opened the link yet. Resend with a stronger future-paced message and a tighter reason to respond."
    }
  };
}
