"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { browserClient } from "@/lib/browser";
import { BLOOD_GROUPS, DISTRICTS } from "@/lib/data";

type D = { id: string; display_name: string; blood_group: string; district: string; upazila: string | null; status: string; availability_updated_at: string | null; last_donation: string | null; distance_km: number | null };
// "searching" lasts exactly as long as the real Supabase request. There is no artificial delay.
type Phase = "idle" | "searching" | "results" | "error";
const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PARTICLES = [[12, 30, 0], [80, 18, 1], [66, 82, 2], [25, 74, 3], [90, 56, 1.5], [44, 10, 2.5], [8, 58, 0.5], [58, 92, 3.5]];
const CSS = `
.radar{position:relative;width:min(78vw,320px);aspect-ratio:1;margin:0 auto;border-radius:9999px;background:radial-gradient(circle,#fff 0,#fef2f2 70%);border:1px solid #fecaca;overflow:hidden}
.radar .ring{position:absolute;border:1.5px solid rgba(185,28,28,.28);border-radius:9999px}
.radar .pulse,.radar .sweep{position:absolute;inset:0;border-radius:9999px}
.radar .pulse{border:2px solid #b91c1c;opacity:0}
.radar .sweep{background:conic-gradient(from 0deg,rgba(185,28,28,0) 0deg,rgba(185,28,28,.45) 60deg,rgba(185,28,28,0) 60.5deg)}
.radar.on .pulse{animation:pulse 2.4s ease-out infinite}.radar.on .p2{animation-delay:1.2s}
.radar.on .sweep{animation:spin 2.2s linear infinite}.radar:not(.on) .sweep{opacity:0}
.radar .core{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:56px;height:56px;border-radius:9999px;background:#b91c1c;color:#fff;display:grid;place-items:center;font-weight:700;box-shadow:0 0 0 6px rgba(185,28,28,.15)}
.radar .dot{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:9999px;background:#b91c1c;box-shadow:0 0 0 4px rgba(185,28,28,.2);animation:pop .5s both}
.radar .part{position:absolute;width:4px;height:4px;border-radius:9999px;background:#b91c1c;opacity:0}
.radar.on .part{animation:twinkle 3s ease-in-out infinite}
.indet{position:relative;overflow:hidden}.indet::after{content:"";position:absolute;top:0;bottom:0;width:40%;background:#b91c1c;animation:slide 1.2s ease-in-out infinite}
.fadein{animation:fade .5s both}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%{transform:scale(.15);opacity:.7}100%{transform:scale(1);opacity:0}}
@keyframes pop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}@keyframes twinkle{0%,100%{opacity:0}50%{opacity:.6}}@keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes slide{from{transform:translateX(-100%)}to{transform:translateX(250%)}}
@media (prefers-reduced-motion:reduce){.radar *,.fadein,.indet::after{animation:none!important}}`;

const BADGE: Record<string, [string, string]> = { available: ["Available", "bg-green-100 text-green-800"], stale: ["Availability unknown (30+ days old)", "bg-yellow-100 text-yellow-800"] };
const ago = (iso: string | null) => { if (!iso) return ""; const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); return d <= 0 ? "Updated today" : `Updated ${d} day${d > 1 ? "s" : ""} ago`; };
const pos = (i: number, d: D | null, maxKm: number) => { const a = (i * 137.5 * Math.PI) / 180; const f = d && d.distance_km != null ? Math.min(0.9, 0.18 + (0.72 * d.distance_km) / maxKm) : 0.55; return { x: 50 + f * 50 * Math.cos(a), y: 50 + f * 50 * Math.sin(a) }; };

function Radar({ on, label, donors, maxKm, showDots }: { on: boolean; label: string; donors: D[]; maxKm: number; showDots: boolean }) {
  return (<div className={`radar ${on ? "on" : ""}`} aria-hidden="true">
    {[18, 36, 54].map((i) => <span key={i} className="ring" style={{ inset: `${i}%` }}/>)}
    <span className="pulse"/><span className="pulse p2"/><span className="sweep"/>
    {PARTICLES.map(([x, y, dl], i) => <span key={i} className="part" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${dl}s` }}/>)}
    {showDots && donors.slice(0, 12).map((d, i) => { const p = pos(i, d, maxKm); return <span key={d.id} className="dot" style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${i * 0.12}s` }}/>; })}
    <span className="core">{label}</span>
  </div>);
}

