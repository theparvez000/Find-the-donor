import Link from "next/link";
import Drop from "@/components/Drop";
import { BLOOD_GROUPS, DISTRICTS } from "@/lib/data";
import { supabase, supabaseConfigured } from "@/lib/supabase";

// Re-generate at most every 5 minutes so the live counts stay fresh without a query per visit.
export const revalidate = 300;

type Stats = { listed_donors: number; available_donors: number; approved_requests: number; fulfilled_requests: number };

// Real counts only. If the database or the public_stats() function is unavailable, return null and show no numbers.
async function loadStats(): Promise<Stats | null> {
  if (!supabaseConfigured()) return null;
  try {
    const { data, error } = await supabase().rpc("public_stats");
    if (error || !data || !data[0]) return null;
    return data[0] as Stats;
  } catch {
    return null;
  }
}

const fmt = (n: number) => Number(n).toLocaleString("en-US");

export default async function Home() {
  const stats = await loadStats();
  const cards: Array<[string, number]> = stats
    ? [
        ["Donors available now", stats.available_donors],
        ["Donors who opted in to search", stats.listed_donors],
        ["Requests approved", stats.approved_requests],
        ["Requests fulfilled", stats.fulfilled_requests],
      ]
    : [];
  return (
    <>
      <section className="grid items-center gap-8 rounded-3xl bg-gradient-to-br from-brand-50 via-white to-brand-100 p-6 sm:p-10 md:grid-cols-2">
        <div>
          <h1 className="text-4xl font-extrabold leading-tight text-brand-900 sm:text-5xl">
            Every Drop Counts.<br />Every Life Matters.
          </h1>
          <p className="mt-4 max-w-md text-gray-700">
            Find willing blood donors across Bangladesh, or post a blood request that a moderator reviews before it goes public.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/scan" className="btn">Find Donors →</Link>
            <Link href="/request" className="btn-outline">Request Blood</Link>
          </div>
        </div>
        <div className="relative mx-auto grid h-56 w-56 place-items-center sm:h-64 sm:w-64" aria-hidden="true">
          <span className="absolute inset-0 rounded-full border-2 border-brand-600/20 motion-safe:animate-ping" />
          <span className="absolute inset-6 rounded-full border border-brand-600/30" />
          <span className="absolute inset-12 rounded-full bg-white/70 shadow-inner" />
          <Drop className="relative h-28 w-28 drop-shadow-lg sm:h-32 sm:w-32" />
        </div>
      </section>

      {cards.length > 0 && (
        <section className="mt-6" aria-label="Live platform numbers">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {cards.map(([label, n]) => (
              <div key={label} className="card text-center">
                <p className="text-2xl font-extrabold text-brand-700">{fmt(n)}</p>
                <p className="mt-1 text-xs text-gray-600">{label}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-gray-500">Live counts from our database, refreshed every few minutes. “Available” means self-reported within the last 30 days.</p>
        </section>
      )}

      <form action="/donors" className="card mt-6 grid gap-3 bg-brand-50 sm:grid-cols-3">
        <label className="text-sm font-medium">Blood group
          <select name="group" className="input mt-1">{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select>
        </label>
        <label className="text-sm font-medium">District
          <select name="district" className="input mt-1"><option value="">Any</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select>
        </label>
        <button className="btn self-end">Browse donors</button>
      </form>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          ["1. Search", "Search registered donors who agreed to be found, by blood group and area."],
          ["2. Request", "Submit a request. A moderator reviews it before it is public."],
          ["3. Confirm", "Compatibility and eligibility must be confirmed by the hospital or blood bank."],
        ].map(([t, d]) => (
          <div key={t} className="card"><h2 className="font-semibold text-brand-700">{t}</h2><p className="mt-1 text-sm text-gray-600">{d}</p></div>
        ))}
      </section>
    </>
  );
}
