import { NextRequest, NextResponse } from "next/server";
import { createAppointment, updateAppointment } from "@/lib/storage";
import { createUuid } from "@/lib/uuid";
import { Appointment, FeaturedReview } from "@/lib/types";
import { parseAppointmentTime, formatAppointmentDate } from "@/lib/datetime";
import { createGoogleCalendarEvent } from "@/lib/calendar";
import { DEFAULT_LOCATION_ADDRESS, DEFAULT_LOCATION_NAME } from "@/lib/constants";

type CreatePayload = {
  name?: string;
  customer_name?: string;
  vehicle?: string;
  time?: string;
  appointment_at?: string;
  advisor?: string;
  advisor_name?: string;
  advisor_phone?: string;
  advisor_photo_url?: string;
  customer_phone?: string;
  phone?: string;
  email?: string;
  mileage?: string;
  notes?: string;
  location_name?: string;
  location_address?: string;
  google_maps_url?: string;
  google_reviews_url?: string;
  yelp_reviews_url?: string;
  source?: string;
  entrance_photo_urls?: string[];
  review_photo_urls?: string[];
  customer_delivery_photo_urls?: string[];
  check_handoff_photo_urls?: string[];
  featured_reviews?: FeaturedReview[];
};

function cleanArray(values?: string[]) {
  return values?.map((value) => value.trim()).filter(Boolean) ?? [];
}

function cleanReviews(values?: FeaturedReview[]) {
  return (
    values
      ?.map((review) => ({
        reviewer_name: review.reviewer_name?.trim(),
        review_text: review.review_text?.trim(),
        review_source: review.review_source?.trim()
      }))
      .filter((review) => review.reviewer_name && review.review_text) ?? []
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreatePayload;

  const customerName = body.customer_name?.trim() || body.name?.trim();
  const advisorName = body.advisor_name?.trim() || body.advisor?.trim();
  const appointmentAt = body.appointment_at || (body.time ? parseAppointmentTime(body.time) : null);

  if (!customerName || !body.vehicle?.trim() || !advisorName || !appointmentAt) {
    return NextResponse.json(
      {
        error: "customer_name, vehicle, advisor_name, and a real appointment time are required"
      },
      { status: 400 }
    );
  }

  const id = createUuid();
  const publicBaseUrl = (process.env.PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, "");
  const pageUrl = `${publicBaseUrl}/appt/${id}`;

  const draftAppointment: Appointment = {
    id,
    customer_name: customerName,
    name: customerName,
    vehicle: body.vehicle.trim(),
    appointment_at: appointmentAt,
    time: formatAppointmentDate(appointmentAt),
    advisor_name: advisorName,
    advisor: advisorName,
    advisor_phone: body.advisor_phone?.trim(),
    advisor_photo_url: body.advisor_photo_url?.trim(),
    appointment_page_url: pageUrl,
    google_calendar_event_id: undefined,
    calendar_sync_status: "pending",
    status: "scheduled",
    created_at: new Date().toISOString(),
    source: body.source?.trim() || "extension",
    mileage: body.mileage?.trim(),
    notes: body.notes?.trim(),
    phone: body.phone?.trim(),
    email: body.email?.trim(),
    customer_phone: body.customer_phone?.trim(),
    confirmed: false,
    opened_count: 0,
    engagement_score: 0,
    location_name: body.location_name?.trim() || DEFAULT_LOCATION_NAME,
    location_address: body.location_address?.trim() || DEFAULT_LOCATION_ADDRESS,
    google_maps_url: body.google_maps_url?.trim(),
    entrance_photo_urls: cleanArray(body.entrance_photo_urls),
    google_reviews_url: body.google_reviews_url?.trim(),
    yelp_reviews_url: body.yelp_reviews_url?.trim(),
    review_photo_urls: cleanArray(body.review_photo_urls),
    customer_delivery_photo_urls: cleanArray(body.customer_delivery_photo_urls),
    check_handoff_photo_urls: cleanArray(body.check_handoff_photo_urls),
    featured_reviews: cleanReviews(body.featured_reviews)
  };

  let savedAppointment: Appointment;

  try {
    savedAppointment = await createAppointment(draftAppointment);
  } catch (error) {
    console.error("Appointment save failed", error);
    return NextResponse.json({ error: "Unable to save appointment" }, { status: 500 });
  }

  let calendarEventId: string | null = null;
  let calendarSyncStatus: Appointment["calendar_sync_status"] = "pending";

  try {
    calendarEventId = await createGoogleCalendarEvent({
      name: savedAppointment.customer_name,
      vehicle: savedAppointment.vehicle,
      timeLabel: savedAppointment.time,
      scheduledAt: savedAppointment.appointment_at,
      email: savedAppointment.email,
      pageUrl,
      locationName: savedAppointment.location_name,
      locationAddress: savedAppointment.location_address
    });

    calendarSyncStatus = calendarEventId ? "synced" : "pending";
  } catch (error) {
    console.error("Google Calendar error", error);
    calendarSyncStatus = "failed";
  }

  const updatedAppointment = await updateAppointment(savedAppointment.id, {
    google_calendar_event_id: calendarEventId ?? undefined,
    calendar_sync_status: calendarSyncStatus,
    status: calendarSyncStatus === "failed" ? "calendar_sync_failed" : "scheduled"
  });

  const finalAppointment = updatedAppointment ?? savedAppointment;

  return NextResponse.json({
    appointment: finalAppointment,
    url: finalAppointment.appointment_page_url,
    id: finalAppointment.id
  });
}
