"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DashboardAppointmentNotes({
  appointmentId,
  initialNotes
}: {
  appointmentId: string;
  initialNotes?: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes || "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function saveNotes() {
    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes })
      });

      if (!response.ok) {
        throw new Error("Unable to save notes");
      }

      setStatus("Notes saved.");
      router.refresh();
    } catch {
      setStatus("Unable to save notes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={7}
        placeholder="Add private notes about payoff, follow-up, valuation, questions, or anything useful for this appointment."
        className="w-full rounded-[1.2rem] border border-[#ddd3c7] bg-[#fcfaf6] px-4 py-3 text-sm leading-7 text-[#1f1a16]"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={saveNotes}
          disabled={saving}
          className="rounded-full bg-[#173d33] px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
        >
          {saving ? "Saving..." : "Save private notes"}
        </button>
        {status ? <p className="text-sm text-[#62584f]">{status}</p> : null}
      </div>
    </div>
  );
}
