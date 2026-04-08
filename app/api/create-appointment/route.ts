import { NextRequest, NextResponse } from "next/server";
import { createAppointment, updateAppointment } from "@/lib/storage";
import { createUuid } from "@/lib/uuid";
import { Appointment, FeaturedReview } from "@/lib/types";
import { parseAppointmentTime, formatAppointmentDate } from "@/lib/datetime";
import { createGoogleCalendarEvent } from "@/lib/calendar";
import { DEFAULT_LOCATION_ADDRESS, DEFAULT_LOCATION_NAME } from "@/lib/constants";
import { getAppSettings } from "@/lib/app-settings";

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
  try {
    const body = (await request.json()) as CreatePayload;
    const appSettings = await getAppSettings();
    const template = appSettings.templateDefaults || {};

    const customerName = body.customer_name?.trim() || body.name?.trim();
    const advisorName = body.advisor_name?.trim() || body.advisor?.trim() || template.advisor_name?.trim();
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
      advisor_phone: body.advisor_phone?.trim() || template.advisor_phone,
      advisor_photo_url: body.advisor_photo_url?.trim() || template.advisor_photo_url,
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
      location_name: body.location_name?.trim() || template.location_name || DEFAULT_LOCATION_NAME,
      location_address:
        body.location_address?.trim() || template.location_address || DEFAULT_LOCATION_ADDRESS,
      google_maps_url: body.google_maps_url?.trim() || template.google_maps_url,
      entrance_photo_urls: cleanArray(body.entrance_photo_urls).length
        ? cleanArray(body.entrance_photo_urls)
        : template.entrance_photo_urls || [],
      google_reviews_url: body.google_reviews_url?.trim() || template.google_reviews_url,
      yelp_reviews_url: body.yelp_reviews_url?.trim() || template.yelp_reviews_url,
      review_photo_urls: cleanArray(body.review_photo_urls).length
        ? cleanArray(body.review_photo_urls)
        : template.review_photo_urls || [],
      customer_delivery_photo_urls: cleanArray(body.customer_delivery_photo_urls),
      check_handoff_photo_urls: cleanArray(body.check_handoff_photo_urls),
      featured_reviews: cleanReviews(body.featured_reviews).length
        ? cleanReviews(body.featured_reviews)
        : template.featured_reviews || []
    };

    let savedAppointment: Appointment;

    try {
      savedAppointment = await createAppointment(draftAppointment);
    } catch (error) {
      console.error("Appointment save failed", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unable to save appointment" },
        { status: 500 }
      );
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
  } catch (error) {
    console.error("Create appointment route failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create appointment route failed" },
      { status: 500 }
    );
  }
}
