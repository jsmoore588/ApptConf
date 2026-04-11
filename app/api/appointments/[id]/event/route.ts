import { NextRequest, NextResponse } from "next/server";
import { registerEvent } from "@/lib/storage";
import { AppointmentEventType } from "@/lib/types";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await request.json()) as { type?: AppointmentEventType };
  const validTypes: AppointmentEventType[] = [
    "page_opened",
    "confirm_clicked",
    "calendar_clicked",
    "reminder_clicked",
    "directions_clicked",
    "contact_opened",
    "google_reviews_clicked",
    "more_reviews_clicked",
    "payoff_info_submitted",
    "running_late_clicked",
    "reschedule_requested_clicked",
    "cant_make_it_clicked"
  ];

  if (!body.type || !validTypes.includes(body.type)) {
    return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
  }

  const result = await registerEvent(id, body.type, {
    userAgent: request.headers.get("user-agent") ?? "unknown"
  });

  if (!result) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
