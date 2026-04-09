"use client";

import { useState } from "react";

type AdvisorProfile = {
  key: "jude" | "crystal";
  label: string;
  advisor_name?: string;
  advisor_phone?: string;
  advisor_photo_url?: string;
  advisor_email?: string;
};

type Props = {
  advisorProfiles: AdvisorProfile[];
};

function toIso(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) {
    return null;
  }

  const date = new Date(`${dateValue}T${timeValue}:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function DashboardCreateForm({ advisorProfiles }: Props) {
  const [customerName, setCustomerName] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedAdvisor, setSelectedAdvisor] = useState<"jude" | "crystal">("jude");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const appointmentAt = toIso(appointmentDate, appointmentTime);

    if (!customerName.trim() || !vehicle.trim() || !appointmentAt) {
      setStatus("Customer, vehicle, date, and time are required.");
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/create-appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          vehicle: vehicle.trim(),
          appointment_at: appointmentAt,
          customer_phone: customerPhone.trim(),
          advisor_key: selectedAdvisor,
          source: "dashboard"
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to create appointment");
      }

      if (payload?.url) {
        await navigator.clipboard.writeText(payload.url);
        window.open(payload.url, "_blank", "noopener,noreferrer");
      }

      setStatus("Link created, copied, and opened in a new tab.");
      setCustomerName("");
      setVehicle("");
      setAppointmentDate("");
      setAppointmentTime("");
      setCustomerPhone("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create appointment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-6 rounded-[2rem] border border-black/5 bg-white/75 p-6 shadow-card backdrop-blur">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/40">Create Link</p>
        <h2 className="text-2xl font-semibold text-ink">Generate a customer link from the dashboard</h2>
        <p className="text-sm leading-7 text-black/60">
          Choose the appraiser first, then create the appointment page without using the extension.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="Customer name" value={customerName} onChange={setCustomerName} placeholder="Customer name" />
        <Field label="Vehicle" value={vehicle} onChange={setVehicle} placeholder="2021 Toyota Highlander" />
        <Field label="Date" type="date" value={appointmentDate} onChange={setAppointmentDate} />
        <Field label="Time" type="time" value={appointmentTime} onChange={setAppointmentTime} />
        <Field label="Customer phone" value={customerPhone} onChange={setCustomerPhone} placeholder="2515551234" />
        <label className="block text-sm font-medium text-ink">
          Appraiser
          <select
            value={selectedAdvisor}
            onChange={(event) => setSelectedAdvisor(event.target.value as "jude" | "crystal")}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-[#faf7f0] px-4 py-3"
          >
            {advisorProfiles.map((profile) => (
              <option key={profile.key} value={profile.key}>
                {profile.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white"
        >
          {submitting ? "Creating..." : "Create link"}
        </button>
      </div>

      {status ? <p className="mt-4 text-sm text-black/65">{status}</p> : null}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-black/10 bg-[#faf7f0] px-4 py-3"
      />
    </label>
  );
}
