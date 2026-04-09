import { getSupabaseServerClient } from "@/lib/supabase";
import { createUuid } from "@/lib/uuid";

export type UserAccount = {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  advisor_name?: string;
  advisor_phone?: string;
  advisor_email?: string;
  advisor_photo_url?: string;
  created_at: string;
  updated_at?: string;
};

function mapUser(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    email: String(row.email),
    display_name: String(row.display_name ?? ""),
    password_hash: String(row.password_hash),
    advisor_name: (row.advisor_name as string | null) ?? undefined,
    advisor_phone: (row.advisor_phone as string | null) ?? undefined,
    advisor_email: (row.advisor_email as string | null) ?? undefined,
    advisor_photo_url: (row.advisor_photo_url as string | null) ?? undefined,
    created_at: String(row.created_at),
    updated_at: (row.updated_at as string | null) ?? undefined
  } satisfies UserAccount;
}

function isMissingUserAccountsTable(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = Reflect.get(error, "code");
  return code === "42P01";
}

export async function getUserByEmail(email: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_accounts")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    if (isMissingUserAccountsTable(error)) {
      return null;
    }
    throw error;
  }

  return data ? mapUser(data) : null;
}

export async function getUserById(id: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("user_accounts").select("*").eq("id", id).maybeSingle();

  if (error) {
    if (isMissingUserAccountsTable(error)) {
      return null;
    }
    throw error;
  }

  return data ? mapUser(data) : null;
}

export async function listAdvisorUsers() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_accounts")
    .select("*")
    .order("display_name", { ascending: true });

  if (error) {
    if (isMissingUserAccountsTable(error)) {
      return [];
    }
    throw error;
  }

  return (data ?? []).map(mapUser);
}

export async function createUserAccount(input: {
  email: string;
  display_name: string;
  password_hash: string;
  advisor_name?: string;
  advisor_phone?: string;
  advisor_email?: string;
  advisor_photo_url?: string;
}) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_accounts")
    .insert({
      id: createUuid(),
      email: input.email.trim().toLowerCase(),
      display_name: input.display_name.trim(),
      password_hash: input.password_hash,
      advisor_name: input.advisor_name?.trim() || null,
      advisor_phone: input.advisor_phone?.trim() || null,
      advisor_email: input.advisor_email?.trim() || null,
      advisor_photo_url: input.advisor_photo_url?.trim() || null
    })
    .select("*")
    .maybeSingle();

  if (error) {
    if (isMissingUserAccountsTable(error)) {
      throw new Error("Run the latest supabase/schema.sql to enable team accounts.");
    }
    throw error;
  }

  if (!data) {
    throw new Error("Unable to create account");
  }

  return mapUser(data);
}

export async function updateUserAccount(
  id: string,
  partial: Partial<Pick<UserAccount, "display_name" | "advisor_name" | "advisor_phone" | "advisor_email" | "advisor_photo_url">>
) {
  const supabase = getSupabaseServerClient();
  const payload: Record<string, unknown> = {};

  if (partial.display_name !== undefined) payload.display_name = partial.display_name;
  if (partial.advisor_name !== undefined) payload.advisor_name = partial.advisor_name;
  if (partial.advisor_phone !== undefined) payload.advisor_phone = partial.advisor_phone;
  if (partial.advisor_email !== undefined) payload.advisor_email = partial.advisor_email;
  if (partial.advisor_photo_url !== undefined) payload.advisor_photo_url = partial.advisor_photo_url;

  const { data, error } = await supabase
    .from("user_accounts")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    if (isMissingUserAccountsTable(error)) {
      throw new Error("Run the latest supabase/schema.sql to enable team accounts.");
    }
    throw error;
  }

  return data ? mapUser(data) : null;
}
