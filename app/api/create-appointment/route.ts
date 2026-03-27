import { NextRequest, NextResponse } from "next/server";
import { createAppointment, updateAppointment } from "@/lib/storage";
import { createUuid } from "@/lib/uuid";
import { Appointment, FeaturedReview } from "@/lib/types";
import { parseAppointmentTime, formatAppointmentDate } from "@/lib/datetime";
import { createGoogleCalendarEvent } from "@/lib/calendar";

type CreatePayload = Pick<
  Appointment,
  | "name"
  | "vehicle"
  | "time"
  | "advisor"
  | "mileage"
  | "notes"
  | "phone"
  | "email"
  | "advisor_name"
  | "advisor_phone"
  | "advisor_photo_url"
  | "customer_phone"
  | "location_name"
  | "location_address"
  | "google_maps_url"
  | "google_reviews_url"
  | "yelp_reviews_url"
> & {
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
  const body = (await request.json()) as Partial<CreatePayload>;

  if (!body.name || !body.vehicle || !body.time || !body.advisor) {
    return NextResponse.json(
      { error: "name, vehicle, time, and advisor are required" },
      { status: 400 }
    );
  }

  const scheduledAt = parseAppointmentTime(body.time);
  const id = createUuid();
  const publicBaseUrl = (process.env.PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, "");
  const pageUrl = `${publicBaseUrl}/appt/${id}`;

  const appointment: Appointment = {
    id,
    name: body.name,
    vehicle: body.vehicle,
    time: scheduledAt ? formatAppointmentDate(scheduledAt) : body.time,
    scheduled_at: scheduledAt ?? undefined,
    advisor: body.advisor,
    mileage: body.mileage,
    notes: body.notes,
    phone: body.phone,
    email: body.email,
    advisor_name: body.advisor_name || body.advisor,
    advisor_phone: body.advisor_phone,
    advisor_photo_url: body.advisor_photo_url,
    customer_phone: body.customer_phone,
    location_name: body.location_name,
    location_address: body.location_address,
    google_maps_url: body.google_maps_url,
    entrance_photo_urls: cleanArray(body.entrance_photo_urls),
    google_reviews_url: body.google_reviews_url,
    yelp_reviews_url: body.yelp_reviews_url,
    review_photo_urls: cleanArray(body.review_photo_urls),
    customer_delivery_photo_urls: cleanArray(body.customer_delivery_photo_urls),
    check_handoff_photo_urls: cleanArray(body.check_handoff_photo_urls),
    featured_reviews: cleanReviews(body.featured_reviews),
    confirmed: false,
    opened_count: 0,
    engagement_score: 0,
    created_at: new Date().toISOString()
  };

  await createAppointment(appointment);

  let calendarEventId: string | null = null;

  try {
    calendarEventId = await createGoogleCalendarEvent({
      name: appointment.name,
      vehicle: appointment.vehicle,
      timeLabel: appointment.time,
      scheduledAt: appointment.scheduled_at,
      email: appointment.email,
      pageUrl
    });
  } catch (error) {
    console.error("Google Calendar error", error);
  }

  if (calendarEventId) {
    await updateAppointment(id, { calendar_event_id: calendarEventId });
  }

  return NextResponse.json({
    url: pageUrl,
    id,
    calendar_event_id: calendarEventId
  });
}
