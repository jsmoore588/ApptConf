import { formatAppointmentDate, hoursUntil, isToday, isTomorrow } from "@/lib/datetime";
import { getSupabaseServerClient } from "@/lib/supabase";
import { Appointment, AppointmentEvent, AppointmentEventType, AppointmentStatus } from "@/lib/types";

export type AppointmentPriority = "high" | "normal" | "low";

function getStatus(appointment: Appointment): AppointmentStatus {
  if (appointment.status === "canceled") {
    return "canceled";
  }

  if (appointment.status === "reschedule_requested") {
    return "reschedule_requested";
  }

  if (appointment.status === "running_late") {
    return "running_late";
  }

  if (appointment.confirmed || appointment.status === "confirmed") {
    return "confirmed";
  }

  if (appointment.status === "calendar_sync_failed") {
    return "calendar_sync_failed";
  }

  if ((appointment.opened_count ?? 0) > 0) {
    return "viewed";
  }

  return appointment.status || "scheduled";
}

function getPriority(appointment: Appointment): AppointmentPriority {
  const status = getStatus(appointment);

  if (status === "confirmed") {
    return "low";
  }

  if (status === "running_late" || status === "reschedule_requested" || status === "canceled") {
    return "high";
  }

  const hours = hoursUntil(appointment.appointment_at);

  if ((appointment.opened_count ?? 0) === 0 && hours >= 0 && hours <= 3) {
    return "high";
  }

  if ((appointment.opened_count ?? 0) > 2 && !appointment.confirmed) {
    return "high";
  }

  return "normal";
}

function mapAppointment(row: Record<string, unknown>) {
  const appointmentAt = (row.appointment_at as string | null) ?? undefined;
  const advisorName = (row.advisor_name as string | null) ?? "";
  const customerName = (row.customer_name as string | null) ?? "";

  return {
    id: String(row.id),
    customer_name: customerName,
    name: customerName,
    vehicle: String(row.vehicle ?? ""),
    appointment_at: appointmentAt,
    time: appointmentAt ? formatAppointmentDate(appointmentAt) : "",
    advisor_name: advisorName,
    advisor: advisorName,
    advisor_phone: (row.advisor_phone as string | null) ?? undefined,
    advisor_photo_url: (row.advisor_photo_url as string | null) ?? undefined,
    appointment_page_url: (row.appointment_page_url as string | null) ?? undefined,
    google_calendar_event_id: (row.google_calendar_event_id as string | null) ?? undefined,
    calendar_sync_status: (row.calendar_sync_status as "pending" | "synced" | "failed" | null) ?? undefined,
    status: (row.status as AppointmentStatus | null) ?? "scheduled",
    created_at: String(row.created_at),
    updated_at: (row.updated_at as string | null) ?? undefined,
    source: (row.source as string | null) ?? undefined,
    mileage: (row.mileage as string | null) ?? undefined,
    notes: (row.notes as string | null) ?? undefined,
    phone: (row.phone as string | null) ?? undefined,
    email: (row.email as string | null) ?? undefined,
    customer_phone: (row.customer_phone as string | null) ?? undefined,
    payoff_lender_name: (row.payoff_lender_name as string | null) ?? undefined,
    payoff_photo_urls: (row.payoff_photo_urls as string[] | null) ?? [],
    confirmed: Boolean(row.confirmed),
    opened_count: Number(row.opened_count ?? 0),
    last_opened_at: (row.last_opened_at as string | null) ?? undefined,
    first_opened_at: (row.first_opened_at as string | null) ?? undefined,
    confirmed_at: (row.confirmed_at as string | null) ?? undefined,
    engagement_score: Number(row.engagement_score ?? 0),
    reminder_2hr_sent: Boolean(row.reminder_2hr_sent),
    reminder_30min_sent: Boolean(row.reminder_30min_sent),
    location_name: (row.location_name as string | null) ?? undefined,
    location_address: (row.location_address as string | null) ?? undefined,
    google_maps_url: (row.google_maps_url as string | null) ?? undefined,
    entrance_photo_urls: (row.entrance_photo_urls as string[] | null) ?? [],
    google_reviews_url: (row.google_reviews_url as string | null) ?? undefined,
    yelp_reviews_url: (row.yelp_reviews_url as string | null) ?? undefined,
    featured_reviews: (row.featured_reviews as Appointment["featured_reviews"] | null) ?? [],
    review_photo_urls: (row.review_photo_urls as string[] | null) ?? [],
    customer_delivery_photo_urls: (row.customer_delivery_photo_urls as string[] | null) ?? [],
    check_handoff_photo_urls: (row.check_handoff_photo_urls as string[] | null) ?? []
  } satisfies Appointment;
}

