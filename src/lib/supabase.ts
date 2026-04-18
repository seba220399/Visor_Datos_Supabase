import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ??
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ??
  "";

export const supabaseConfigError = !supabaseUrl
  ? "Falta VITE_SUPABASE_URL."
  : !supabaseKey
    ? "Falta VITE_SUPABASE_PUBLISHABLE_KEY o VITE_SUPABASE_ANON_KEY."
    : null;

const client = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    throw new Error(supabaseConfigError ?? "No se pudo crear el cliente de Supabase.");
  }

  return client;
}
