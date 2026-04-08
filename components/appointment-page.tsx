"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Appointment } from "@/lib/types";
import { formatAppointmentDate } from "@/lib/datetime";
import { DEFAULT_LOCATION_ADDRESS, DEFAULT_LOCATION_NAME } from "@/lib/constants";

type Props = {
  appointment: Appointment;
};

const arrivalSteps = [
  "Pull into the front lot",
  "Park near the buying center entrance",
  "Come inside and ask for your advisor"
];

const expectationSteps = [
  { label: "Walkaround", time: "~15 min", detail: "Quick look over the vehicle to confirm overall condition." },
  { label: "Market review", time: "~10 min", detail: "We show you the real market and where the numbers come from." },
  { label: "Offer", time: "~10-15 min", detail: "We wrap with a straightforward offer and next steps." }
];

const bringItems = [
  { label: "Title (if you have it)", detail: "If it is available, bringing it can speed things up." },
  { label: "Payoff info (if applicable)", detail: "A recent payoff amount helps if there is money still owed." },
  { label: "Keys", detail: "Bring every key you have so the visit stays simple." }
];

function createGoogleCalendarLink(appointment: Appointment, startLabel: string) {
  if (!appointment.appointment_at) {
    return null;
  }

  const start = new Date(appointment.appointment_at);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  const dateText = `${toGoogleDate(start)}/${toGoogleDate(end)}`;
  const text = encodeURIComponent(`Appointment - ${appointment.name}`);
  const details = encodeURIComponent(
    `Vehicle: ${appointment.vehicle}\nTime: ${startLabel}\nAdvisor: ${appointment.advisor_name || appointment.advisor}`
  );
  const location = encodeURIComponent(
    appointment.location_address || appointment.location_name || `${DEFAULT_LOCATION_NAME}, ${DEFAULT_LOCATION_ADDRESS}`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dateText}&details=${details}&location=${location}`;
}

function toGoogleDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatShortTime(dateText?: string) {
  if (!dateText) {
    return null;
  }

  const date = new Date(dateText);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function formatDayTime(dateText?: string) {
  if (!dateText) {
    return null;
  }

  const date = new Date(dateText);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function AppointmentPage({ appointment }: Props) {
  const [confirmed, setConfirmed] = useState(Boolean(appointment.confirmed));
  const [toast, setToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSupportAction, setActiveSupportAction] = useState<string | null>(null);
  const [activeGallery, setActiveGallery] = useState<{ images: string[]; index: number } | null>(null);
  const [showMoreReviews, setShowMoreReviews] = useState(false);
  const [expandedExpectation, setExpandedExpectation] = useState<string | null>(null);
  const [expandedBringItem, setExpandedBringItem] = useState<string | null>(null);

  const advisorName = appointment.advisor_name || appointment.advisor || "Jude";
  const timeLabel = appointment.appointment_at ? formatAppointmentDate(appointment.appointment_at) : appointment.time;
  const shortTime = formatShortTime(appointment.appointment_at) || appointment.time || timeLabel;
  const dayTime = formatDayTime(appointment.appointment_at);
  const entrancePhotos = appointment.entrance_photo_urls ?? [];
  const reviews = appointment.featured_reviews ?? [];
  const featuredReviews = reviews.slice(0, 3);
  const extraReviews = reviews.slice(3);
  const trustImages = [
    ...(appointment.review_photo_urls ?? []),
    ...(appointment.customer_delivery_photo_urls ?? []),
    ...(appointment.check_handoff_photo_urls ?? [])
  ];
  const calendarLink = useMemo(() => createGoogleCalendarLink(appointment, timeLabel), [appointment, timeLabel]);
  const contactPhone = appointment.advisor_phone;
  const mapsLink =
    appointment.google_maps_url ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      appointment.location_address || DEFAULT_LOCATION_ADDRESS
    )}`;

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/appointments/${appointment.id}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "page_opened" }),
      signal: controller.signal
    }).catch(() => null);

    return () => controller.abort();
  }, [appointment.id]);

  async function handleConfirm() {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/appointments/${appointment.id}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "confirm_clicked" })
      });

      if (!response.ok) {
        throw new Error("Unable to confirm");
      }

      setConfirmed(true);
      setToast(`Perfect - I'll be ready for you at ${shortTime}.`);
    } catch {
      setToast("Your time is still set aside. If needed, just reply back and we will take care of it.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSupportAction({
    type,
    message,
    toastMessage
  }: {
    type: "running_late_clicked" | "reschedule_requested_clicked" | "cant_make_it_clicked";
    message: string;
    toastMessage: string;
  }) {
    setActiveSupportAction(type);

    try {
      await fetch(`/api/appointments/${appointment.id}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      });
    } catch {
      // Keep the outbound message path available even if event logging fails.
    } finally {
      setActiveSupportAction(null);
    }

    setToast(toastMessage);

    if (contactPhone) {
      window.location.href = `sms:${contactPhone}?body=${encodeURIComponent(message)}`;
    }
  }

  return (
    <main className="min-h-screen bg-transparent px-4 py-5 text-[#1a1a1a] sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-[#e4d8ca] bg-[linear-gradient(135deg,#f7f1e7_0%,#f1e8da_55%,#eadfce_100%)] p-6 shadow-[0_30px_80px_rgba(48,36,25,0.14)] sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(186,135,77,0.22),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(31,73,60,0.18),transparent_24%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/50 bg-white/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#826548] backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[#20483a]" />
                Appointment Reserved
              </div>

              <div className="space-y-3">
                <h1 className="max-w-3xl font-serif text-4xl leading-[0.98] tracking-[-0.04em] text-[#171512] sm:text-5xl md:text-6xl">
                  {advisorName} will be ready for you at {shortTime}.
                </h1>
                <p className="max-w-2xl text-[17px] leading-8 text-[#4f463d]">
                  Your appointment for the {appointment.vehicle} is already set aside. We&apos;ll keep the visit
                  clear, quick, and professional from the moment you arrive.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.25rem] border border-white/45 bg-white/55 p-4 backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86694b]">Appointment</p>
                  <p className="mt-2 text-sm leading-6 text-[#29251f]">{dayTime || timeLabel}</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/45 bg-white/55 p-4 backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86694b]">Vehicle</p>
                  <p className="mt-2 text-sm leading-6 text-[#29251f]">{appointment.vehicle}</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/45 bg-white/55 p-4 backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86694b]">Location</p>
                  <p className="mt-2 text-sm leading-6 text-[#29251f]">
                    {appointment.location_name || DEFAULT_LOCATION_NAME}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={confirmed || isSubmitting}
                  className={`min-h-14 rounded-full px-6 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(23,61,51,0.24)] transition hover:translate-y-[-1px] active:scale-[0.99] ${
                    confirmed ? "bg-[#496c5c]" : "bg-[#173d33] hover:bg-[#113328]"
                  }`}
                >
                  {confirmed ? "Confirmed. We will be ready for you." : `Confirm appointment for ${shortTime}`}
                </button>
                {calendarLink ? (
                  <a
                    href={calendarLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#d8c8b3] bg-white/72 px-5 text-sm font-semibold text-[#25231e] transition hover:bg-white"
                  >
                    Add to Calendar
                  </a>
                ) : null}
                <a
                  href={mapsLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#d8c8b3] bg-white/72 px-5 text-sm font-semibold text-[#25231e] transition hover:bg-white"
                >
                  Get Directions
                </a>
              </div>

              {toast ? (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[1.25rem] border border-[#cfe1d6] bg-[#eef6f1] px-4 py-3 text-sm leading-7 text-[#234638]"
                >
                  {toast}
                </motion.p>
              ) : null}
            </div>

            <div className="rounded-[1.8rem] border border-white/40 bg-[#16382d] p-5 text-white shadow-[0_20px_55px_rgba(14,31,25,0.24)] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Your advisor</p>
              <div className="mt-4 flex items-center gap-4">
            {appointment.advisor_photo_url ? (
              <img
                src={appointment.advisor_photo_url}
                alt={advisorName}
                className="h-16 w-16 rounded-[1.15rem] object-cover ring-2 ring-white/15"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.15rem] bg-white/10 text-2xl font-semibold text-white">
                {advisorName.slice(0, 1)}
              </div>
            )}
              <div>
                <p className="text-2xl font-semibold">{advisorName}</p>
                <p className="mt-1 text-sm leading-7 text-white/72">
                  I&apos;ll already have your visit lined up when you get here.
                </p>
              </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Address</p>
                  <p className="mt-1 text-sm leading-6 text-white/82">
                    {appointment.location_address || DEFAULT_LOCATION_ADDRESS}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Visit flow</p>
                  <p className="mt-1 text-sm leading-6 text-white/82">
                    Arrive, review the vehicle, go over the numbers, and get the offer.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {contactPhone ? (
                  <a
                    href={`sms:${contactPhone}`}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/12 bg-white/8 px-4 text-sm font-semibold text-white transition hover:bg-white/14"
                  >
                    Text {advisorName}
                  </a>
                ) : null}
                {contactPhone ? (
                  <a
                    href={`tel:${contactPhone}`}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/12 bg-white/8 px-4 text-sm font-semibold text-white transition hover:bg-white/14"
                  >
                    Call {advisorName}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-[#e3d7c8] bg-white/78 p-6 shadow-[0_18px_42px_rgba(45,35,24,0.07)]">
          <p className="text-[17px] leading-8 text-[#2e2924]">
            You&apos;re coming in for your {appointment.vehicle}.
          </p>
          {dayTime ? <p className="text-[15px] text-[#6a6158]">{dayTime}</p> : null}
        </section>

        <section className="rounded-[1.75rem] border border-[#e3d7c8] bg-white/78 p-6 shadow-[0_18px_42px_rgba(45,35,24,0.07)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6f50]">Arrival</p>
          <h2 className="mt-2 font-serif text-3xl tracking-[-0.03em] text-[#171512]">When you arrive</h2>
          <p className="mt-3 text-sm leading-7 text-[#61564b]">
            Everything below is meant to remove uncertainty before you get here.
          </p>
          <div className="space-y-3">
            {arrivalSteps.map((step, index) => (
              <div
                key={step}
                className="mt-5 flex gap-4 rounded-[1.35rem] border border-[#ece4d8] bg-[#fffdfa] px-5 py-4 shadow-[0_10px_24px_rgba(26,26,26,0.04)]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#173d33] text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <div>
                  <p className="text-[15px] font-semibold leading-7 text-[#2e2924]">
                    {index === 2 ? `Come inside and ask for ${advisorName}` : step}
                  </p>
                  <p className="text-sm leading-6 text-[#6a6158]">
                    {index === 0
                      ? "Your appointment is already reserved, so just head straight in."
                      : index === 1
                        ? "Use the main buying center entrance so we can get started quickly."
                        : "We will take it from there and keep the visit moving."}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {entrancePhotos.length > 0 ? (
            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => setActiveGallery({ images: entrancePhotos, index: 0 })}
                className="block w-full overflow-hidden rounded-[1.5rem] border border-[#eadfce] text-left shadow-[0_10px_28px_rgba(26,26,26,0.06)] transition hover:scale-[1.01] active:scale-[0.995]"
              >
                <img
                  src={entrancePhotos[0]}
                  alt="Building entrance"
                  className="aspect-[16/10] w-full object-cover"
                />
              </button>
              <p className="text-sm text-[#6d6258]">This is where you&apos;ll come in</p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a
              href={mapsLink}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#ddd3c8] bg-white px-4 py-3 text-center text-sm font-semibold text-[#2b2722] transition hover:bg-[#f2ede6] active:scale-[0.98]"
            >
              Get Directions
            </a>
            {entrancePhotos.length > 0 ? (
              <button
                type="button"
                onClick={() => setActiveGallery({ images: entrancePhotos, index: 0 })}
                className="rounded-full border border-[#ddd3c8] bg-white px-4 py-3 text-sm font-semibold text-[#2b2722] transition hover:bg-[#f2ede6] active:scale-[0.98]"
              >
                View Entrance Photo
              </button>
            ) : null}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-[#e3d7c8] bg-white/78 p-6 shadow-[0_18px_42px_rgba(45,35,24,0.07)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6f50]">Visit</p>
          <h2 className="mt-2 font-serif text-3xl tracking-[-0.03em] text-[#171512]">What to expect</h2>
          <p className="mt-3 text-[16px] leading-8 text-[#4d463f]">This usually takes about 30 to 45 minutes.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {expectationSteps.map((step) => (
              <button
                key={step.label}
                type="button"
                onClick={() =>
                  setExpandedExpectation((current) => (current === step.label ? null : step.label))
                }
                className="rounded-[1.35rem] border border-[#ece4d8] bg-[#fffdfa] px-4 py-4 text-left shadow-[0_8px_24px_rgba(26,26,26,0.04)] transition hover:bg-[#fcfaf7] active:scale-[0.99]"
              >
                <p className="text-sm font-semibold text-[#171512]">{step.label}</p>
                <p className="mt-1 text-sm text-[#6b6258]">{step.time}</p>
                <AnimatePresence initial={false}>
                  {expandedExpectation === step.label ? (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 overflow-hidden text-sm leading-6 text-[#60574e]"
                    >
                      {step.detail}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-[#e3d7c8] bg-white/78 p-6 shadow-[0_18px_42px_rgba(45,35,24,0.07)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6f50]">Bring</p>
          <h2 className="mt-2 font-serif text-3xl tracking-[-0.03em] text-[#171512]">What to bring</h2>
          <div className="mt-5 space-y-2">
            {bringItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() =>
                  setExpandedBringItem((current) => (current === item.label ? null : item.label))
                }
                className="w-full rounded-[1.2rem] border border-[#ece4d8] bg-[#fffdfa] px-4 py-3 text-left transition hover:bg-[#fcfaf7] active:scale-[0.99]"
              >
                <p className="text-[16px] leading-8 text-[#2e2924]">{item.label}</p>
                <AnimatePresence initial={false}>
                  {expandedBringItem === item.label ? (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden text-sm leading-6 text-[#60574e]"
                    >
                      {item.detail}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </button>
            ))}
          </div>
        </section>

        {(featuredReviews.length > 0 || appointment.google_reviews_url || appointment.yelp_reviews_url) ? (
          <section className="rounded-[1.75rem] border border-[#e3d7c8] bg-white/78 p-6 shadow-[0_18px_42px_rgba(45,35,24,0.07)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6f50]">Trust</p>
            <h2 className="mt-2 font-serif text-3xl tracking-[-0.03em] text-[#171512]">
              What people say after coming in
            </h2>

            {featuredReviews.length > 0 ? (
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {featuredReviews.map((item) => (
                  <blockquote
                    key={`${item.reviewer_name}-${item.review_text}`}
                    className="rounded-[1.35rem] border border-[#ece2d3] bg-[#fffdfa] p-5 shadow-[0_8px_24px_rgba(26,26,26,0.04)]"
                  >
                    <p className="text-[17px] leading-8 text-[#2e2924]">&ldquo;{item.review_text}&rdquo;</p>
                    <footer className="mt-4 text-sm text-[#766a5f]">
                      - {item.reviewer_name}
                      {item.review_source ? `, ${item.review_source}` : ""}
                    </footer>
                  </blockquote>
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {appointment.google_reviews_url ? (
                <a
                  href={appointment.google_reviews_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[#ddd3c8] bg-white px-4 py-3 text-center text-sm font-semibold text-[#2b2722] transition hover:bg-[#f2ede6] active:scale-[0.98]"
                >
                  View Google Reviews
                </a>
              ) : null}
              {appointment.yelp_reviews_url ? (
                <a
                  href={appointment.yelp_reviews_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[#ddd3c8] bg-white px-4 py-3 text-center text-sm font-semibold text-[#2b2722] transition hover:bg-[#f2ede6] active:scale-[0.98]"
                >
                  View Yelp Reviews
                </a>
              ) : null}
              {extraReviews.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowMoreReviews(true)}
                  className="rounded-full border border-[#ddd3c8] bg-white px-4 py-3 text-sm font-semibold text-[#2b2722] transition hover:bg-[#f2ede6] active:scale-[0.98]"
                >
                  See More Feedback
                </button>
              ) : null}
            </div>

            {trustImages.length > 0 ? (
              <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
                {trustImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setActiveGallery({ images: trustImages, index })}
                    className="h-24 min-w-32 overflow-hidden rounded-[1.15rem] border border-[#ece2d3] shadow-[0_8px_24px_rgba(26,26,26,0.04)]"
                  >
                    <img src={image} alt="Customer visit" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="rounded-[1.65rem] border border-[#e6ddcf] bg-[#f7f3ec] px-6 py-6 text-[#2a2722] shadow-[0_12px_28px_rgba(45,35,24,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6f50]">Support</p>
          <h2 className="mt-2 font-serif text-3xl tracking-[-0.03em] text-[#171512]">Something come up?</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#62574b]">
            If plans changed, send a quick update so we can adjust instead of losing the appointment.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() =>
                handleSupportAction({
                  type: "reschedule_requested_clicked",
                  message: "Hey, something came up — can we move this to a later time?",
                  toastMessage: "We opened a reschedule message so you can shift the appointment quickly."
                })
              }
              disabled={activeSupportAction !== null}
              className="rounded-[1.25rem] border border-[#ddd1c0] bg-white px-4 py-4 text-left transition hover:bg-[#fcf8f3] disabled:opacity-70"
            >
              <p className="text-sm font-semibold text-[#211d18]">Reschedule</p>
              <p className="mt-2 text-sm leading-6 text-[#6b6054]">Ask to move to a later time without losing the visit.</p>
            </button>

            <button
              type="button"
              onClick={() =>
                handleSupportAction({
                  type: "running_late_clicked",
                  message: "Hey, I’m running a few minutes behind but still coming.",
                  toastMessage: "We opened a running-late message so the store gets a heads-up."
                })
              }
              disabled={activeSupportAction !== null}
              className="rounded-[1.25rem] border border-[#ddd1c0] bg-white px-4 py-4 text-left transition hover:bg-[#fcf8f3] disabled:opacity-70"
            >
              <p className="text-sm font-semibold text-[#211d18]">Running Late</p>
              <p className="mt-2 text-sm leading-6 text-[#6b6054]">Let us know you are still coming, just delayed.</p>
            </button>

            <button
              type="button"
              onClick={() =>
                handleSupportAction({
                  type: "cant_make_it_clicked",
                  message: "Hey, I won’t be able to make it today. Can we reschedule?",
                  toastMessage: "We opened a message so you can reschedule instead of disappearing."
                })
              }
              disabled={activeSupportAction !== null}
              className="rounded-[1.25rem] border border-[#ddd1c0] bg-white px-4 py-4 text-left transition hover:bg-[#fcf8f3] disabled:opacity-70"
            >
              <p className="text-sm font-semibold text-[#211d18]">Can&apos;t Make It</p>
              <p className="mt-2 text-sm leading-6 text-[#6b6054]">Send a quick note now and recover the appointment.</p>
            </button>
          </div>
        </section>

        <section className="rounded-[1.85rem] border border-[#ddd0bf] bg-[#173d33] px-6 py-7 text-center text-white shadow-[0_24px_55px_rgba(18,44,36,0.28)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Final confirmation</p>
          <h2 className="mt-3 font-serif text-3xl tracking-[-0.03em] text-white sm:text-4xl">
            We have time set aside specifically for you.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-[17px] leading-8 text-white/74">
            Confirming now helps us keep the appointment moving the moment you arrive.
          </p>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmed || isSubmitting}
            className={`mt-6 w-full rounded-full px-5 py-4 text-base font-semibold transition active:scale-[0.99] ${
              confirmed ? "bg-[#dce9e1] text-[#1f4538]" : "bg-white text-[#173d33] hover:bg-[#f2ece2]"
            }`}
          >
            {confirmed ? "Confirmed. We will be ready for you." : `Yes, I will be there at ${shortTime}`}
          </button>
        </section>
      </div>

      <AnimatePresence>
        {activeGallery ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4"
            onClick={() => setActiveGallery(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="w-full max-w-3xl rounded-[24px] bg-[#f4ede0] p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <img
                src={activeGallery.images[activeGallery.index]}
                alt="Appointment reference"
                className="aspect-[16/10] w-full rounded-[18px] object-cover"
              />
              {activeGallery.images.length > 1 ? (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveGallery((current) =>
                        current
                          ? {
                              ...current,
                              index: (current.index - 1 + current.images.length) % current.images.length
                            }
                          : current
                      )
                    }
                    className="rounded-[16px] border border-[#d8cdbc] bg-white/70 px-4 py-2 text-sm font-medium text-[#2b2722]"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveGallery((current) =>
                        current ? { ...current, index: (current.index + 1) % current.images.length } : current
                      )
                    }
                    className="rounded-[16px] border border-[#d8cdbc] bg-white/70 px-4 py-2 text-sm font-medium text-[#2b2722]"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showMoreReviews ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/45"
            onClick={() => setShowMoreReviews(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 24, stiffness: 220 }}
              className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-[#f4ede0] px-5 pb-10 pt-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto max-w-[640px] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-[#171512]">More seller feedback</h3>
                  <button
                    type="button"
                    onClick={() => setShowMoreReviews(false)}
                    className="text-sm font-medium text-[#5a534a]"
                  >
                    Close
                  </button>
                </div>
                {extraReviews.map((item) => (
                  <blockquote key={`${item.reviewer_name}-${item.review_text}`} className="space-y-2">
                    <p className="text-[16px] leading-8 text-[#2e2924]">&ldquo;{item.review_text}&rdquo;</p>
                    <footer className="text-sm text-[#766a5f]">
                      - {item.reviewer_name}
                      {item.review_source ? `, ${item.review_source}` : ""}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
