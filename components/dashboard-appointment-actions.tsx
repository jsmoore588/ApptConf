"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DashboardAppointmentActions({
  appointmentId
}: {
  appointmentId: string;
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
      <Link
        href={{ pathname: "/dashboard/appointments/[id]", query: { id: appointmentId } }}
        className="rounded-full bg-[#173d33] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(23,61,51,0.2)]"
      >
        Open Portfolio
      </Link>
      <Link
        href={`/appt/${appointmentId}`}
        className="rounded-full border border-[#ddd3c8] bg-white/70 px-4 py-2.5 text-sm font-semibold text-[#27231e]"
      >
        Customer Page
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-full border border-[#e2c8c3] bg-[#fff4f2]/75 px-4 py-2.5 text-sm font-semibold text-[#8b3d34] disabled:opacity-70"
      >
        {deleting ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}
