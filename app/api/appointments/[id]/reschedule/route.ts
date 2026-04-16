import { NextRequest, NextResponse } from "next/server";
import { formatAppointmentDate } from "@/lib/datetime";
import { getAppointmentById, registerEvent, updateAppointment } from "@/lib/storage";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await request.json()) as { requested_at?: string };
  const requestedAt = body.requested_at?.trim();

  if (!requestedAt) {
    return NextResponse.json({ error: "A requested appointment time is required." }, { status: 400 });
  }

  const requestedDate = new Date(requestedAt);

  if (Number.isNaN(requestedDate.getTime())) {
    return NextResponse.json({ error: "The requested appointment time is invalid." }, { status: 400 });
  }

  const appointment = await getAppointmentById(id);

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const requestedLabel = formatAppointmentDate(requestedAt);
  const timestamp = formatAppointmentDate(new Date().toISOString());
  const rescheduleNote = `[${timestamp}] Customer requested reschedule to ${requestedLabel}.`;
  const nextNotes = appointment.notes?.trim()
    ? `${appointment.notes.trim()}\n${rescheduleNote}`
    : rescheduleNote;

  await updateAppointment(id, {
    status: "reschedule_requested",
    confirmed: false,
    notes: nextNotes
  });

  await registerEvent(id, "reschedule_requested_clicked", {
    requested_at: requestedAt,
    requested_label: requestedLabel,
    userAgent: request.headers.get("user-agent") ?? "unknown"
  });

  return NextResponse.json({ ok: true, requestedAt, requestedLabel });
}
