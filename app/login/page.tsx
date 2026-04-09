"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingSignup, setLoadingSignup] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingLogin(true);
    setLoginError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    setLoadingLogin(false);

    if (!response.ok) {
      setLoginError("Login failed. Check your email and password.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingSignup(true);
    setSignupError(null);

    const formData = new FormData(event.currentTarget);
    const displayName = String(formData.get("displayName") || "");
    const email = String(formData.get("signupEmail") || "");
    const password = String(formData.get("signupPassword") || "");
    const advisorPhone = String(formData.get("advisorPhone") || "");
    const advisorPhotoUrl = String(formData.get("advisorPhotoUrl") || "");

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        email,
        password,
        advisorPhone,
        advisorPhotoUrl
      })
    });

    setLoadingSignup(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setSignupError(payload?.error || "Unable to create account.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(184,150,97,0.24),transparent_26%),linear-gradient(180deg,#f8f3ea_0%,#efe6da_52%,#ece2d4_100%)] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-[2rem] bg-[#173d33] p-8 text-white shadow-[0_32px_90px_rgba(20,42,35,0.24)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">Appointment engine</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            Sign in and create links under your own name.
          </h1>
          <p className="mt-4 text-[16px] leading-8 text-white/76">
            Each team member can keep their own login, their own phone number, their own photo, and
            their own advisor defaults. Once you sign in, the dashboard uses your identity automatically.
          </p>
          <div className="mt-8 grid gap-3">
            <FeatureCard title="Per-user defaults" copy="Your own name, email, phone, and photo become the advisor defaults." />
            <FeatureCard title="Shared template" copy="Location, reviews, and trust content stay consistent across the team." />
            <FeatureCard title="No extension required" copy="Generate customer links directly from the dashboard when needed." />
          </div>
        </section>

        <section className="grid gap-6">
          <form
            onSubmit={handleLogin}
            className="rounded-[2rem] border border-[#d9d0c5] bg-white/82 p-8 shadow-[0_20px_55px_rgba(38,27,16,0.09)] backdrop-blur"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6f50]">Sign in</p>
            <h2 className="mt-3 text-3xl font-semibold text-[#181510]">Open your dashboard</h2>
            <div className="mt-6 grid gap-4">
              <Field name="email" label="Email" type="email" />
              <Field name="password" label="Password" type="password" />
            </div>
            {loginError ? <p className="mt-4 text-sm text-[#8b3d34]">{loginError}</p> : null}
            <button
              type="submit"
              disabled={loadingLogin}
              className="mt-6 w-full rounded-full bg-[#173d33] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#113328] disabled:opacity-70"
            >
              {loadingLogin ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <form
            onSubmit={handleSignup}
            className="rounded-[2rem] border border-[#d9d0c5] bg-white/82 p-8 shadow-[0_20px_55px_rgba(38,27,16,0.09)] backdrop-blur"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6f50]">Create account</p>
            <h2 className="mt-3 text-3xl font-semibold text-[#181510]">Set up a coworker login</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field name="displayName" label="Name" />
              <Field name="signupEmail" label="Email" type="email" />
              <Field name="signupPassword" label="Password" type="password" />
              <Field name="advisorPhone" label="Advisor phone" />
              <div className="md:col-span-2">
                <Field name="advisorPhotoUrl" label="Advisor photo URL" />
              </div>
            </div>
            {signupError ? <p className="mt-4 text-sm text-[#8b3d34]">{signupError}</p> : null}
            <button
              type="submit"
              disabled={loadingSignup}
              className="mt-6 w-full rounded-full border border-[#d6ccbf] bg-[#f7f2ea] px-5 py-4 text-sm font-semibold text-[#1f1a16] transition hover:bg-[#f0e7db] disabled:opacity-70"
            >
              {loadingSignup ? "Creating account..." : "Create account"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-white/6 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-7 text-white/68">{copy}</p>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text"
}: {
  name: string;
  label: string;
  type?: string;
}) {
  return (
    <label className="block text-sm font-medium text-[#2d2923]">
      {label}
      <input
        name={name}
        type={type}
        className="mt-2 w-full rounded-[1.1rem] border border-[#d8cdbc] bg-[#fcfaf6] px-4 py-3 text-[#1f1a16]"
        required={name !== "advisorPhone" && name !== "advisorPhotoUrl"}
      />
    </label>
  );
}
