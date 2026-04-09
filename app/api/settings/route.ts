import { NextRequest, NextResponse } from "next/server";
import { getPublicAppSettings, updateAppSettings } from "@/lib/app-settings";
import { isAuthenticated } from "@/lib/auth";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getPublicAppSettings());
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    openaiApiKey?: string;
    openaiModel?: string;
    advisorProfiles?: Array<{
      key: "jude" | "crystal";
      label: string;
      advisor_name?: string;
      advisor_phone?: string;
      advisor_photo_url?: string;
      advisor_email?: string;
    }>;
    templateDefaults?: {
      advisor_name?: string;
      advisor_phone?: string;
      advisor_photo_url?: string;
      location_name?: string;
      location_address?: string;
      google_maps_url?: string;
      google_reviews_url?: string;
      yelp_reviews_url?: string;
      entrance_photo_urls?: string[];
      review_photo_urls?: string[];
      featured_reviews?: Array<{
        reviewer_name: string;
        review_text: string;
        review_source?: string;
      }>;
    };
  };

  const nextSettings: {
    openaiApiKey?: string;
    openaiModel?: string;
    advisorProfiles?: typeof body.advisorProfiles;
    templateDefaults?: typeof body.templateDefaults;
  } = {
    openaiModel: body.openaiModel?.trim() || "gpt-4.1-mini",
    advisorProfiles: body.advisorProfiles,
    templateDefaults: body.templateDefaults
  };

  if (body.openaiApiKey?.trim()) {
    nextSettings.openaiApiKey = body.openaiApiKey.trim();
  }

  await updateAppSettings(nextSettings);
  return NextResponse.json(await getPublicAppSettings());
}
