import { getSupabaseServerClient } from "@/lib/supabase";

export type AppSettings = {
  openaiApiKey?: string;
  openaiModel?: string;
};

export async function getAppSettings() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "openai")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data?.value as AppSettings | null) ?? {};
}

export async function updateAppSettings(next: AppSettings) {
  const current = await getAppSettings();
  const merged = { ...current, ...next };
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("app_settings").upsert(
    {
      key: "openai",
      value: merged
    },
    { onConflict: "key" }
  );

  if (error) {
    throw error;
  }

  return merged;
}

export async function getPublicAppSettings() {
  const settings = await getAppSettings();
  return {
    openaiConfigured: Boolean(settings.openaiApiKey),
    openaiModel: settings.openaiModel || "gpt-4.1-mini"
  };
}
