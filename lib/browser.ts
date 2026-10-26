"use client";
import { createClient } from "@supabase/supabase-js";
let c: ReturnType<typeof createClient> | null = null;
export const browserClient = () => (c ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!));