function toDatabaseAppointment(appointment: Appointment) {
  return {
    id: appointment.id,
    customer_name: appointment.customer_name || appointment.name,
    vehicle: appointment.vehicle,
    appointment_at: appointment.appointment_at,
    advisor_name: appointment.advisor_name || appointment.advisor,
    advisor_phone: appointment.advisor_phone ?? null,
    advisor_photo_url: appointment.advisor_photo_url ?? null,
    appointment_page_url: appointment.appointment_page_url ?? null,
    google_calendar_event_id: appointment.google_calendar_event_id ?? null,
    calendar_sync_status: appointment.calendar_sync_status ?? "pending",
    status: appointment.status || "scheduled",
    created_at: appointment.created_at,
    source: appointment.source ?? "extension",
    mileage: appointment.mileage ?? null,
    notes: appointment.notes ?? null,
    phone: appointment.phone ?? null,
    email: appointment.email ?? null,
    customer_phone: appointment.customer_phone ?? null,
    payoff_lender_name: appointment.payoff_lender_name ?? null,
    payoff_photo_urls: appointment.payoff_photo_urls ?? [],
    confirmed: appointment.confirmed ?? false,
    opened_count: appointment.opened_count ?? 0,
    last_opened_at: appointment.last_opened_at ?? null,
    first_opened_at: appointment.first_opened_at ?? null,
    confirmed_at: appointment.confirmed_at ?? null,
    engagement_score: appointment.engagement_score ?? 0,
    reminder_2hr_sent: appointment.reminder_2hr_sent ?? false,
    reminder_30min_sent: appointment.reminder_30min_sent ?? false,
    location_name: appointment.location_name ?? null,
    location_address: appointment.location_address ?? null,
    google_maps_url: appointment.google_maps_url ?? null,
    entrance_photo_urls: appointment.entrance_photo_urls ?? [],
    google_reviews_url: appointment.google_reviews_url ?? null,
    yelp_reviews_url: appointment.yelp_reviews_url ?? null,
    featured_reviews: appointment.featured_reviews ?? [],
    review_photo_urls: appointment.review_photo_urls ?? [],
    customer_delivery_photo_urls: appointment.customer_delivery_photo_urls ?? [],
    check_handoff_photo_urls: appointment.check_handoff_photo_urls ?? []
  };
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

function toDashboardAppointment(appointment: Appointment) {
  return {
    ...appointment,
    status: getStatus(appointment),
    priority: getPriority(appointment),
    formattedTime: appointment.appointment_at
      ? formatAppointmentDate(appointment.appointment_at)
      : appointment.time
  };
}

export async function listAppointments() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .order("appointment_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapAppointment);
}

export async function getDashboardMetrics() {
  const supabase = getSupabaseServerClient();
  const [appointmentsResult, eventsResult] = await Promise.all([
    supabase.from("appointments").select("*").order("appointment_at", { ascending: true }),
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
  const todayAppointments = appointments
    .filter((appointment) => isToday(appointment.appointment_at))
    .sort((a, b) => (a.appointment_at || "").localeCompare(b.appointment_at || ""));
  const tomorrowAppointments = appointments
    .filter((appointment) => isTomorrow(appointment.appointment_at))
    .sort((a, b) => (a.appointment_at || "").localeCompare(b.appointment_at || ""));
  const overdueAppointments = appointments
    .filter(
      (appointment) =>
        appointment.appointment_at &&
        new Date(appointment.appointment_at).getTime() < Date.now() &&
        getStatus(appointment) !== "confirmed"
    )
    .sort((a, b) => (a.appointment_at || "").localeCompare(b.appointment_at || ""));

  const suggestions = [
    appointments.some((appointment) => appointment.status === "reschedule_requested")
      ? "Follow up on reschedule requests first so they do not become silent no-shows."
      : null,
    appointments.some((appointment) => appointment.status === "running_late")
      ? "Watch running-late appointments closely and adjust timing before they slip."
      : null,
    appointments.some((appointment) => appointment.status === "canceled")
      ? "Canceled appointments should be recovered quickly with a replacement time."
      : null,
    appointments.some(
      (appointment) => appointment.priority === "high" && appointment.status === "scheduled"
    )
      ? "Prioritize scheduled appointments that are less than 3 hours away and still unopened."
      : null,
    highIntent > 0 ? "Prioritize repeat-open appointments. They are signaling strong intent." : null,
    overdueAppointments.length > 0 ? "Review overdue appointments and reschedule or close them out." : null
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
    allAppointments: appointments,
    todayAppointments,
    tomorrowAppointments,
    overdueAppointments
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
  const { data, error } = await supabase
    .from("appointments")
    .insert(toDatabaseAppointment(appointment))
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Appointment save failed");
  }

  return mapAppointment(data);
}

export async function updateAppointment(id: string, partial: Partial<Appointment>) {
  const supabase = getSupabaseServerClient();
  const payload: Record<string, unknown> = {};

  if (partial.customer_name || partial.name) payload.customer_name = partial.customer_name || partial.name;
  if (partial.vehicle !== undefined) payload.vehicle = partial.vehicle;
  if (partial.appointment_at !== undefined) payload.appointment_at = partial.appointment_at;
  if (partial.advisor_name || partial.advisor) payload.advisor_name = partial.advisor_name || partial.advisor;
  if (partial.advisor_phone !== undefined) payload.advisor_phone = partial.advisor_phone;
  if (partial.advisor_photo_url !== undefined) payload.advisor_photo_url = partial.advisor_photo_url;
  if (partial.appointment_page_url !== undefined) payload.appointment_page_url = partial.appointment_page_url;
  if (partial.google_calendar_event_id !== undefined)
    payload.google_calendar_event_id = partial.google_calendar_event_id;
  if (partial.calendar_sync_status !== undefined) payload.calendar_sync_status = partial.calendar_sync_status;
  if (partial.status !== undefined) payload.status = partial.status;
  if (partial.source !== undefined) payload.source = partial.source;
  if (partial.confirmed !== undefined) payload.confirmed = partial.confirmed;
  if (partial.payoff_lender_name !== undefined) payload.payoff_lender_name = partial.payoff_lender_name;
  if (partial.payoff_photo_urls !== undefined) payload.payoff_photo_urls = partial.payoff_photo_urls;
  if (partial.opened_count !== undefined) payload.opened_count = partial.opened_count;
  if (partial.last_opened_at !== undefined) payload.last_opened_at = partial.last_opened_at;
  if (partial.first_opened_at !== undefined) payload.first_opened_at = partial.first_opened_at;
  if (partial.confirmed_at !== undefined) payload.confirmed_at = partial.confirmed_at;
  if (partial.engagement_score !== undefined) payload.engagement_score = partial.engagement_score;
  if (partial.reminder_2hr_sent !== undefined) payload.reminder_2hr_sent = partial.reminder_2hr_sent;
  if (partial.reminder_30min_sent !== undefined) payload.reminder_30min_sent = partial.reminder_30min_sent;

  const { data, error } = await supabase
    .from("appointments")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapAppointment(data) : null;
}

export async function deleteAppointment(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("appointments").delete().eq("id", id);

  if (error) {
    throw error;
  }

  return true;
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
    if (appointment.status === "scheduled") {
      nextPatch.status = "viewed";
    }
  }

  if (type === "confirm_clicked") {
    nextPatch.confirmed = true;
    nextPatch.confirmed_at = timestamp;
    nextPatch.engagement_score = Math.min((appointment.engagement_score ?? 0) + 35, 100);
    nextPatch.status = "confirmed";
  }

  if (type === "running_late_clicked") {
    nextPatch.status = "running_late";
    nextPatch.engagement_score = Math.min((appointment.engagement_score ?? 0) + 10, 100);
  }

  if (type === "reschedule_requested_clicked") {
    nextPatch.status = "reschedule_requested";
    nextPatch.confirmed = false;
    nextPatch.engagement_score = Math.min((appointment.engagement_score ?? 0) + 8, 100);
  }

  if (type === "cant_make_it_clicked") {
    nextPatch.status = "canceled";
    nextPatch.confirmed = false;
    nextPatch.engagement_score = Math.min((appointment.engagement_score ?? 0) + 5, 100);
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
