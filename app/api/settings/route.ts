import { NextRequest, NextResponse } from "next/server";
import { getPublicAppSettings, updateAppSettings } from "@/lib/app-settings";
import { getCurrentUser } from "@/lib/auth";
import { updateUserAccount } from "@/lib/users";

export async function GET() {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getPublicAppSettings());
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    openaiApiKey?: string;
    openaiModel?: string;
    accountProfile?: {
      display_name?: string;
      advisor_name?: string;
      advisor_phone?: string;
      advisor_photo_url?: string;
      advisor_email?: string;
    };
    templateDefaults?: {
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
    templateDefaults?: typeof body.templateDefaults;
  } = {
    openaiModel: body.openaiModel?.trim() || "gpt-4.1-mini",
    templateDefaults: body.templateDefaults
  };

  if (body.openaiApiKey?.trim()) {
    nextSettings.openaiApiKey = body.openaiApiKey.trim();
  }

  await Promise.all([
    updateAppSettings(nextSettings),
    body.accountProfile
      ? updateUserAccount(currentUser.id, {
          display_name: body.accountProfile.display_name?.trim() || currentUser.display_name,
          advisor_name: body.accountProfile.advisor_name?.trim() || currentUser.display_name,
          advisor_phone: body.accountProfile.advisor_phone?.trim() || "",
          advisor_email: body.accountProfile.advisor_email?.trim() || currentUser.email,
          advisor_photo_url: body.accountProfile.advisor_photo_url?.trim() || ""
        })
      : Promise.resolve(null)
  ]);

  return NextResponse.json(await getPublicAppSettings());
}
