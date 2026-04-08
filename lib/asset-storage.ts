import { createUuid } from "@/lib/uuid";
import { getSupabaseServerClient } from "@/lib/supabase";

const APPOINTMENT_ASSETS_BUCKET = "appointment-assets";

function safeExtension(filename: string) {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || "bin";
}

export async function uploadAppointmentAsset(file: File, folder = "misc") {
  const supabase = getSupabaseServerClient();
  const ext = safeExtension(file.name);
  const path = `${folder}/${createUuid()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(APPOINTMENT_ASSETS_BUCKET)
    .upload(path, bytes, {
      contentType: file.type || undefined,
      upsert: false
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(APPOINTMENT_ASSETS_BUCKET).getPublicUrl(path);

  if (!data.publicUrl) {
    throw new Error("Unable to generate public asset URL");
  }

  return data.publicUrl;
}
