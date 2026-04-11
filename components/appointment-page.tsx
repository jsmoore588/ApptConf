"use client";

import { ChangeEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import { Appointment } from "@/lib/types";
import { formatAppointmentDate } from "@/lib/datetime";
import { DEFAULT_LOCATION_ADDRESS, DEFAULT_LOCATION_NAME } from "@/lib/constants";

type Props = { appointment: Appointment };
type SectionId = "top" | "arrival" | "visit" | "bring" | "reviews" | "help";

const displayFont = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"] });
const bodyFont = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

const visitSteps = [
  ["Walkaround", "~15 min", "A quick look over the vehicle and overall condition."],
  ["Market review", "~10 min", "A straightforward review of current market numbers."],
  ["Offer", "~10-15 min", "A clear offer and next steps if you want to move forward."]
] as const;

const bringItems = [
  ["Title (if you have it)", "Helpful, but not required for every visit."],
  ["Payoff info (if applicable)", "Useful if there is still money owed on the vehicle."],
  ["Keys", "Bring every key you have."]
] as const;

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || value;
}

function toGoogleDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatShortTime(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function calendarLink(appointment: Appointment, label: string) {
  if (!appointment.appointment_at) return null;
  const start = new Date(appointment.appointment_at);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  const location = appointment.location_address || appointment.location_name || `${DEFAULT_LOCATION_NAME}, ${DEFAULT_LOCATION_ADDRESS}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    `Appointment to Sell ${appointment.vehicle}`
  )}&dates=${toGoogleDate(start)}/${toGoogleDate(end)}&details=${encodeURIComponent(
    `Vehicle: ${appointment.vehicle}\nTime: ${label}\nAdvisor: ${appointment.advisor_name || appointment.advisor}`
  )}&location=${encodeURIComponent(location)}`;
}

function SafeImage({ src, alt, className, fallback }: { src?: string; alt: string; className: string; fallback?: ReactNode }) {
  const [failed, setFailed] = useState(!src);
  if (!src || failed) return fallback ?? null;
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

function CarouselImage({ src, alt, onClick }: { src: string; alt: string; onClick: () => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <button type="button" onClick={onClick} className="h-24 min-w-32 overflow-hidden rounded-[18px] border border-[#e4d9ca] bg-white shadow-sm">
      <img src={src} alt={alt} className="h-full w-full object-cover" onError={() => setFailed(true)} />
    </button>
  );
}

export function AppointmentPage({ appointment }: Props) {
  const [confirmed, setConfirmed] = useState(Boolean(appointment.confirmed));
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [supportBusy, setSupportBusy] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [gallery, setGallery] = useState<{ images: string[]; index: number } | null>(null);
  const [moreReviewsOpen, setMoreReviewsOpen] = useState(false);
  const [expandedBring, setExpandedBring] = useState<string | null>(null);
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("top");
  const [navCondensed, setNavCondensed] = useState(false);
  const [bankName, setBankName] = useState(appointment.payoff_lender_name || "");
  const [payoffPhotos, setPayoffPhotos] = useState(appointment.payoff_photo_urls ?? []);
  const [payoffBusy, setPayoffBusy] = useState(false);
  const lastY = useRef(0);

  const advisorName = appointment.advisor_name || appointment.advisor || "Jude";
  const advisorFirstName = firstName(advisorName);
  const customerFirstName = firstName(appointment.name);
  const timeLabel = appointment.appointment_at ? formatAppointmentDate(appointment.appointment_at) : appointment.time;
  const shortTime = formatShortTime(appointment.appointment_at) || appointment.time || timeLabel;
  const entrancePhotos = appointment.entrance_photo_urls ?? [];
  const reviews = appointment.featured_reviews ?? [];
  const featuredReviews = reviews.slice(0, 2);
  const extraReviews = reviews.slice(2);
  const trustImages = [...(appointment.review_photo_urls ?? []), ...(appointment.customer_delivery_photo_urls ?? []), ...(appointment.check_handoff_photo_urls ?? [])].slice(0, 4);
  const calLink = useMemo(() => calendarLink(appointment, timeLabel), [appointment, timeLabel]);
  const phone = appointment.advisor_phone;
  const mapsLink = appointment.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appointment.location_address || DEFAULT_LOCATION_ADDRESS)}`;
  const hasReviews = featuredReviews.length > 0 || Boolean(appointment.google_reviews_url) || trustImages.length > 0;
  const navItems = [
    ["top", "Top"],
    ["arrival", "Arrival"],
    ["visit", "Visit"],
    ["bring", "Bring"],
    ...(hasReviews ? [["reviews", "Reviews"]] : []),
    ["help", "Help"]
  ] as Array<[SectionId, string]>;

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(visible.target.id as SectionId);
      },
      { rootMargin: "-24% 0px -58% 0px", threshold: [0.08, 0.25, 0.45] }
    );
    (["top", "arrival", "visit", "bring", "reviews", "help"] as SectionId[])
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .forEach((element) => observer.observe(element as Element));
    return () => observer.disconnect();
  }, [hasReviews]);

  useEffect(() => {
    function onScroll() {
      const next = window.scrollY;
      setNavCondensed(next > lastY.current && next > 180);
      lastY.current = next;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function confirmAppointment() {
    setBusy(true);
    try {
      const response = await fetch(`/api/appointments/${appointment.id}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "confirm_clicked" })
      });
      if (!response.ok) throw new Error("Unable to confirm");
      setConfirmed(true);
      setToast(`Confirmed for ${shortTime}.`);
    } catch {
      setToast("If anything changes, use the update options below and we will adjust.");
    } finally {
      setBusy(false);
    }
  }

  async function support(type: "running_late_clicked" | "reschedule_requested_clicked" | "cant_make_it_clicked", message: string) {
    setSupportBusy(true);
    try {
      await fetch(`/api/appointments/${appointment.id}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      });
    } finally {
      setSupportBusy(false);
    }
    setToast("A quick update is ready.");
    if (phone) window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
  }

  async function savePayoff(files?: FileList | null) {
    if (!files?.length && !bankName.trim()) {
      setToast("Add the bank name or choose a payoff screenshot first.");
      return;
    }
    setPayoffBusy(true);
    try {
      const formData = new FormData();
      formData.append("bankName", bankName.trim());
      Array.from(files || []).forEach((file) => formData.append("files", file));
      const response = await fetch(`/api/appointments/${appointment.id}/payoff`, { method: "POST", body: formData });
      const payload = (await response.json()) as { appointment?: { payoff_photo_urls?: string[]; payoff_lender_name?: string }; error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to save payoff information.");
      setBankName(payload.appointment?.payoff_lender_name || bankName.trim());
      setPayoffPhotos(payload.appointment?.payoff_photo_urls || []);
      setToast("Payoff information saved.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to save payoff information.");
    } finally {
      setPayoffBusy(false);
    }
  }

  async function uploadPayoff(event: ChangeEvent<HTMLInputElement>) {
    await savePayoff(event.target.files);
    event.target.value = "";
  }

  return (
    <main className={`${bodyFont.className} min-h-screen bg-[linear-gradient(180deg,#f8f3ea_0%,#f2eadf_48%,#ebe1d3_100%)] px-4 pb-32 pt-5 text-[#1c1915] sm:px-6 sm:pt-8`}>
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <section id="top" className="scroll-mt-6 rounded-[28px] border border-[#e1d5c6] bg-white/72 p-6 shadow-[0_22px_55px_rgba(45,35,24,0.09)] backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#826548]">Appointment Set</p>
          <h1 className={`${displayFont.className} mt-3 text-4xl leading-[0.95] tracking-[-0.045em] text-[#171512] sm:text-5xl`}>{customerFirstName} - you&apos;re all set for {shortTime}</h1>
          <p className="mt-4 text-base leading-7 text-[#5c5248]">Selling your {appointment.vehicle}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {calLink ? <ActionLink href={calLink} label="Add to Calendar" external /> : null}
            <ActionLink href={mapsLink} label="Get Directions" external />
            {phone ? <button type="button" onClick={() => setContactOpen(true)} className="rounded-full border border-[#d8cdbc] bg-[#fbf8f2] px-4 py-3 text-sm font-semibold text-[#25211d]">Contact</button> : null}
          </div>
        </section>

        <section className="rounded-[28px] bg-[#173d33] p-5 text-white shadow-[0_24px_60px_rgba(18,44,36,0.22)]">
          <div className="flex items-center gap-4">
            <SafeImage src={appointment.advisor_photo_url} alt={advisorName} className="h-16 w-16 rounded-[20px] object-cover ring-2 ring-white/15" fallback={<div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-white/10 text-2xl font-semibold">{advisorName.slice(0, 1)}</div>} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Your advisor</p>
              <h2 className="mt-1 text-2xl font-semibold">{advisorName}</h2>
              <p className="mt-1 text-sm leading-6 text-white/72">I&apos;ll have everything ready when you get here.</p>
            </div>
          </div>
          <button type="button" onClick={confirmAppointment} disabled={confirmed || busy} className={`mt-5 w-full rounded-full px-5 py-4 text-sm font-semibold transition active:scale-[0.99] ${confirmed ? "bg-[#dce9e1] text-[#1f4538]" : "bg-white text-[#173d33] hover:bg-[#f2ece2]"}`}>{confirmed ? "Confirmed" : `I'll be there at ${shortTime}`}</button>
          {toast ? <p className="mt-3 rounded-[18px] bg-white/8 px-4 py-3 text-sm leading-6 text-white/78">{toast}</p> : null}
        </section>

        <section id="arrival" className="scroll-mt-6 space-y-4 rounded-[28px] border border-[#e1d5c6] bg-white/72 p-6 shadow-[0_18px_45px_rgba(45,35,24,0.07)]">
          <SectionTitle title="When you arrive" />
          <ol className="space-y-3">{["Pull into the front lot", "Park near the buying center entrance", `Come inside and ask for ${advisorFirstName}`].map((step, index) => <li key={step} className="flex items-center gap-3 text-[15px] text-[#332d27]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#173d33] text-sm font-semibold text-white">{index + 1}</span>{step}</li>)}</ol>
          {entrancePhotos.length > 0 ? <ImageBlock image={entrancePhotos[0]} caption="This is where you'll come in" onClick={() => setGallery({ images: entrancePhotos, index: 0 })} /> : null}
          <ActionLink href={mapsLink} label="Get Directions" external />
        </section>

        <section id="visit" className="scroll-mt-6 rounded-[28px] border border-[#e1d5c6] bg-white/72 p-6 shadow-[0_18px_45px_rgba(45,35,24,0.07)]">
          <SectionTitle title="What to expect" />
          <p className="mt-2 text-sm leading-7 text-[#62584f]">Most visits take about 30-45 minutes.</p>
          <div className="mt-5 space-y-3">{visitSteps.map(([label, time, detail]) => <CompactDisclosure key={label} label={label} side={time} detail={detail} active={expandedVisit === label} onClick={() => setExpandedVisit((current) => current === label ? null : label)} />)}</div>
        </section>

        <section id="bring" className="scroll-mt-6 rounded-[28px] border border-[#e1d5c6] bg-white/72 p-6 shadow-[0_18px_45px_rgba(45,35,24,0.07)]">
          <SectionTitle title="What to bring" />
          <div className="mt-5 space-y-2">{bringItems.map(([label, detail]) => <BringRow key={label} label={label} detail={detail} expanded={expandedBring === label} onClick={() => setExpandedBring((current) => current === label ? null : label)}>{label === "Payoff info (if applicable)" ? <PayoffBox bankName={bankName} setBankName={setBankName} payoffBusy={payoffBusy} payoffPhotos={payoffPhotos} savePayoff={savePayoff} uploadPayoff={uploadPayoff} openGallery={(index) => setGallery({ images: payoffPhotos, index })} /> : null}</BringRow>)}</div>
        </section>

        {hasReviews ? <section id="reviews" className="scroll-mt-6 rounded-[28px] border border-[#e1d5c6] bg-white/72 p-6 shadow-[0_18px_45px_rgba(45,35,24,0.07)]"><SectionTitle title="What people say" /><div className="mt-5 space-y-4">{featuredReviews.map((item) => <blockquote key={`${item.reviewer_name}-${item.review_text}`} className="rounded-[20px] border border-[#e7ded2] bg-[#fffdf9] p-4"><p className="text-[15px] leading-7 text-[#2e2924]">&ldquo;{item.review_text}&rdquo;</p><footer className="mt-3 text-sm text-[#766a5f]">- {item.reviewer_name}</footer></blockquote>)}</div>{trustImages.length > 0 ? <div className="mt-5 flex gap-3 overflow-x-auto pb-2">{trustImages.map((image, index) => <CarouselImage key={`${image}-${index}`} src={image} alt="Customer visit" onClick={() => setGallery({ images: trustImages, index })} />)}</div> : null}<div className="mt-5 flex flex-wrap gap-3">{appointment.google_reviews_url ? <ActionLink href={appointment.google_reviews_url} label="View Google Reviews" external /> : null}{extraReviews.length > 0 ? <button type="button" onClick={() => setMoreReviewsOpen(true)} className="rounded-full border border-[#d8cdbc] bg-[#fbf8f2] px-4 py-3 text-sm font-semibold text-[#25211d]">More reviews</button> : null}</div></section> : null}

        <section id="help" className="scroll-mt-6 rounded-[28px] border border-[#e1d5c6] bg-[#f7f2ea] p-6 shadow-[0_18px_45px_rgba(45,35,24,0.06)]">
          <SectionTitle title="Something come up?" /><p className="mt-2 text-sm leading-7 text-[#62584f]">If plans changed, send a quick update so we can adjust.</p>
          <div className="mt-5 grid gap-3"><SupportButton label="Reschedule" disabled={supportBusy} onClick={() => support("reschedule_requested_clicked", "Hey, something came up - can we move this to a later time?")} /><SupportButton label="Running Late" disabled={supportBusy} onClick={() => support("running_late_clicked", "Hey, I'm running a few minutes behind but still coming.")} /><SupportButton label="Can't Make It" disabled={supportBusy} onClick={() => support("cant_make_it_clicked", "Hey, I won't be able to make it today. Can we reschedule?")} /></div>
        </section>

        <section className="rounded-[28px] bg-[#173d33] px-6 py-7 text-center text-white shadow-[0_24px_55px_rgba(18,44,36,0.24)]"><p className="text-base leading-7 text-white/78">We&apos;ve set aside time specifically for you.</p><button type="button" onClick={confirmAppointment} disabled={confirmed || busy} className={`mt-5 w-full rounded-full px-5 py-4 text-base font-semibold transition active:scale-[0.99] ${confirmed ? "bg-[#dce9e1] text-[#1f4538]" : "bg-white text-[#173d33] hover:bg-[#f2ece2]"}`}>{confirmed ? "Confirmed" : `Yes, I'll be there at ${shortTime}`}</button></section>
      </div>

      <SectionNavigator items={navItems} activeSection={activeSection} condensed={navCondensed} onSelect={(id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })} />
      {contactOpen ? <ContactSheet advisorName={advisorName} phone={phone} onClose={() => setContactOpen(false)} /> : null}
      {gallery ? <Lightbox images={gallery.images} index={gallery.index} onClose={() => setGallery(null)} onChange={(index) => setGallery((current) => current ? { ...current, index } : current)} /> : null}
      {moreReviewsOpen ? <ReviewDrawer reviews={extraReviews} onClose={() => setMoreReviewsOpen(false)} /> : null}
    </main>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className={`${displayFont.className} text-3xl tracking-[-0.035em] text-[#171512]`}>{title}</h2>;
}

function ActionLink({ href, label, external = false }: { href: string; label: string; external?: boolean }) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="inline-flex rounded-full border border-[#d8cdbc] bg-[#fbf8f2] px-4 py-3 text-sm font-semibold text-[#25211d]"
    >
      {label}
    </a>
  );
}

function ImageBlock({ image, caption, onClick }: { image: string; caption: string; onClick: () => void }) {
  return (
    <div className="space-y-3">
      <button type="button" onClick={onClick} className="block w-full overflow-hidden rounded-[22px] border border-[#e3d8c9] bg-[#efe6d9]">
        <SafeImage src={image} alt={caption} className="aspect-[16/10] w-full object-cover" fallback={<div className="aspect-[16/10] w-full bg-[#efe6d9]" />} />
      </button>
      <p className="text-sm text-[#71675d]">{caption}</p>
    </div>
  );
}

function CompactDisclosure({
  label,
  side,
  detail,
  active,
  onClick
}: {
  label: string;
  side: string;
  detail: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-[20px] border border-[#e7ded2] bg-[#fffdf9] px-4 py-4 text-left">
      <div className="flex items-center justify-between gap-4">
        <p className="font-semibold text-[#211d18]">{label}</p>
        <p className="text-sm text-[#71675d]">{side}</p>
      </div>
      {active ? <p className="mt-3 text-sm leading-6 text-[#62584f]">{detail}</p> : null}
    </button>
  );
}

function BringRow({
  label,
  detail,
  expanded,
  onClick,
  children
}: {
  label: string;
  detail: string;
  expanded: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-[#e7ded2] bg-[#fffdf9] px-4 py-3">
      <button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-4 text-left">
        <span className="text-[15px] font-medium text-[#2e2924]">{label}</span>
        <span className="text-sm text-[#7b7065]">{expanded ? "Close" : "Info"}</span>
      </button>
      {expanded ? (
        <div className="mt-3">
          <p className="text-sm leading-6 text-[#62584f]">{detail}</p>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function PayoffBox({
  bankName,
  setBankName,
  payoffBusy,
  payoffPhotos,
  savePayoff,
  uploadPayoff,
  openGallery
}: {
  bankName: string;
  setBankName: (value: string) => void;
  payoffBusy: boolean;
  payoffPhotos: string[];
  savePayoff: (files?: FileList | null) => Promise<void>;
  uploadPayoff: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  openGallery: (index: number) => void;
}) {
  return (
    <div className="mt-4 rounded-[18px] border border-[#e4d9ca] bg-[#f8f3ec] p-4">
      <p className="text-sm font-semibold text-[#201b16]">10-day payoff</p>
      <div className="mt-4 grid gap-3">
        <input
          type="text"
          value={bankName}
          onChange={(event) => setBankName(event.target.value)}
          placeholder="Bank or lender name"
          className="w-full rounded-[16px] border border-[#d8cdbc] bg-white px-4 py-3 text-sm text-[#1f1a16]"
        />
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={payoffBusy}
          onChange={uploadPayoff}
          className="block w-full rounded-[16px] border border-[#d8cdbc] bg-white px-4 py-3 text-sm text-[#1f1a16]"
        />
        <button
          type="button"
          disabled={payoffBusy}
          onClick={() => savePayoff(null)}
          className="w-full rounded-full border border-[#d8cdbc] bg-white px-4 py-3 text-sm font-semibold text-[#1f1a16] disabled:opacity-70"
        >
          {payoffBusy ? "Saving..." : "Save payoff info"}
        </button>
      </div>
      {payoffPhotos.length > 0 ? (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {payoffPhotos.map((image, index) => (
            <CarouselImage key={`${image}-${index}`} src={image} alt="Payoff document" onClick={() => openGallery(index)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SupportButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-[20px] border border-[#ded4c6] bg-white px-4 py-4 text-left text-sm font-semibold text-[#211d18] transition hover:bg-[#fcf8f3] disabled:opacity-70"
    >
      {label}
    </button>
  );
}

function SectionNavigator({
  items,
  activeSection,
  condensed,
  onSelect
}: {
  items: Array<[SectionId, string]>;
  activeSection: SectionId;
  condensed: boolean;
  onSelect: (id: SectionId) => void;
}) {
  return (
    <nav
      aria-label="Section navigation"
      className={`fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[680px] px-3 transition-transform duration-300 ${condensed ? "translate-y-2" : "translate-y-0"}`}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
    >
      <div className="overflow-x-auto rounded-full border border-[#ded4c6] bg-[#fffaf2]/92 p-2 shadow-[0_14px_38px_rgba(37,28,18,0.18)] backdrop-blur">
        <div className="flex min-w-max gap-2">
          {items.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${activeSection === id ? "bg-[#173d33] text-white" : "text-[#5d5348] hover:bg-[#efe6da]"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

function ContactSheet({ advisorName, phone, onClose }: { advisorName: string; phone?: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 px-4 pb-4 sm:items-center sm:justify-center" onClick={onClose}>
      <div className="w-full max-w-sm rounded-[28px] bg-[#f8f3ea] p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-xl font-semibold text-[#171512]">Contact {advisorName}</h3>
        <div className="mt-5 grid gap-3">
          {phone ? (
            <>
              <a href={`tel:${phone}`} className="rounded-full bg-[#173d33] px-5 py-4 text-center text-sm font-semibold text-white">Call Advisor</a>
              <a href={`sms:${phone}`} className="rounded-full border border-[#d8cdbc] bg-white px-5 py-4 text-center text-sm font-semibold text-[#25211d]">Text Advisor</a>
            </>
          ) : (
            <p className="text-sm text-[#62584f]">Contact details are not available for this appointment.</p>
          )}
          <button type="button" onClick={onClose} className="rounded-full px-5 py-3 text-sm font-semibold text-[#62584f]">Close</button>
        </div>
      </div>
    </div>
  );
}

function Lightbox({
  images,
  index,
  onClose,
  onChange
}: {
  images: string[];
  index: number;
  onClose: () => void;
  onChange: (index: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-[24px] bg-[#f4ede0] p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <SafeImage
          src={images[index]}
          alt="Appointment reference"
          className="max-h-[78vh] w-full rounded-[18px] object-contain"
          fallback={<div className="flex min-h-[280px] w-full items-center justify-center rounded-[18px] bg-[#efe6d9] text-sm text-[#6c6258]">Image unavailable</div>}
        />
        <div className="mt-4 flex items-center justify-between gap-3">
          {images.length > 1 ? <button type="button" onClick={() => onChange((index - 1 + images.length) % images.length)} className="rounded-[16px] border border-[#d8cdbc] bg-white/70 px-4 py-2 text-sm font-medium text-[#2b2722]">Previous</button> : <span />}
          <button type="button" onClick={onClose} className="rounded-[16px] border border-[#d8cdbc] bg-white/70 px-4 py-2 text-sm font-medium text-[#2b2722]">Close</button>
          {images.length > 1 ? <button type="button" onClick={() => onChange((index + 1) % images.length)} className="rounded-[16px] border border-[#d8cdbc] bg-white/70 px-4 py-2 text-sm font-medium text-[#2b2722]">Next</button> : <span />}
        </div>
      </div>
    </div>
  );
}

function ReviewDrawer({
  reviews,
  onClose
}: {
  reviews: Array<{ reviewer_name: string; review_text: string; review_source?: string }>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/45" onClick={onClose}>
      <div className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-[#f4ede0] px-5 pb-10 pt-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto max-w-[640px] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className={`${displayFont.className} text-2xl text-[#171512]`}>More reviews</h3>
            <button type="button" onClick={onClose} className="text-sm font-medium text-[#5a534a]">Close</button>
          </div>
          {reviews.map((item) => (
            <blockquote key={`${item.reviewer_name}-${item.review_text}`} className="space-y-2">
              <p className="text-[16px] leading-8 text-[#2e2924]">&ldquo;{item.review_text}&rdquo;</p>
              <footer className="text-sm text-[#766a5f]">- {item.reviewer_name}</footer>
            </blockquote>
          ))}
        </div>
      </div>
    </div>
  );
}
