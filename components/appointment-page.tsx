"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Appointment } from "@/lib/types";
import { formatAppointmentDate } from "@/lib/datetime";

type Props = {
  appointment: Appointment;
};

const arrivalSteps = [
  "Pull into the front lot",
  "Park near the buying center entrance"
];

const expectationSteps = [
  { label: "Walkaround", time: "~15 min" },
  { label: "Market review", time: "~10 min" },
  { label: "Offer", time: "~10-15 min" }
];

const testimonials = [
  { quote: "Way easier than dealing with people online.", name: "Mark" },
  { quote: "They showed me real numbers.", name: "Ashley" },
  { quote: "In and out. Super simple.", name: "Daniel" }
];

export function AppointmentPage({ appointment }: Props) {
  const [confirmed, setConfirmed] = useState(Boolean(appointment.confirmed));
  const [toast, setToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const advisorName = appointment.advisor || "Jude";
  const timeLabel = appointment.scheduled_at ? formatAppointmentDate(appointment.scheduled_at) : appointment.time;
  const shortTime = appointment.time || timeLabel;

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
    <main className="min-h-screen bg-[#f3ecdf] px-5 py-8 text-[#171512]">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-8">
        <section className="space-y-4 pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8b7f70]">
            Appointment Set
          </p>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold leading-[1.02] tracking-[-0.03em] text-[#171512] md:text-5xl">
              {advisorName} - you&apos;re all set for {shortTime}
            </h1>
            <p className="max-w-[34rem] text-[17px] leading-8 text-[#4d463f]">
              I&apos;ve got everything ready for your {appointment.vehicle} so this is quick when you get here.
            </p>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ddd0bf] text-lg font-semibold text-[#171512]">
              {advisorName.slice(0, 1)}
            </div>
            <div>
              <p className="text-lg font-semibold text-[#171512]">{advisorName}</p>
              <p className="text-sm leading-7 text-[#5b534a]">I&apos;ll be ready for you when you get here.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmed || isSubmitting}
            className="w-full rounded-[18px] bg-[#234638] px-5 py-4 text-base font-semibold text-white transition hover:bg-[#1d3b2f] disabled:cursor-not-allowed disabled:bg-[#71887d]"
          >
            {confirmed ? `I'll be there at ${shortTime}` : `I'll be there at ${shortTime}`}
          </button>

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
                  {index + 1}. {step}
                </p>
              </div>
            ))}
            <div className="rounded-[18px] bg-white/55 px-5 py-4">
              <p className="text-[15px] leading-7 text-[#2e2924]">
                3. Come inside and ask for {advisorName}
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-[20px]">
            <div className="aspect-[16/10] w-full bg-[linear-gradient(145deg,#ccb89c,#ede3d4_55%,#d8c4aa)]" />
          </div>
          <p className="text-sm text-[#6d6258]">This is where you&apos;ll come in.</p>
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

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#171512]">
            What people say after coming in
          </h2>
          <div className="space-y-4">
            {testimonials.map((item) => (
              <blockquote key={item.name} className="space-y-2">
                <p className="text-[17px] leading-8 text-[#2e2924]">&ldquo;{item.quote}&rdquo;</p>
                <footer className="text-sm text-[#766a5f]">- {item.name}</footer>
              </blockquote>
            ))}
          </div>
        </section>

        <section className="space-y-5 pb-4 text-center">
          <p className="text-[17px] leading-8 text-[#2e2924]">We&apos;ve set aside time specifically for you.</p>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmed || isSubmitting}
            className="w-full rounded-[18px] bg-[#234638] px-5 py-4 text-base font-semibold text-white transition hover:bg-[#1d3b2f] disabled:cursor-not-allowed disabled:bg-[#71887d]"
          >
            {confirmed ? "I'll be there" : "I'll be there"}
          </button>
        </section>
      </div>
    </main>
  );
}
