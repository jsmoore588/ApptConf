"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DashboardAppointmentActions({
  appointmentId,
  phone
}: {
  appointmentId: string;
  phone?: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm("Delete this appointment? This cannot be undone.");

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Unable to delete appointment");
      }

      router.refresh();
    } catch {
      window.alert("Unable to delete appointment.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2 md:mt-0 md:justify-end">
      {phone ? (
        <>
          <a
            href={`sms:${phone}`}
            className="rounded-full border border-[#ddd3c8] bg-white px-4 py-2 text-sm font-semibold text-[#27231e]"
          >
            Text
          </a>
          <a
            href={`tel:${phone}`}
            className="rounded-full border border-[#ddd3c8] bg-white px-4 py-2 text-sm font-semibold text-[#27231e]"
          >
            Call
          </a>
        </>
      ) : null}
      <Link
        href={`/appt/${appointmentId}`}
        className="rounded-full bg-[#173d33] px-4 py-2 text-sm font-semibold text-white"
      >
        Open page
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-full border border-[#e2c8c3] bg-[#fff4f2] px-4 py-2 text-sm font-semibold text-[#8b3d34] disabled:opacity-70"
      >
        {deleting ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}
