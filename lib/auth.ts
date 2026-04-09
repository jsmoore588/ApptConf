import { cookies } from "next/headers";
import { getUserByEmail, getUserById } from "@/lib/users";

const SESSION_COOKIE = "appointment_engine_session";

function getAuthSecret() {
  return process.env.AUTH_SECRET || "local-dev-secret";
}

async function sign(value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomSalt() {
  return crypto.randomUUID().replace(/-/g, "");
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function hashPassword(password: string, salt = randomSalt()) {
  const digest = await sign(`${salt}:${password}`);
  return `${salt}.${digest}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const index = storedHash.indexOf(".");

  if (index <= 0) {
    return false;
  }

  const salt = storedHash.slice(0, index);
  const digest = storedHash.slice(index + 1);
  return (await sign(`${salt}:${password}`)) === digest;
}

export async function createSessionToken(userId: string) {
  return `${userId}.${await sign(userId)}`;
}

export async function verifySessionToken(token?: string) {
  if (!token) {
    return false;
  }

  const index = token.lastIndexOf(".");

  if (index <= 0) {
    return false;
  }

  const userId = token.slice(0, index);
  const signature = token.slice(index + 1);
  return (await sign(userId)) === signature;
}

export async function getSessionUserId() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!(await verifySessionToken(token))) {
    return null;
  }

  const index = token?.lastIndexOf(".") ?? -1;
  return index > 0 && token ? token.slice(0, index) : null;
}

export async function isAuthenticated() {
  return Boolean(await getSessionUserId());
}

export async function getCurrentUser() {
  const userId = await getSessionUserId();

  if (!userId) {
    return null;
  }

  if (userId.startsWith("legacy:")) {
    const email = userId.slice("legacy:".length) || process.env.DASHBOARD_EMAIL || "admin@localhost";

    return {
      id: userId,
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

  if (!isUuidLike(userId)) {
    const allowedEmail = (process.env.DASHBOARD_EMAIL || "admin@localhost").trim().toLowerCase();
    const normalizedEmail = userId.trim().toLowerCase();

    if (normalizedEmail === allowedEmail) {
      return {
        id: `legacy:${normalizedEmail}`,
        email: normalizedEmail,
        display_name: "Owner",
        password_hash: "",
        advisor_name: "Jude",
        advisor_phone: undefined,
        advisor_email: normalizedEmail,
        advisor_photo_url: undefined,
        created_at: new Date(0).toISOString(),
        updated_at: undefined
      };
    }

    return getUserByEmail(normalizedEmail);
  }

  return getUserById(userId);
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}
