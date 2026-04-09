import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, getSessionCookieName, hashPassword } from "@/lib/auth";
import { createUserAccount, getUserByEmail } from "@/lib/users";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    displayName?: string;
    advisorPhone?: string;
    advisorPhotoUrl?: string;
  };

  const email = body.email?.trim().toLowerCase() || "";
  const password = body.password || "";
  const displayName = body.displayName?.trim() || "";

  if (!email || !password || !displayName) {
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Use a password with at least 8 characters." },
      { status: 400 }
    );
  }

  const existing = await getUserByEmail(email);

  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const user = await createUserAccount({
    email,
    display_name: displayName,
    password_hash: await hashPassword(password),
    advisor_name: displayName,
    advisor_phone: body.advisorPhone?.trim() || undefined,
    advisor_email: email,
    advisor_photo_url: body.advisorPhotoUrl?.trim() || undefined
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieName(), await createSessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/"
  });
  return response;
}
