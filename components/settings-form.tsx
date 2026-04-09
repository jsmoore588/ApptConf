"use client";

import Link from "next/link";
import { ChangeEvent, useState } from "react";
import { FeaturedReview } from "@/lib/types";

type Props = {
  settings: {
    openaiConfigured: boolean;
    openaiModel: string;
    advisorProfiles: Array<{
      key: "jude" | "crystal";
      label: string;
      advisor_name?: string;
      advisor_phone?: string;
      advisor_photo_url?: string;
      advisor_email?: string;
    }>;
    templateDefaults: {
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
      featured_reviews?: FeaturedReview[];
    };
  };
};

function listToText(values?: string[]) {
  return values?.join("\n") || "";
}

function reviewsToText(values?: FeaturedReview[]) {
  return (
    values
      ?.map((review) => [review.reviewer_name, review.review_text, review.review_source || ""].join(" | "))
      .join("\n") || ""
  );
}

export function SettingsForm({ settings }: Props) {
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState(settings.openaiModel);
  const [advisorProfiles, setAdvisorProfiles] = useState(
    settings.advisorProfiles.length > 0
      ? settings.advisorProfiles
      : [
          { key: "jude" as const, label: "Jude", advisor_name: "Jude" },
          { key: "crystal" as const, label: "Crystal", advisor_name: "Crystal" }
        ]
  );
  const [template, setTemplate] = useState({
    advisor_name: settings.templateDefaults.advisor_name || "Jude",
    advisor_phone: settings.templateDefaults.advisor_phone || "",
    advisor_photo_url: settings.templateDefaults.advisor_photo_url || "",
    location_name: settings.templateDefaults.location_name || "Bullard Buying Center",
    location_address:
      settings.templateDefaults.location_address || "1147 E. I65 Service Rd., Mobile, AL 36606",
    google_maps_url: settings.templateDefaults.google_maps_url || "",
    google_reviews_url: settings.templateDefaults.google_reviews_url || "",
    yelp_reviews_url: settings.templateDefaults.yelp_reviews_url || "",
    entrance_photo_urls: listToText(settings.templateDefaults.entrance_photo_urls),
    review_photo_urls: listToText(settings.templateDefaults.review_photo_urls),
    featured_reviews: reviewsToText(settings.templateDefaults.featured_reviews)
  });
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  async function uploadFiles(files: FileList | null, folder: string) {
    if (!files?.length) {
      return [];
    }

    const uploads: string[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const response = await fetch("/api/uploads/appointment-asset", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const payload = (await response.json()) as { url: string };
      uploads.push(payload.url);
    }

    return uploads;
  }

  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>,
    field: "advisor_photo_url" | "entrance_photo_urls" | "review_photo_urls",
    folder: string
  ) {
    setUploadingField(field);
    setStatus(null);

    try {
      const uploaded = await uploadFiles(event.target.files, folder);

      setTemplate((current) => ({
        ...current,
        [field]:
          field === "advisor_photo_url"
            ? uploaded[0] || current.advisor_photo_url
            : [current[field], ...uploaded].filter(Boolean).join("\n")
      }));

      setStatus("Image upload complete.");
    } catch {
      setStatus("Image upload failed.");
    } finally {
      event.target.value = "";
      setUploadingField(null);
    }
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);

    const templateDefaults = {
      advisor_name: template.advisor_name.trim(),
      advisor_phone: template.advisor_phone.trim(),
      advisor_photo_url: template.advisor_photo_url.trim(),
      location_name: template.location_name.trim(),
      location_address: template.location_address.trim(),
      google_maps_url: template.google_maps_url.trim(),
      google_reviews_url: template.google_reviews_url.trim(),
      yelp_reviews_url: template.yelp_reviews_url.trim(),
      entrance_photo_urls: template.entrance_photo_urls
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      review_photo_urls: template.review_photo_urls
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      featured_reviews: template.featured_reviews
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [reviewer_name, review_text, review_source] = line.split("|").map((part) => part.trim());
          return { reviewer_name, review_text, review_source };
        })
        .filter((review) => review.reviewer_name && review.review_text)
    };

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openaiApiKey, openaiModel, advisorProfiles, templateDefaults })
      });

      if (!response.ok) {
        throw new Error("Save failed");
      }

      setOpenaiApiKey("");
      setStatus("Settings saved.");
    } catch {
      setStatus("Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 space-y-8">
      <div className="rounded-[1.5rem] bg-[#faf7f0] p-4 text-sm text-black/65">
        OpenAI key status: {settings.openaiConfigured ? "configured" : "not configured"}
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-ink">OpenAI</h2>
        <label className="block text-sm font-medium text-ink">
          OpenAI API key
          <input
            type="password"
            value={openaiApiKey}
            onChange={(event) => setOpenaiApiKey(event.target.value)}
            placeholder={settings.openaiConfigured ? "Saved. Enter a new key to replace it." : "sk-..."}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-[#faf7f0] px-4 py-3"
          />
        </label>

        <label className="block text-sm font-medium text-ink">
          Model
          <input
            type="text"
            value={openaiModel}
            onChange={(event) => setOpenaiModel(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-[#faf7f0] px-4 py-3"
          />
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-ink">Customer Page Template</h2>
        <p className="text-sm leading-7 text-black/60">
          These values fill in the advisor, arrival, maps, photo, and review sections for future appointments
          when those fields are not passed individually.
        </p>

        <TemplateField label="Advisor name" value={template.advisor_name} onChange={(value) => setTemplate({ ...template, advisor_name: value })} />
        <TemplateField label="Advisor phone" value={template.advisor_phone} onChange={(value) => setTemplate({ ...template, advisor_phone: value })} />
        <TemplateField label="Advisor photo URL" value={template.advisor_photo_url} onChange={(value) => setTemplate({ ...template, advisor_photo_url: value })} />
        <UploadField
          label="Upload advisor photo"
          disabled={uploadingField === "advisor_photo_url"}
          onChange={(event) => handleImageUpload(event, "advisor_photo_url", "advisor")}
        />
        <TemplateField label="Location name" value={template.location_name} onChange={(value) => setTemplate({ ...template, location_name: value })} />
        <TemplateField label="Location address" value={template.location_address} onChange={(value) => setTemplate({ ...template, location_address: value })} />
        <TemplateField label="Google Maps URL" value={template.google_maps_url} onChange={(value) => setTemplate({ ...template, google_maps_url: value })} />
        <TemplateField label="Google reviews URL" value={template.google_reviews_url} onChange={(value) => setTemplate({ ...template, google_reviews_url: value })} />
        <TemplateField label="Yelp reviews URL" value={template.yelp_reviews_url} onChange={(value) => setTemplate({ ...template, yelp_reviews_url: value })} />
        <TemplateArea
          label="Entrance photo URLs"
          value={template.entrance_photo_urls}
          helper="One URL per line."
          onChange={(value) => setTemplate({ ...template, entrance_photo_urls: value })}
        />
        <UploadField
          label="Upload entrance photos"
          multiple
          disabled={uploadingField === "entrance_photo_urls"}
          onChange={(event) => handleImageUpload(event, "entrance_photo_urls", "entrance")}
        />
        <TemplateArea
          label="Review / trust image URLs"
          value={template.review_photo_urls}
          helper="One URL per line."
          onChange={(value) => setTemplate({ ...template, review_photo_urls: value })}
        />
        <UploadField
          label="Upload review / trust images"
          multiple
          disabled={uploadingField === "review_photo_urls"}
          onChange={(event) => handleImageUpload(event, "review_photo_urls", "reviews")}
        />
        <TemplateArea
          label="Featured reviews"
          value={template.featured_reviews}
          helper="One per line in this format: Name | Review text | Source"
          onChange={(value) => setTemplate({ ...template, featured_reviews: value })}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-ink">Appraiser Profiles</h2>
        <p className="text-sm leading-7 text-black/60">
          These presets power the dashboard link generator so you can switch between Jude and Crystal instantly.
        </p>

        {advisorProfiles.map((profile, index) => (
          <div key={profile.key} className="rounded-[1.5rem] border border-black/10 bg-[#faf7f0] p-4">
            <p className="text-sm font-semibold text-ink">{profile.label}</p>
            <div className="mt-4 grid gap-4">
              <TemplateField
                label="Display name"
                value={profile.advisor_name || ""}
                onChange={(value) =>
                  setAdvisorProfiles((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, advisor_name: value } : item
                    )
                  )
                }
              />
              <TemplateField
                label="Phone"
                value={profile.advisor_phone || ""}
                onChange={(value) =>
                  setAdvisorProfiles((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, advisor_phone: value } : item
                    )
                  )
                }
              />
              <TemplateField
                label="Email"
                value={profile.advisor_email || ""}
                onChange={(value) =>
                  setAdvisorProfiles((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, advisor_email: value } : item
                    )
                  )
                }
              />
              <TemplateField
                label="Photo URL"
                value={profile.advisor_photo_url || ""}
                onChange={(value) =>
                  setAdvisorProfiles((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, advisor_photo_url: value } : item
                    )
                  )
                }
              />
            </div>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white"
        >
          {saving ? "Saving..." : "Save settings"}
        </button>
        <Link
          href="/dashboard"
          className="rounded-full border border-black/10 px-5 py-3 text-sm font-medium text-ink"
        >
          Back to dashboard
        </Link>
      </div>

      {status ? <p className="text-sm text-black/65">{status}</p> : null}
    </div>
  );
}

function UploadField({
  label,
  onChange,
  multiple = false,
  disabled = false
}: {
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  multiple?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={disabled}
        onChange={onChange}
        className="mt-2 block w-full rounded-2xl border border-black/10 bg-[#faf7f0] px-4 py-3"
      />
    </label>
  );
}

function TemplateField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-black/10 bg-[#faf7f0] px-4 py-3"
      />
    </label>
  );
}

function TemplateArea({
  label,
  value,
  helper,
  onChange
}: {
  label: string;
  value: string;
  helper: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-2 w-full rounded-2xl border border-black/10 bg-[#faf7f0] px-4 py-3"
      />
      <span className="mt-2 block text-xs text-black/50">{helper}</span>
    </label>
  );
}
