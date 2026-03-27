import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl() {
  const value = process.env.SUPABASE_URL;

  if (!value) {
    throw new Error("Missing SUPABASE_URL");
  }

  return value;
}

function getSupabaseServiceRoleKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!value) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return value;
}

export function getSupabaseServerClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
