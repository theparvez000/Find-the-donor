import { Suspense } from "react";
import { BLOOD_GROUPS, DISTRICTS } from "@/lib/data";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import GeoButton from "./GeoButton";
export const dynamic = "force-dynamic";
const PAGE = 12;
type Donor = { id: string; display_name: string; blood_group: string; district: string; upazila: string | null; status: string; availability_updated_at: string | null; last_donation: string | null; distance_km: number | null };
type SP = { group?: string; district?: string; lat?: string; lng?: string; radius?: string; page?: string };
const BADGE: Record<string, [string, string]> = {
  available: ["Available", "bg-green-100 text-green-800"],
  unavailable: ["Temporarily unavailable", "bg-gray-200 text-gray-700"],
  stale: ["Availability unknown (not updated in 30+ days)", "bg-yellow-100 text-yellow-800"],
  unset: ["Availability not set", "bg-gray-100 text-gray-600"],
};
export default async function Donors({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const group = (BLOOD_GROUPS as readonly string[]).includes(sp.group ?? "") ? sp.group! : "";
  const district = DISTRICTS.includes(sp.district ?? "") ? sp.district! : "";
  const lat = Number(sp.lat), lng = Number(sp.lng);
  const hasLoc = sp.lat != null && sp.lng != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const radius = hasLoc && [1, 3, 5, 10, 25].includes(Number(sp.radius)) ? Number(sp.radius) : 0;
  const page = Math.max(1, Math.min(200, Number(sp.page) || 1));
  let donors: Donor[] = []; let error = "";
  if (!supabaseConfigured()) error = "Database is not configured yet.";
  else {
    const r = await supabase().rpc("search_donors", { p_group: group || null, p_district: district || null, p_lat: hasLoc ? lat : null, p_lng: hasLoc ? lng : null, p_radius_km: radius, p_limit: PAGE + 1, p_offset: (page - 1) * PAGE });
    if (r.error) error = "Could not load donors. Please try again."; else donors = r.data as Donor[];
  }
  const more = donors.length > PAGE; donors = donors.slice(0, PAGE);
  const link = (n: number) => { const q = new URLSearchParams(); if (group) q.set("group", group); if (district) q.set("district", district); if (hasLoc) { q.set("lat", String(lat)); q.set("lng", String(lng)); } if (radius) q.set("radius", String(radius)); q.set("page", String(n)); return "/donors?" + q.toString(); };
  return (<div>
    <h1 className="text-2xl font-bold">Find Donors</h1>
    <form className="my-4 grid gap-3 sm:grid-cols-4">
      {hasLoc && <><input type="hidden" name="lat" value={lat}/><input type="hidden" name="lng" value={lng}/></>}
      <label className="text-sm font-medium">Blood group<select name="group" defaultValue={group} className="input mt-1"><option value="">Any</option>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select></label>
      <label className="text-sm font-medium">District<select name="district" defaultValue={district} className="input mt-1"><option value="">Any</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select></label>
      <label className="text-sm font-medium">Radius<select name="radius" defaultValue={radius || ""} disabled={!hasLoc} className="input mt-1"><option value="">Any distance</option>{[1, 3, 5, 10, 25].map((k) => <option key={k} value={k}>{k} km</option>)}</select></label>
      <button className="btn self-end">Search</button>
    </form>
    <div className="mb-4 flex flex-wrap items-center gap-3"><Suspense fallback={null}><GeoButton/></Suspense>
      <span className="text-xs text-gray-600">{hasLoc ? "Sorting nearest first (your location is used only for this search)." : "Optional. Without location, results are filtered by district only."}</span></div>
    {error && <p role="alert" className="rounded-lg bg-yellow-50 p-3 text-sm">{error}</p>}
    {!error && donors.length === 0 && <p className="rounded-lg border p-6 text-center text-gray-600">No donors match these filters. Try a wider radius or district.</p>}
    <ul className="grid gap-3 sm:grid-cols-2">{donors.map((d) => { const [label, cls] = BADGE[d.status] ?? BADGE.unset; return (
      <li key={d.id} className="flex items-start gap-4 rounded-xl border p-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-600 font-bold text-white">{d.blood_group}</span>
        <div className="min-w-0"><p className="font-semibold">{d.display_name}</p>
          <p className="text-sm text-gray-600">{d.upazila ? d.upazila + ", " : ""}{d.district}{d.distance_km != null ? ` · about ${d.distance_km} km` : ""}</p>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
          {d.availability_updated_at && <p className="mt-1 text-xs text-gray-500">Updated {new Date(d.availability_updated_at).toLocaleDateString("en-GB")}</p>}
          {d.last_donation && <p className="text-xs text-gray-500">Last donation (self-reported): {d.last_donation}</p>}
        </div></li>); })}</ul>
    {(page > 1 || more) && <div className="mt-6 flex justify-between text-sm font-medium">{page > 1 ? <a href={link(page - 1)}>← Previous</a> : <span/>}{more && <a href={link(page + 1)}>Next →</a>}</div>}
    <p className="mt-6 text-xs text-gray-500">Contact details are never shown publicly. Availability is self-reported and does not certify medical eligibility; always confirm with the hospital or blood bank. The contact-request feature is not built yet.</p>
  </div>);
}
