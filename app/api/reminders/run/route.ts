import { NextRequest, NextResponse } from "next/server";
import { formatAppointmentDate } from "@/lib/datetime";
import { getSupabaseServerClient } from "@/lib/supabase";
import { sendSms } from "@/lib/sms";

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.REMINDER_CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const vercelCron = request.headers.get("x-vercel-cron");

  if (vercelCron) {
    return true;
  }

  if (!cronSecret) {
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const now = Date.now();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .not("appointment_at", "is", null)
    .order("appointment_at", { ascending: true });

  if (error) {
    throw error;
  }

  const results: Array<{ id: string; reminder: "2hr" | "30min"; status: "sent" | "failed" }> = [];

  for (const row of data ?? []) {
    const appointmentAt = row.appointment_at ? new Date(String(row.appointment_at)).getTime() : NaN;
    const status = String(row.status ?? "scheduled");
    const phone = String(row.customer_phone ?? row.phone ?? "").trim();

    if (!phone || Number.isNaN(appointmentAt) || appointmentAt <= now) {
      continue;
    }

    if (status === "canceled" || status === "reschedule_requested") {
      continue;
    }

    const msUntil = appointmentAt - now;
    const wants2Hr = msUntil <= 2 * 60 * 60 * 1000 && msUntil > 30 * 60 * 1000 && !row.reminder_2hr_sent;
    const wants30Min = msUntil <= 30 * 60 * 1000 && msUntil > 0 && !row.reminder_30min_sent;

    if (!wants2Hr && !wants30Min) {
      continue;
    }

    const reminder = wants30Min ? "30min" : "2hr";
    const body =
      reminder === "2hr"
        ? `Hey - we've got everything ready for your ${row.vehicle} at ${formatAppointmentDate(String(row.appointment_at))}. Still good?`
        : "We're all set. See you soon.";

    try {
      await sendSms({ to: phone, body });
      await supabase
        .from("appointments")
        .update(
          reminder === "2hr"
            ? { reminder_2hr_sent: true }
            : { reminder_30min_sent: true }
        )
        .eq("id", row.id);

      results.push({ id: String(row.id), reminder, status: "sent" });
    } catch (sendError) {
      console.error("Reminder SMS failed", { appointmentId: row.id, reminder, error: sendError });

      await supabase
        .from("appointments")
        .update(
          reminder === "2hr"
            ? { reminder_2hr_sent: true }
            : { reminder_30min_sent: true }
        )
        .eq("id", row.id);

      results.push({ id: String(row.id), reminder, status: "failed" });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
