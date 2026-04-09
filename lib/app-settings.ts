import { getSupabaseServerClient } from "@/lib/supabase";
import { FeaturedReview } from "@/lib/types";
import { DEFAULT_LOCATION_ADDRESS, DEFAULT_LOCATION_NAME } from "@/lib/constants";

export type TemplateSettings = {
  advisor_name?: string;
  advisor_phone?: string;
  advisor_photo_url?: string;
  location_name?: string;
  location_address?: string;
  google_maps_url?: string;
  google_reviews_url?: string;
  yelp_reviews_url?: string;
  entrance_photo_urls?: string[];
  featured_reviews?: FeaturedReview[];
  review_photo_urls?: string[];
};

export type AdvisorProfileKey = "jude" | "crystal";

export type AdvisorProfile = {
  key: AdvisorProfileKey;
  label: string;
  advisor_name?: string;
  advisor_phone?: string;
  advisor_photo_url?: string;
  advisor_email?: string;
};

export type AppSettings = {
  openaiApiKey?: string;
  openaiModel?: string;
  templateDefaults?: TemplateSettings;
  advisorProfiles?: AdvisorProfile[];
};

const DEFAULT_ADVISOR_PROFILES: AdvisorProfile[] = [
  {
    key: "jude",
    label: "Jude",
    advisor_name: "Jude"
  },
  {
    key: "crystal",
    label: "Crystal",
    advisor_name: "Crystal"
  }
];

async function readSetting<T>(key: string, fallback: T) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();

  if (error) {
    throw error;
  }

  return (data?.value as T | null) ?? fallback;
}

async function writeSetting<T>(key: string, value: T) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("app_settings").upsert({ key, value }, { onConflict: "key" });

  if (error) {
    throw error;
  }
}

export async function getAppSettings() {
  const [openaiSettings, templateDefaults, advisorProfiles] = await Promise.all([
    readSetting<Omit<AppSettings, "templateDefaults">>("openai", {}),
    readSetting<TemplateSettings>("template_defaults", {
      advisor_name: "Jude",
      location_name: DEFAULT_LOCATION_NAME,
      location_address: DEFAULT_LOCATION_ADDRESS
    }),
    readSetting<AdvisorProfile[]>("advisor_profiles", DEFAULT_ADVISOR_PROFILES)
  ]);

  return {
    ...openaiSettings,
    templateDefaults,
    advisorProfiles
  } satisfies AppSettings;
}

export async function updateAppSettings(next: AppSettings) {
  const current = await getAppSettings();
  const merged = {
    ...current,
    ...next,
    templateDefaults: {
      ...current.templateDefaults,
      ...next.templateDefaults
    }
  } satisfies AppSettings;

  await Promise.all([
    writeSetting("openai", {
      openaiApiKey: merged.openaiApiKey,
      openaiModel: merged.openaiModel
    }),
    writeSetting("template_defaults", merged.templateDefaults || {}),
    writeSetting("advisor_profiles", merged.advisorProfiles || DEFAULT_ADVISOR_PROFILES)
  ]);

  return merged;
}

export async function getPublicAppSettings() {
  const settings = await getAppSettings();
  return {
    openaiConfigured: Boolean(settings.openaiApiKey),
    openaiModel: settings.openaiModel || "gpt-4.1-mini",
    advisorProfiles: settings.advisorProfiles || DEFAULT_ADVISOR_PROFILES,
    templateDefaults: settings.templateDefaults || {
      advisor_name: "Jude",
      location_name: DEFAULT_LOCATION_NAME,
      location_address: DEFAULT_LOCATION_ADDRESS
    }
  };
}
