"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { browserClient } from "@/lib/browser";
import { BLOOD_GROUPS, DISTRICTS } from "@/lib/data";

type P = { display_name: string; blood_group: string; district: string; upazila: string; availability_status: string; unavailable_reason: string; contact_method: string; accepts_requests: boolean; public_listing: boolean; show_last_donation: boolean; last_donation: string; location_consent: boolean; approx_lat: number | null; approx_lng: number | null };
const EMPTY: P = { display_name: "", blood_group: "O+", district: "Dhaka", upazila: "", availability_status: "unset", unavailable_reason: "", contact_method: "in_app", accepts_requests: false, public_listing: false, show_last_donation: false, last_donation: "", location_consent: false, approx_lat: null, approx_lng: null };
const STATES = [["available", "Available for contact"], ["unavailable", "Temporarily unavailable"], ["unset", "Availability not set"]] as const;

export default function Dashboard() {
  const sb = browserClient();
  const [uid, setUid] = useState<string | null>(null);
  const [p, setP] = useState<P>(EMPTY); const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const set = <K extends keyof P>(k: K, v: P[K]) => setP((o) => ({ ...o, [k]: v }));

  useEffect(() => { (async () => {
    const { data: s } = await sb.auth.getSession(); const id = s.session?.user.id ?? null; setUid(id);
    if (id) { const { data } = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
      if (data) { setExists(true); const d = data as Record<string, unknown>; setP({ ...EMPTY, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ?? (EMPTY as Record<string, unknown>)[k]])) } as P); } }
    setLoading(false); })(); }, [sb]);

  const row = (o: P) => ({ id: uid, display_name: o.display_name.trim(), blood_group: o.blood_group, district: o.district, upazila: o.upazila.trim() || null, availability_status: o.availability_status, unavailable_reason: o.unavailable_reason || null, contact_method: o.contact_method, accepts_requests: o.accepts_requests, public_listing: o.public_listing, show_last_donation: o.show_last_donation, last_donation: o.last_donation || null, location_consent: o.location_consent, approx_lat: o.location_consent ? o.approx_lat : null, approx_lng: o.location_consent ? o.approx_lng : null });

  async function save(next: P, okText: string) {
    if (next.display_name.trim().length < 2) return setMsg({ ok: false, t: "Please enter a display name (2+ characters)." });
    const { error } = await sb.from("profiles").upsert(row(next));
    if (error) return setMsg({ ok: false, t: "Could not save. Please try again." });
    setExists(true); setMsg({ ok: true, t: okText });
  }
  async function setStatus(v: string) {
    if (!exists) return setMsg({ ok: false, t: "Save your profile first, then set availability." });
    const prev = p; const next = { ...p, availability_status: v }; setP(next);
    const { error } = await sb.from("profiles").update({ availability_status: v, unavailable_reason: v === "unavailable" ? p.unavailable_reason || null : null }).eq("id", uid!);
    if (error) { setP(prev); setMsg({ ok: false, t: "Could not update availability." }); } else setMsg({ ok: true, t: "Availability updated. This is self-reported and does not confirm medical eligibility." });
  }
  function locate() {
    if (!navigator.geolocation) return setMsg({ ok: false, t: "Location not supported on this device." });
    navigator.geolocation.getCurrentPosition((g) => setP((o) => ({ ...o, approx_lat: Math.round(g.coords.latitude * 100) / 100, approx_lng: Math.round(g.coords.longitude * 100) / 100 })), () => setMsg({ ok: false, t: "Location permission denied." }));
  }
  async function hide() { const { error } = await sb.from("profiles").update({ public_listing: false }).eq("id", uid!); if (!error) { set("public_listing", false); setMsg({ ok: true, t: "Your profile is hidden from search." }); } }
  async function wipe() { if (!confirm("Delete your donor profile data? This cannot be undone.")) return; const { error } = await sb.from("profiles").delete().eq("id", uid!); if (!error) { setP(EMPTY); setExists(false); setMsg({ ok: true, t: "Profile deleted." }); } }

  if (loading) return <p className="py-10 text-center text-gray-600">Loading…</p>;
  if (!uid) return <div className="py-10 text-center"><p>Please sign in to manage your donor profile.</p><Link href="/login" className="btn mt-4">Sign in</Link></div>;

  return (<div className="max-w-xl">
    <h1 className="text-2xl font-bold">My donor dashboard</h1>
    <section className="mt-4 rounded-2xl border bg-brand-50 p-4" aria-labelledby="av">
      <h2 id="av" className="font-semibold">Availability</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-3" role="group" aria-label="Availability">
        {STATES.map(([v, l]) => <button key={v} type="button" aria-pressed={p.availability_status === v} onClick={() => setStatus(v)} className={`rounded-xl border px-3 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-600 ${p.availability_status === v ? "border-brand-600 bg-brand-600 text-white" : "bg-white"}`}>{l}</button>)}
      </div>
      {p.availability_status === "unavailable" && <label className="mt-3 block text-sm font-medium">Private reason (never shown to requesters)<select value={p.unavailable_reason} onChange={(e) => set("unavailable_reason", e.target.value)} className="input mt-1"><option value="">Prefer not to say</option><option value="busy">Busy</option><option value="resting">Resting</option><option value="unwell">Unwell</option><option value="personal">Personal</option></select></label>}
      <p className="mt-3 text-xs text-gray-600">Availability is self-reported. Only blood-bank staff or a healthcare professional can decide whether you may donate.</p>
    </section>
    {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-4 rounded-lg p-3 text-sm ${msg.ok ? "bg-green-50" : "bg-red-50"}`}>{msg.t}</p>}
    <form onSubmit={(e) => { e.preventDefault(); save(p, "Profile saved."); }} className="mt-6 grid gap-3">
      <h2 className="font-semibold">Profile</h2>
      <label className="text-sm font-medium">Display name<input value={p.display_name} onChange={(e) => set("display_name", e.target.value)} maxLength={60} required className="input mt-1"/></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">Blood group<select value={p.blood_group} onChange={(e) => set("blood_group", e.target.value)} className="input mt-1">{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select></label>
        <label className="text-sm font-medium">District<select value={p.district} onChange={(e) => set("district", e.target.value)} className="input mt-1">{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select></label></div>
      <label className="text-sm font-medium">Upazila / area (optional)<input value={p.upazila} onChange={(e) => set("upazila", e.target.value)} maxLength={60} className="input mt-1"/></label>
      <label className="text-sm font-medium">Last donation date (optional, self-reported)<input type="date" value={p.last_donation} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set("last_donation", e.target.value)} className="input mt-1"/></label>
      <label className="text-sm font-medium">Preferred contact method<select value={p.contact_method} onChange={(e) => set("contact_method", e.target.value)} className="input mt-1"><option value="in_app">In-app only</option><option value="phone">Phone</option><option value="email">Email</option></select></label>
      <fieldset className="grid gap-2 rounded-xl border p-3 text-sm"><legend className="px-1 font-medium">Consent</legend>
        <label className="flex gap-2"><input type="checkbox" checked={p.public_listing} onChange={(e) => set("public_listing", e.target.checked)}/>Show me in donor search (first name, blood group, area)</label>
        <label className="flex gap-2"><input type="checkbox" checked={p.accepts_requests} onChange={(e) => set("accepts_requests", e.target.checked)}/>I agree to receive blood requests</label>
        <label className="flex gap-2"><input type="checkbox" checked={p.show_last_donation} onChange={(e) => set("show_last_donation", e.target.checked)}/>Show my last donation date publicly</label>
        <label className="flex gap-2"><input type="checkbox" checked={p.location_consent} onChange={(e) => set("location_consent", e.target.checked)}/>Use my approximate location (rounded to ~1 km) for distance sorting</label>
        {p.location_consent && <div className="flex items-center gap-3"><button type="button" onClick={locate} className="rounded-lg border px-3 py-1.5">Use my current location</button><span className="text-xs text-gray-600">{p.approx_lat != null ? `Saved on Save: ${p.approx_lat}, ${p.approx_lng}` : "Not set"}</span></div>}
      </fieldset>
      <button className="btn">Save profile</button>
    </form>
    {exists && <div className="mt-6 flex flex-wrap gap-3 border-t pt-4 text-sm"><button onClick={hide} className="rounded-lg border px-3 py-2">Hide from search</button><button onClick={wipe} className="rounded-lg border border-red-600 px-3 py-2 text-red-700">Delete profile data</button><button onClick={async () => { await sb.auth.signOut(); location.href = "/"; }} className="rounded-lg border px-3 py-2">Sign out</button></div>}
    <p className="mt-3 text-xs text-gray-500">Full account deletion is not built yet; contact the site owner to remove your login.</p>
  </div>);
}