export default function Scan() {
  const [group, setGroup] = useState("O+"); const [district, setDistrict] = useState(""); const [upazila, setUpazila] = useState("");
  const [radius, setRadius] = useState(10); const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null); const [locMsg, setLocMsg] = useState("");
  const [phase, setPhase] = useState<Phase>("idle"); const [err, setErr] = useState(""); const [donors, setDonors] = useState<D[]>([]);
  const [view, setView] = useState<"list" | "map">("list"); const [note, setNote] = useState<{ id: string; ok: boolean; t: string } | null>(null);
  const run = useRef(0); const ctrl = useRef<AbortController | null>(null);
  const maxKm = loc ? radius || Math.max(5, ...donors.map((d) => d.distance_km ?? 0)) : 25;

  function locate() {
    if (!navigator.geolocation) return setLocMsg("Location is not supported on this device. Choose a district instead.");
    setLocMsg("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      (g) => { setLoc({ lat: Math.round(g.coords.latitude * 100) / 100, lng: Math.round(g.coords.longitude * 100) / 100 }); setLocMsg("Location set (rounded to about 1 km, used only for this search)."); },
      () => { setLoc(null); setLocMsg("Location permission denied. Choose a district instead — GPS is optional."); });
  }
  async function start() {
    const id = ++run.current; setPhase("searching"); setErr(""); setDonors([]); setNote(null);
    if (!configured) { setErr("Database unavailable: the site is not connected to Supabase."); return setPhase("error"); }
    ctrl.current?.abort(); const c = new AbortController(); ctrl.current = c;
    const { data, error } = await browserClient().rpc("scan_donors", { p_group: group, p_district: district || null, p_upazila: upazila.trim() || null, p_lat: loc?.lat ?? null, p_lng: loc?.lng ?? null, p_radius_km: loc ? radius : 0, p_limit: 30 }).abortSignal(c.signal);
    if (id !== run.current) return; // cancelled or superseded
    if (error) { setErr("Database unavailable. Please try again in a moment."); return setPhase("error"); }
    setDonors((data ?? []) as D[]);
    setPhase("results"); // the animation ends the moment the real query returns
  }
  function cancel() { run.current++; ctrl.current?.abort(); setPhase("idle"); }
  async function contact(d: D) {
    const sb = browserClient(); const { data: s } = await sb.auth.getSession();
    if (!s.session) return setNote({ id: d.id, ok: false, t: "Please sign in to send a contact request." });
    const { error } = await sb.from("donor_contact_requests").insert({ donor_id: d.id, requester_id: s.session.user.id, blood_group: group });
    setNote({ id: d.id, ok: !error, t: !error ? "Request sent. The donor can answer from their inbox; their reply will appear in your Inbox. No phone number is shared." : error.code === "23505" ? "You already sent a request to this donor today." : "Could not send. You may have reached today's limit, or the donor is no longer available." });
  }

  const busy = phase === "searching";
  const withDist = donors.filter((d) => d.distance_km != null); const noDist = donors.filter((d) => d.distance_km == null);

  return (<div className="mx-auto max-w-3xl"><style>{CSS}</style>
    <h1 className="text-2xl font-bold">Scan for Donors</h1>
    <p className="mt-1 text-xs text-gray-600">This is an online database search for registered, consenting donors. It does not detect phones or people physically nearby.</p>

    {(phase === "idle" || phase === "error") && <form onSubmit={(e) => { e.preventDefault(); start(); }} className="mt-4 grid gap-3 rounded-2xl border bg-brand-50 p-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Blood group needed<select value={group} onChange={(e) => setGroup(e.target.value)} className="input mt-1">{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select></label>
      <label className="text-sm font-medium">District<select value={district} onChange={(e) => setDistrict(e.target.value)} className="input mt-1"><option value="">Any district</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select></label>
      <label className="text-sm font-medium">Upazila / area (optional)<input value={upazila} onChange={(e) => setUpazila(e.target.value)} maxLength={60} className="input mt-1"/></label>
      <label className="text-sm font-medium">Radius (with location)<select value={radius} onChange={(e) => setRadius(Number(e.target.value))} disabled={!loc} className="input mt-1">{[1, 3, 5, 10, 25].map((k) => <option key={k} value={k}>{k} km</option>)}<option value={0}>Any distance</option></select></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button type="button" onClick={locate} className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-700">📍 Use my location (optional)</button><span className="text-xs text-gray-600" role="status">{locMsg}</span></div>
      <button className="btn sm:col-span-2">{phase === "error" ? "Retry scan" : `Scan for ${group} donors`}</button>
      {phase === "error" && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm sm:col-span-2">{err}</p>}
    </form>}

    {busy && <div className="mt-6 text-center"><Radar on label={group} donors={[]} maxKm={maxKm} showDots={false}/>
      <p className="mt-4 font-semibold text-brand-700" role="status">Searching the donor database…</p>
      <div className="indet mx-auto mt-2 h-1.5 w-56 rounded-full bg-brand-50" aria-hidden="true"/>
      <button onClick={cancel} className="mt-4 rounded-lg border px-4 py-2 text-sm font-semibold">Stop scan</button></div>}

    {phase === "results" && <section className="fadein mt-6">
      {donors.length > 0 && <div className="mx-auto mb-4 max-w-[220px]"><Radar on={false} label={group} donors={donors} maxKm={maxKm} showDots/></div>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold" role="status">{donors.length ? `Donors found: ${donors.length}` : "No donors found"}</h2>
        <div className="flex gap-2"><div className="flex overflow-hidden rounded-lg border text-sm" role="group" aria-label="View">{(["list", "map"] as const).map((v) => <button key={v} aria-pressed={view === v} onClick={() => setView(v)} className={`px-3 py-1.5 ${view === v ? "bg-brand-600 text-white" : ""}`}>{v === "list" ? "List" : "Distance map"}</button>)}</div>
          <button onClick={() => setPhase("idle")} className="rounded-lg border px-3 py-1.5 text-sm font-semibold">Search again</button></div></div>
      <p className="mt-1 text-xs text-gray-600">Matched: exact blood group {group}, listed in search, accepts requests, set Available{district ? `, ${district}` : ""}{loc ? `, within ${radius || "any"} km` : ""}. Compatibility is not inferred; confirm with the hospital or blood bank.</p>
      {donors.length === 0 && <div className="mt-4 rounded-xl border p-6 text-center text-gray-600"><p>No consenting, available {group} donors match. Try a wider radius or district.</p></div>}
      {view === "list" && <ul className="mt-4 grid gap-3">{donors.map((d) => { const [lb, cls] = BADGE[d.status] ?? BADGE.stale; return (
        <li key={d.id} className="rounded-xl border p-4"><div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-600 font-bold text-white">{d.blood_group}</span>
          <div className="min-w-0 flex-1"><p className="font-semibold">{d.display_name}</p>
            <p className="text-sm text-gray-600">{d.upazila ? d.upazila + ", " : ""}{d.district}{d.distance_km != null ? ` · about ${d.distance_km} km` : ""}</p>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{lb}</span>
            <p className="mt-1 text-xs text-gray-500">{ago(d.availability_updated_at)}{d.last_donation ? ` · Last donation (self-reported): ${d.last_donation}` : ""}</p></div>
          <button onClick={() => contact(d)} className="btn shrink-0 !px-3 !py-2 text-sm">Request contact</button></div>
          {note?.id === d.id && <p role="status" className={`mt-3 rounded-lg p-2 text-xs ${note.ok ? "bg-green-50" : "bg-yellow-50"}`}>{note.t} {!note.ok && note.t.includes("sign in") && <Link href="/login" className="underline">Sign in</Link>}</p>}
        </li>); })}</ul>}
      {view === "map" && donors.length > 0 && <div className="mt-4"><svg viewBox="0 0 300 300" className="mx-auto w-full max-w-sm" role="img" aria-label="Approximate distance map">
        {[0.25, 0.5, 0.75, 1].map((f) => <g key={f}><circle cx="150" cy="150" r={130 * f} fill="none" stroke="#fecaca"/><text x="153" y={150 - 130 * f + 10} fontSize="8" fill="#991b1b">{Math.round(maxKm * f)} km</text></g>)}
        <circle cx="150" cy="150" r="7" fill="#450a0a"/><text x="150" y="172" fontSize="8" textAnchor="middle">You</text>
        {withDist.map((d, i) => { const a = (i * 137.5 * Math.PI) / 180; const r = 130 * Math.min(1, Math.max(0.06, (d.distance_km ?? 0) / maxKm)); return <g key={d.id}><circle cx={150 + r * Math.cos(a)} cy={150 + r * Math.sin(a)} r="9" fill="#b91c1c"/><text x={150 + r * Math.cos(a)} y={153 + r * Math.sin(a)} fontSize="9" fill="#fff" textAnchor="middle">{i + 1}</text></g>; })}</svg>
        <p className="mt-2 text-xs text-gray-600">Schematic only: distance from you is approximate; direction is not real, and no exact locations are stored or shown.</p>
        <ol className="mt-2 text-sm">{withDist.map((d, i) => <li key={d.id}>{i + 1}. {d.display_name} · {d.blood_group} · about {d.distance_km} km</li>)}</ol>
        {noDist.length > 0 && <p className="mt-2 text-xs text-gray-600">{noDist.length} donor(s) have not shared a location, so they are not on the map. See the List view.</p>}</div>}
      {view === "map" && donors.length > 0 && withDist.length === 0 && <p className="mt-3 text-sm text-gray-600">No matching donor has shared an approximate location (or you did not share yours). Use List view.</p>}
    </section>}
  </div>);
}
