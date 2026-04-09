import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionCookieName,
  hashPassword,
  verifyPassword
} from "@/lib/auth";
import { createUserAccount, getUserByEmail } from "@/lib/users";

type LoginUser = NonNullable<Awaited<ReturnType<typeof getUserByEmail>>>;

async function getOrCreateLegacyOwner(email: string, password: string) {
  const allowedEmail = (process.env.DASHBOARD_EMAIL || "admin@localhost").trim().toLowerCase();
  const allowedPassword = process.env.DASHBOARD_PASSWORD || "changeme";

  if (email !== allowedEmail || password !== allowedPassword) {
    return null;
  }

  const existing = await getUserByEmail(email);

  if (existing) {
    return existing;
  }

  try {
    return await createUserAccount({
      email,
      display_name: "Owner",
      password_hash: await hashPassword(password),
      advisor_name: "Jude",
      advisor_email: email
    });
  } catch {
    return {
      id: `legacy:${email}`,
      email,
      display_name: "Owner",
      password_hash: "",
      advisor_name: "Jude",
      advisor_phone: undefined,
      advisor_email: email,
      advisor_photo_url: undefined,
      created_at: new Date(0).toISOString(),
      updated_at: undefined
    };
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase() || "";
  const password = body.password || "";

  if (!email || !password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  let user: LoginUser | null = await getUserByEmail(email);

  if (!user) {
    user = await getOrCreateLegacyOwner(email, password);
  }

  const usingLegacyFallback = user?.id.startsWith("legacy:");

  if (!user || (!usingLegacyFallback && !(await verifyPassword(password, user.password_hash)))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieName(), await createSessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/"
  });
  return response;
}
