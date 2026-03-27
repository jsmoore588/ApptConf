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
  { label: "Walkaround", time: "~15 min" },
  { label: "Market review", time: "~10 min" },
  { label: "Offer", time: "~10-15 min" }
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

export function AppointmentPage({ appointment }: Props) {
  const [confirmed, setConfirmed] = useState(Boolean(appointment.confirmed));
  const [toast, setToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [showMoreReviews, setShowMoreReviews] = useState(false);

  const advisorName = appointment.advisor_name || appointment.advisor || "Jude";
  const timeLabel = appointment.appointment_at ? formatAppointmentDate(appointment.appointment_at) : appointment.time;
  const shortTime = appointment.time || timeLabel;
  const entrancePhotos = appointment.entrance_photo_urls ?? [];
  const reviews = appointment.featured_reviews ?? [];
  const featuredReviews = reviews.slice(0, 3);
  const extraReviews = reviews.slice(3);
  const calendarLink = useMemo(() => createGoogleCalendarLink(appointment, timeLabel), [appointment, timeLabel]);

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

  return (
    <main className="min-h-screen bg-[#f4ede0] px-5 py-8 text-[#171512]">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-8">
        <section className="space-y-4 pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8c8173]">
            Appointment Set
          </p>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold leading-[1.02] tracking-[-0.03em] text-[#171512] md:text-5xl">
              {advisorName} - you&apos;re all set for {shortTime}
            </h1>
            <p className="max-w-[34rem] text-[17px] leading-8 text-[#4e4740]">
              I&apos;ve got everything ready for your {appointment.vehicle} so this is quick when you get here.
            </p>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-center gap-4">
            {appointment.advisor_photo_url ? (
              <img
                src={appointment.advisor_photo_url}
                alt={advisorName}
                className="h-14 w-14 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ddd0bf] text-lg font-semibold text-[#171512]">
                {advisorName.slice(0, 1)}
              </div>
            )}
            <div>
              <p className="text-lg font-semibold text-[#171512]">{advisorName}</p>
              <p className="text-sm leading-7 text-[#5b534a]">I&apos;ll be ready for you when you get here.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {appointment.advisor_phone ? (
              <a
                href={`sms:${appointment.advisor_phone}`}
                className="rounded-[18px] border border-[#d8cdbc] bg-white/55 px-4 py-3 text-center text-sm font-medium text-[#2b2722] transition hover:bg-white/75"
              >
                Text Advisor
              </a>
            ) : null}
            {appointment.advisor_phone ? (
              <a
                href={`tel:${appointment.advisor_phone}`}
                className="rounded-[18px] border border-[#d8cdbc] bg-white/55 px-4 py-3 text-center text-sm font-medium text-[#2b2722] transition hover:bg-white/75"
              >
                Call Advisor
              </a>
            ) : null}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirmed || isSubmitting}
              className={`rounded-[18px] px-5 py-3 text-sm font-semibold text-white transition ${
                confirmed ? "bg-[#3f6b58]" : "bg-[#234638] hover:bg-[#1d3b2f]"
              }`}
            >
              {confirmed ? `Confirmed for ${shortTime}` : "Confirm I'm Coming"}
            </button>
          </div>

          {toast ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm leading-7 text-[#234638]"
            >
              {toast}
            </motion.p>
          ) : null}
        </section>

        <section>
          <p className="text-[17px] leading-8 text-[#2e2924]">
            You&apos;re coming in for your {appointment.vehicle}.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#171512]">When you arrive</h2>
          <div className="space-y-3">
            {arrivalSteps.map((step, index) => (
              <div key={step} className="rounded-[18px] bg-white/55 px-5 py-4">
                <p className="text-[15px] leading-7 text-[#2e2924]">
                  {index + 1}. {index === 2 ? `Come inside and ask for ${advisorName}` : step}
                </p>
              </div>
            ))}
          </div>

          {entrancePhotos.length > 0 ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setActivePhotoIndex(0)}
                className="block w-full overflow-hidden rounded-[20px] text-left shadow-sm transition hover:scale-[1.01]"
              >
                <img
                  src={entrancePhotos[0]}
                  alt="Building entrance"
                  className="aspect-[16/10] w-full object-cover"
                />
              </button>
              <p className="text-sm text-[#6d6258]">This is where you&apos;ll come in.</p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            {appointment.google_maps_url ? (
              <a
                href={appointment.google_maps_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-[18px] border border-[#d8cdbc] bg-white/55 px-4 py-3 text-center text-sm font-medium text-[#2b2722] transition hover:bg-white/75"
              >
                Open in Google Maps
              </a>
            ) : null}
            {entrancePhotos.length > 0 ? (
              <button
                type="button"
                onClick={() => setActivePhotoIndex(0)}
                className="rounded-[18px] border border-[#d8cdbc] bg-white/55 px-4 py-3 text-sm font-medium text-[#2b2722] transition hover:bg-white/75"
              >
                View Entrance Photo
              </button>
            ) : null}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#171512]">What to expect</h2>
          <p className="text-[16px] leading-8 text-[#4d463f]">This usually takes about 30-45 minutes.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {expectationSteps.map((step) => (
              <div key={step.label} className="rounded-[18px] bg-white/55 px-4 py-4">
                <p className="text-sm font-semibold text-[#171512]">{step.label}</p>
                <p className="mt-1 text-sm text-[#6b6258]">{step.time}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#171512]">What to bring</h2>
          <ul className="space-y-2 text-[16px] leading-8 text-[#2e2924]">
            <li>Title (if you have it)</li>
            <li>Payoff info (if applicable)</li>
            <li>Keys</li>
          </ul>
        </section>

        {(featuredReviews.length > 0 || appointment.google_reviews_url || appointment.yelp_reviews_url) ? (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#171512]">
              What people say after coming in
            </h2>

            {featuredReviews.length > 0 ? (
              <div className="space-y-4">
                {featuredReviews.map((item) => (
                  <blockquote key={`${item.reviewer_name}-${item.review_text}`} className="space-y-2">
                    <p className="text-[17px] leading-8 text-[#2e2924]">&ldquo;{item.review_text}&rdquo;</p>
                    <footer className="text-sm text-[#766a5f]">
                      - {item.reviewer_name}
                      {item.review_source ? `, ${item.review_source}` : ""}
                    </footer>
                  </blockquote>
                ))}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {appointment.google_reviews_url ? (
                <a
                  href={appointment.google_reviews_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[18px] border border-[#d8cdbc] bg-white/55 px-4 py-3 text-center text-sm font-medium text-[#2b2722] transition hover:bg-white/75"
                >
                  View Google Reviews
                </a>
              ) : null}
              {appointment.yelp_reviews_url ? (
                <a
                  href={appointment.yelp_reviews_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[18px] border border-[#d8cdbc] bg-white/55 px-4 py-3 text-center text-sm font-medium text-[#2b2722] transition hover:bg-white/75"
                >
                  View Yelp Reviews
                </a>
              ) : null}
              {extraReviews.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowMoreReviews(true)}
                  className="rounded-[18px] border border-[#d8cdbc] bg-white/55 px-4 py-3 text-sm font-medium text-[#2b2722] transition hover:bg-white/75"
                >
                  See More Seller Feedback
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="space-y-5 pb-4 text-center">
          <p className="text-[17px] leading-8 text-[#2e2924]">We&apos;ve set aside time specifically for you.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirmed || isSubmitting}
              className={`w-full rounded-[18px] px-5 py-4 text-base font-semibold text-white transition ${
                confirmed ? "bg-[#3f6b58]" : "bg-[#234638] hover:bg-[#1d3b2f]"
              }`}
            >
              {confirmed ? "I'm Coming" : "I'm Coming"}
            </button>
            {calendarLink ? (
              <a
                href={calendarLink}
                target="_blank"
                rel="noreferrer"
                className="w-full rounded-[18px] border border-[#d8cdbc] bg-white/55 px-5 py-4 text-base font-medium text-[#2b2722] transition hover:bg-white/75"
              >
                Add to Calendar
              </a>
            ) : null}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {activePhotoIndex !== null ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4"
            onClick={() => setActivePhotoIndex(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="w-full max-w-3xl rounded-[24px] bg-[#f4ede0] p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <img
                src={entrancePhotos[activePhotoIndex]}
                alt="Entrance"
                className="aspect-[16/10] w-full rounded-[18px] object-cover"
              />
              {entrancePhotos.length > 1 ? (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setActivePhotoIndex((activePhotoIndex - 1 + entrancePhotos.length) % entrancePhotos.length)
                    }
                    className="rounded-[16px] border border-[#d8cdbc] bg-white/70 px-4 py-2 text-sm font-medium text-[#2b2722]"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePhotoIndex((activePhotoIndex + 1) % entrancePhotos.length)}
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
