"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let c: SupabaseClient<any, "public", any> | null = null;
// Placeholders only keep the build/prerender from crashing before env vars are set; real requests need the real values.
export const browserClient = () => (c ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "not-configured"));
