import { supabase, supabaseConfigured } from "@/lib/supabase";
export const dynamic = "force-dynamic";
type Q = { id: string; blood_group: string; units: number; hospital: string; district: string; created_at: string };
export default async function Requests() {
  let rows: Q[] = []; let error = "";
  if (!supabaseConfigured()) error = "Database is not configured yet.";
  else { const r = await supabase().from("public_requests").select("id,blood_group,units,hospital,district,created_at").order("created_at", { ascending: false }).limit(30);
    if (r.error) error = "Could not load requests. Please try again."; else rows = r.data as Q[]; }
  return (<div className="mx-auto max-w-3xl">
    <h1 className="text-2xl font-bold">Approved blood requests</h1>
    <p className="mt-1 text-xs text-gray-600">Only requests reviewed by a moderator appear here, with no contact details. Always confirm with the hospital before acting.</p>
    {error && <p role="alert" className="mt-4 rounded-lg bg-yellow-50 p-3 text-sm">{error}</p>}
    {!error && rows.length === 0 && <p className="mt-4 rounded-xl border p-6 text-center text-gray-600">No approved requests right now.</p>}
    <ul className="mt-4 grid gap-3">{rows.map((r) => <li key={r.id} className="flex items-center gap-4 rounded-xl border p-4">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-600 font-bold text-white">{r.blood_group}</span>
      <div><p className="font-semibold">{r.units} bag(s) needed</p><p className="text-sm text-gray-600">{r.hospital}, {r.district}</p>
        <p className="text-xs text-gray-500">Posted {new Date(r.created_at).toLocaleDateString("en-GB")}</p></div></li>)}</ul>
  </div>);
}
