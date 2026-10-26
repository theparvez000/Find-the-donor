import { BLOOD_GROUPS, DISTRICTS } from "@/lib/data";
import { supabase, supabaseConfigured } from "@/lib/supabase";
export const dynamic = "force-dynamic";
type Donor = { id: string; display_name: string; blood_group: string; district: string; upazila: string | null };
export default async function Donors({ searchParams }: { searchParams: Promise<{ group?: string; district?: string }> }) {
  const { group = "", district = "" } = await searchParams;
  const okGroup = (BLOOD_GROUPS as readonly string[]).includes(group) ? group : "";
  const okDistrict = DISTRICTS.includes(district) ? district : "";
  let donors: Donor[] = []; let error = "";
  if (!supabaseConfigured()) error = "Database is not configured yet.";
  else {
    let q = supabase().from("public_donors").select("id,display_name,blood_group,district,upazila").limit(50);
    if (okGroup) q = q.eq("blood_group", okGroup);
    if (okDistrict) q = q.eq("district", okDistrict);
    const r = await q; if (r.error) error = "Could not load donors. Please try again."; else donors = r.data as Donor[];
  }
  return (<div>
    <h1 className="text-2xl font-bold">Find Donors</h1>
    <form className="my-4 grid gap-3 sm:grid-cols-3">
      <label className="text-sm font-medium">Blood group<select name="group" defaultValue={okGroup} className="input mt-1"><option value="">Any</option>{BLOOD_GROUPS.map(g=><option key={g}>{g}</option>)}</select></label>
      <label className="text-sm font-medium">District<select name="district" defaultValue={okDistrict} className="input mt-1"><option value="">Any</option>{DISTRICTS.map(d=><option key={d}>{d}</option>)}</select></label>
      <button className="btn self-end">Search</button>
    </form>
    {error && <p role="alert" className="rounded-lg bg-yellow-50 p-3 text-sm">{error}</p>}
    {!error && donors.length === 0 && <p className="rounded-lg border p-6 text-center text-gray-600">No available donors match yet. Be the first to register.</p>}
    <ul className="grid gap-3 sm:grid-cols-2">{donors.map(d=><li key={d.id} className="flex items-center gap-4 rounded-xl border p-4">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-600 font-bold text-white">{d.blood_group}</span>
      <div><p className="font-semibold">{d.display_name}</p><p className="text-sm text-gray-600">{d.upazila ? d.upazila + ", " : ""}{d.district}</p></div></li>)}</ul>
    <p className="mt-6 text-xs text-gray-500">Contact details are never shown publicly. Listing does not certify medical eligibility.</p>
  </div>);
}
