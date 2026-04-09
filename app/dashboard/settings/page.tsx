import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPublicAppSettings } from "@/lib/app-settings";
import { SettingsForm } from "@/components/settings-form";
import { listAdvisorUsers } from "@/lib/users";

export default async function DashboardSettingsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const [settings, teamMembers] = await Promise.all([getPublicAppSettings(), listAdvisorUsers()]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f3ea_0%,#efe6da_55%,#ece2d4_100%)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <section className="rounded-[2rem] border border-[#d8cfbf] bg-white/80 p-6 shadow-[0_24px_60px_rgba(38,27,16,0.08)] backdrop-blur md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/40">Settings</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Account defaults and customer page template</h1>
          <p className="mt-3 text-sm leading-7 text-black/60">
            Your account controls your own advisor identity by default. Shared template settings still
            control location, photos, maps, and review content for every customer page.
          </p>
          <SettingsForm settings={settings} currentUser={currentUser} teamMembers={teamMembers} />
        </section>
      </div>
    </main>
  );
}
