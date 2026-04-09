"use client";

import { startTransition, useState } from "react";

type AdvisorUser = {
  id: string;
  display_name: string;
  advisor_name?: string;
  advisor_phone?: string;
  advisor_photo_url?: string;
  advisor_email?: string;
};

type Props = {
  advisors: AdvisorUser[];
  currentUserId: string;
};

function toIso(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) {
    return null;
  }

  const date = new Date(`${dateValue}T${timeValue}:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function DashboardCreateForm({ advisors, currentUserId }: Props) {
  const [customerName, setCustomerName] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedAdvisorId, setSelectedAdvisorId] = useState(currentUserId);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const selectedAdvisor = advisors.find((advisor) => advisor.id === selectedAdvisorId) || advisors[0];

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
          advisor_user_id: selectedAdvisorId,
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
      startTransition(() => {
        setCustomerName("");
        setVehicle("");
        setAppointmentDate("");
        setAppointmentTime("");
        setCustomerPhone("");
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create appointment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-[#d6cfbf] bg-[linear-gradient(135deg,#f7f3eb_0%,#efe6da_50%,#e8ddce_100%)] p-6 shadow-[0_30px_80px_rgba(38,27,16,0.12)]">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.8rem] bg-[#173d33] p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">Create Link</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight">Build a customer page without leaving the dashboard</h2>
          <p className="mt-3 text-sm leading-7 text-white/76">
            Pick the appraiser, lock in the time, and generate a ready-to-send page in one pass.
          </p>

          {selectedAdvisor ? (
            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Default advisor</p>
              <p className="mt-3 text-2xl font-semibold">
                {selectedAdvisor.advisor_name || selectedAdvisor.display_name}
              </p>
              <div className="mt-3 space-y-1 text-sm text-white/70">
                <p>{selectedAdvisor.advisor_email || "No email saved yet"}</p>
                <p>{selectedAdvisor.advisor_phone || "No phone saved yet"}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.8rem] border border-white/50 bg-white/72 p-5 backdrop-blur">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Customer name" value={customerName} onChange={setCustomerName} placeholder="Courtney Mason" />
            <Field label="Vehicle" value={vehicle} onChange={setVehicle} placeholder="2021 Toyota Highlander" />
            <Field label="Date" type="date" value={appointmentDate} onChange={setAppointmentDate} />
            <Field label="Time" type="time" value={appointmentTime} onChange={setAppointmentTime} />
            <Field label="Customer phone" value={customerPhone} onChange={setCustomerPhone} placeholder="2515551234" />
            <label className="block text-sm font-medium text-[#2d2923]">
              Appraiser

              <select
                value={selectedAdvisorId}
                onChange={(event) => setSelectedAdvisorId(event.target.value)}
                className="mt-2 w-full rounded-[1.1rem] border border-[#d8cdbc] bg-[#fcfaf6] px-4 py-3 text-[#1f1a16]"
              >
                {advisors.map((advisor) => (
                  <option key={advisor.id} value={advisor.id}>
                    {advisor.advisor_name || advisor.display_name}
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
              className="rounded-full bg-[#173d33] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#113328] disabled:opacity-70"
            >
              {submitting ? "Creating..." : "Create and open link"}
            </button>
            <div className="rounded-full border border-[#d9d0c5] bg-[#fcfaf6] px-4 py-3 text-sm text-[#625a51]">
              The link is copied automatically after it is created.
            </div>
          </div>

          {status ? <p className="mt-4 text-sm text-[#5c5148]">{status}</p> : null}
        </div>
      </div>
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
