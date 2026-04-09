import { NextResponse } from "next/server";
import { deleteAppointment, getAppointmentAnalytics } from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const analytics = await getAppointmentAnalytics(id);

  if (!analytics) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  return NextResponse.json(analytics);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const analytics = await getAppointmentAnalytics(id);

  if (!analytics) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  await deleteAppointment(id);
  return NextResponse.json({ ok: true });
}
