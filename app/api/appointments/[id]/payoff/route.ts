import { NextRequest, NextResponse } from "next/server";
import { getAppointmentById, registerEvent, updateAppointment } from "@/lib/storage";
import { uploadAppointmentAsset } from "@/lib/asset-storage";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const appointment = await getAppointmentById(id);

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const bankName = String(formData.get("bankName") || "").trim();
  const files = formData.getAll("files").filter((value): value is File => value instanceof File);

  if (!bankName && files.length === 0) {
    return NextResponse.json(
      { error: "Add the bank name or at least one payoff photo." },
      { status: 400 }
    );
  }

  const uploadedUrls: string[] = [];

  for (const file of files) {
    const url = await uploadAppointmentAsset(file, `payoff/${id}`);
    uploadedUrls.push(url);
  }

  const nextUrls = [...(appointment.payoff_photo_urls ?? []), ...uploadedUrls];
  const updated = await updateAppointment(id, {
    payoff_lender_name: bankName || appointment.payoff_lender_name,
    payoff_photo_urls: nextUrls
  });

  await registerEvent(id, "payoff_info_submitted", {
    bankName: bankName || appointment.payoff_lender_name || "",
    uploadedPhotos: uploadedUrls.length
  });

  return NextResponse.json({
    appointment: updated,
    uploadedUrls
  });
}
