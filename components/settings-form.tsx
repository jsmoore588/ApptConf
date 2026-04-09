"use client";

import Link from "next/link";
import { ChangeEvent, useState } from "react";
import { FeaturedReview } from "@/lib/types";

type Props = {
  settings: {
    openaiConfigured: boolean;
    openaiModel: string;
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
  currentUser: {
    id: string;
    email: string;
    display_name: string;
    advisor_name?: string;
    advisor_phone?: string;
    advisor_email?: string;
    advisor_photo_url?: string;
  };
  teamMembers: Array<{
    id: string;
    email: string;
    display_name: string;
    advisor_name?: string;
    advisor_phone?: string;
    advisor_email?: string;
  }>;
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

function textToList(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function SettingsForm({ settings, currentUser, teamMembers }: Props) {
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState(settings.openaiModel);
  const [account, setAccount] = useState({
    display_name: currentUser.display_name || "",
    advisor_name: currentUser.advisor_name || currentUser.display_name || "",
    advisor_phone: currentUser.advisor_phone || "",
    advisor_email: currentUser.advisor_email || currentUser.email || "",
    advisor_photo_url: currentUser.advisor_photo_url || ""
  });
  const [template, setTemplate] = useState({
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
  const [uploadMessages, setUploadMessages] = useState<Record<string, string | null>>({});

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
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Upload failed");
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
    setUploadMessages((current) => ({ ...current, [field]: null }));

    try {
      const uploaded = await uploadFiles(event.target.files, folder);

      if (field === "advisor_photo_url") {
        setAccount((current) => ({
          ...current,
          advisor_photo_url: uploaded[0] || current.advisor_photo_url
        }));
      } else {
        setTemplate((current) => ({
          ...current,
          [field]: [current[field], ...uploaded].filter(Boolean).join("\n")
        }));
      }

      setStatus("Image upload complete.");
      setUploadMessages((current) => ({
        ...current,
        [field]: uploaded.length > 0 ? `Uploaded ${uploaded.length} image${uploaded.length === 1 ? "" : "s"}.` : "Saved."
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image upload failed.";
      setStatus(message);
      setUploadMessages((current) => ({ ...current, [field]: message }));
    } finally {
      event.target.value = "";
      setUploadingField(null);
    }
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);

    const templateDefaults = {
      location_name: template.location_name.trim(),
      location_address: template.location_address.trim(),
      google_maps_url: template.google_maps_url.trim(),
      google_reviews_url: template.google_reviews_url.trim(),
      yelp_reviews_url: template.yelp_reviews_url.trim(),
      entrance_photo_urls: textToList(template.entrance_photo_urls),
      review_photo_urls: textToList(template.review_photo_urls),
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
        body: JSON.stringify({
          openaiApiKey,
          openaiModel,
          accountProfile: account,
          templateDefaults
        })
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
    <div className="mt-8 space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[1.7rem] bg-[#173d33] p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">Your account</p>
          <h2 className="mt-3 text-3xl font-semibold">Your defaults follow your login.</h2>
          <p className="mt-3 text-sm leading-7 text-white/74">
            When you create a link from the dashboard, these values become the advisor name, phone,
            email, and photo automatically.
          </p>

          <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Team access</p>
            <div className="mt-4 space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/8 bg-white/5 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {member.advisor_name || member.display_name}
                    </p>
                    <p className="text-xs text-white/60">{member.email}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/65">
                    {member.id === currentUser.id ? "You" : "Team"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[1.7rem] border border-[#ddd3c7] bg-[#fcfaf6] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6f50]">AI</p>
          <h2 className="mt-3 text-2xl font-semibold text-[#181510]">OpenAI configuration</h2>
          <div className="mt-5 space-y-4">
            <div className="rounded-[1.15rem] bg-[#f3ece3] px-4 py-3 text-sm text-[#5e5448]">
              OpenAI key status: {settings.openaiConfigured ? "configured" : "not configured"}
            </div>
            <TextField
              label="OpenAI API key"
              type="password"
              value={openaiApiKey}
              placeholder={settings.openaiConfigured ? "Saved. Enter a new key to replace it." : "sk-..."}
              onChange={setOpenaiApiKey}
            />
            <TextField label="Model" value={openaiModel} onChange={setOpenaiModel} />
          </div>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-[#ddd3c7] bg-white/78 p-6 shadow-[0_18px_42px_rgba(45,35,24,0.07)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6f50]">Profile</p>
        <h2 className="mt-3 text-2xl font-semibold text-[#181510]">Your advisor identity</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <TextField label="Display name" value={account.display_name} onChange={(value) => setAccount({ ...account, display_name: value })} />
          <TextField label="Advisor name shown to customers" value={account.advisor_name} onChange={(value) => setAccount({ ...account, advisor_name: value })} />
          <TextField label="Advisor phone" value={account.advisor_phone} onChange={(value) => setAccount({ ...account, advisor_phone: value })} />
          <TextField label="Advisor email" value={account.advisor_email} onChange={(value) => setAccount({ ...account, advisor_email: value })} />
          <div className="md:col-span-2">
            <TextField label="Advisor photo URL" value={account.advisor_photo_url} onChange={(value) => setAccount({ ...account, advisor_photo_url: value })} />
          </div>
          <div className="md:col-span-2">
            <UploadField
              label="Upload advisor photo"
              disabled={uploadingField === "advisor_photo_url"}
              onChange={(event) => handleImageUpload(event, "advisor_photo_url", "advisor")}
            />
            <UploadMessage message={uploadMessages.advisor_photo_url} />
          </div>
          <div className="md:col-span-2">
            <ImagePreviewGrid
              title="Advisor photo preview"
              images={account.advisor_photo_url ? [account.advisor_photo_url] : []}
              emptyLabel="No advisor photo added yet."
              onRemove={() => setAccount((current) => ({ ...current, advisor_photo_url: "" }))}
              single
            />
          </div>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-[#ddd3c7] bg-white/78 p-6 shadow-[0_18px_42px_rgba(45,35,24,0.07)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6f50]">Customer page</p>
        <h2 className="mt-3 text-2xl font-semibold text-[#181510]">Shared template defaults</h2>
        <p className="mt-2 text-sm leading-7 text-[#62584d]">
          These values stay shared across the whole team so every customer page uses the same location,
          maps, review links, entrance photos, and trust content.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <TextField label="Location name" value={template.location_name} onChange={(value) => setTemplate({ ...template, location_name: value })} />
          <TextField label="Location address" value={template.location_address} onChange={(value) => setTemplate({ ...template, location_address: value })} />
          <TextField label="Google Maps URL" value={template.google_maps_url} onChange={(value) => setTemplate({ ...template, google_maps_url: value })} />
          <TextField label="Google reviews URL" value={template.google_reviews_url} onChange={(value) => setTemplate({ ...template, google_reviews_url: value })} />
          <div className="md:col-span-2">
            <TextField label="Yelp reviews URL" value={template.yelp_reviews_url} onChange={(value) => setTemplate({ ...template, yelp_reviews_url: value })} />
          </div>
          <div className="md:col-span-2">
            <TextArea
              label="Entrance photo URLs"
              value={template.entrance_photo_urls}
              helper="One URL per line. Uploaded images will appear below immediately."
              onChange={(value) => setTemplate({ ...template, entrance_photo_urls: value })}
            />
          </div>
          <div className="md:col-span-2">
            <UploadField
              label="Upload entrance photos"
              multiple
              disabled={uploadingField === "entrance_photo_urls"}
              onChange={(event) => handleImageUpload(event, "entrance_photo_urls", "entrance")}
            />
            <UploadMessage message={uploadMessages.entrance_photo_urls} />
          </div>
          <div className="md:col-span-2">
            <ImagePreviewGrid
              title="Entrance photo previews"
              images={textToList(template.entrance_photo_urls)}
              emptyLabel="No entrance photos added yet."
              onRemove={(index) =>
                setTemplate((current) => ({
                  ...current,
                  entrance_photo_urls: textToList(current.entrance_photo_urls)
                    .filter((_, itemIndex) => itemIndex !== index)
                    .join("\n")
                }))
              }
            />
          </div>
          <div className="md:col-span-2">
            <TextArea
              label="Review / trust image URLs"
              value={template.review_photo_urls}
              helper="One URL per line. Uploaded review photos will appear below immediately."
              onChange={(value) => setTemplate({ ...template, review_photo_urls: value })}
            />
          </div>
          <div className="md:col-span-2">
            <UploadField
              label="Upload review / trust images"
              multiple
              disabled={uploadingField === "review_photo_urls"}
              onChange={(event) => handleImageUpload(event, "review_photo_urls", "reviews")}
            />
            <UploadMessage message={uploadMessages.review_photo_urls} />
          </div>
          <div className="md:col-span-2">
            <ImagePreviewGrid
              title="Review photo previews"
              images={textToList(template.review_photo_urls)}
              emptyLabel="No review photos added yet."
              onRemove={(index) =>
                setTemplate((current) => ({
                  ...current,
                  review_photo_urls: textToList(current.review_photo_urls)
                    .filter((_, itemIndex) => itemIndex !== index)
                    .join("\n")
                }))
              }
            />
          </div>
          <div className="md:col-span-2">
            <TextArea
              label="Featured reviews"
              value={template.featured_reviews}
              helper="One per line: Name | Review text | Source"
              onChange={(value) => setTemplate({ ...template, featured_reviews: value })}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-[#173d33] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#113328] disabled:opacity-70"
        >
          {saving ? "Saving..." : "Save settings"}
        </button>
        <Link
          href="/dashboard"
          className="rounded-full border border-[#d9d0c5] bg-[#fcfaf6] px-5 py-3 text-sm font-semibold text-[#1f1a16]"
        >
          Back to dashboard
        </Link>
      </div>

      {status ? <p className="text-sm text-[#5d5348]">{status}</p> : null}
    </div>
  );
}

function UploadMessage({ message }: { message?: string | null }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2 text-sm text-[#5d5348]">{message}</p>;
}

function ImagePreviewGrid({
  title,
  images,
  emptyLabel,
  onRemove,
  single = false
}: {
  title: string;
  images: string[];
  emptyLabel: string;
  onRemove: (index: number) => void;
  single?: boolean;
}) {
  return (
    <div className="rounded-[1.2rem] border border-[#e5dccf] bg-[#fbf7f1] p-4">
      <p className="text-sm font-semibold text-[#2d2923]">{title}</p>
      {images.length === 0 ? (
        <p className="mt-3 text-sm text-[#73685d]">{emptyLabel}</p>
      ) : (
        <div className={`mt-4 grid gap-3 ${single ? "max-w-[220px]" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {images.map((image, index) => (
            <div key={`${image}-${index}`} className="overflow-hidden rounded-[1rem] border border-[#ddd3c7] bg-white">
              <img src={image} alt={title} className="h-32 w-full object-cover" />
              <div className="flex items-center justify-between gap-2 px-3 py-3">
                <p className="truncate text-xs text-[#6d6258]">{image}</p>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="shrink-0 rounded-full border border-[#d7cec1] px-3 py-1 text-xs font-semibold text-[#2d2923]"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
    <label className="block text-sm font-medium text-[#2d2923]">
      {label}
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={disabled}
        onChange={onChange}
        className="mt-2 block w-full rounded-[1.1rem] border border-[#d8cdbc] bg-[#fcfaf6] px-4 py-3"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-medium text-[#2d2923]">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-[1.1rem] border border-[#d8cdbc] bg-[#fcfaf6] px-4 py-3 text-[#1f1a16]"
      />
    </label>
  );
}

function TextArea({
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
    <label className="block text-sm font-medium text-[#2d2923]">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-2 w-full rounded-[1.1rem] border border-[#d8cdbc] bg-[#fcfaf6] px-4 py-3 text-[#1f1a16]"
      />
      <span className="mt-2 block text-xs text-[#7a7065]">{helper}</span>
    </label>
  );
}
