"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { browserClient } from "@/lib/browser";
import { BLOOD_GROUPS, DISTRICTS } from "@/lib/data";

const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const URGENCY: Array<[string, string]> = [["normal", "Normal"], ["urgent", "Urgent"], ["emergency", "Emergency"]];

export default function RequestBlood() {
  const sb = browserClient();
  const [uid, setUid] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ signedIn: boolean } | null>(null);
  const [urgency, setUrgency] = useState("normal");

  useEffect(() => {
    if (!configured) { setReady(true); return; }
    sb.auth.getSession().then(({ data }) => { setUid(data.session?.user.id ?? null); setReady(true); });
  }, [sb]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    const fd = new FormData(e.currentTarget);
    const s = (k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);
    const group = s("blood_group", 4), district = s("district", 40), units = Number(fd.get("units"));
    const row = { patient_name: s("patient_name", 80), blood_group: group, units, hospital: s("hospital", 120), district, contact: s("contact", 60), details: s("details", 300) || null, urgency };
    if (!(BLOOD_GROUPS as readonly string[]).includes(group) || !DISTRICTS.includes(district)) return setErr("Choose a valid blood group and district.");
    if (!Number.isInteger(units) || units < 1 || units > 10) return setErr("Units must be a whole number from 1 to 10.");
    if (!row.patient_name || !row.hospital || row.contact.length < 3) return setErr("Please fill in patient name, hospital and a contact.");
    if (fd.get("consent") !== "on") return setErr("Please tick the consent box.");
    let required_by: string | null = null;
    const raw = String(fd.get("required_by") ?? "");
    if (raw) {
      const t = new Date(raw);
      if (Number.isNaN(t.getTime()) || t.getTime() < Date.now() - 60000) return setErr("The required-by time must be in the future.");
      required_by = t.toISOString();
    }
    if (!configured) return setErr("Database unavailable: the site is not connected to Supabase.");
    setBusy(true);
    const { error } = await sb.from("blood_requests").insert({ ...row, required_by, requester_id: uid });
    setBusy(false);
    if (error) {
      const m = error.message || "";
      if (m.includes("duplicate request")) return setErr("A similar request (same contact, hospital and blood group) is already open. Please do not submit it again.");
      if (m.includes("request limit")) return setErr("Too many requests from this contact in the last 24 hours. Please try again later.");
      return setErr("Could not submit. Check all fields and try again.");
    }
    setDone({ signedIn: !!uid });
  }

  if (done) return (<div className="mx-auto max-w-xl">
    <div role="status" className="card bg-green-50">
      <h1 className="text-xl font-bold">Request submitted</h1>
      <p className="mt-2 text-sm">A moderator will review it before it appears publicly. Your contact is never published.</p>
      {done.signedIn
        ? <p className="mt-2 text-sm">You can follow its status on <Link href="/track" className="font-semibold underline">My Requests</Link>.</p>
        : <p className="mt-2 text-sm">You were not signed in, so this request cannot be tracked here. <Link href="/login" className="font-semibold underline">Sign in</Link> before your next request to follow its status.</p>}
      <p className="mt-2 text-xs text-gray-600">Submitting does not guarantee a donor. Please also contact the hospital or blood bank directly.</p>
    </div></div>);

  return (<div className="mx-auto max-w-xl">
    <h1 className="text-2xl font-bold">Request Blood</h1>
    <p className="mt-1 text-sm text-gray-600">Requests are reviewed by a moderator before they appear publicly. Your contact is never published.</p>
    {ready && !uid && <p className="mt-3 rounded-lg bg-yellow-50 p-3 text-sm">You are not signed in. You can still submit, but you will not be able to track this request. <Link href="/login" className="font-semibold underline">Sign in</Link></p>}
    {ready && uid && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm">Signed in. You will be able to follow this request on <Link href="/track" className="font-semibold underline">My Requests</Link>.</p>}
    {urgency === "emergency" && <p role="note" className="mt-3 rounded-lg border border-brand-600 bg-brand-50 p-3 text-sm">For a life-threatening emergency, go to the hospital emergency department or call the national emergency number 999. This site cannot guarantee that a donor will respond in time.</p>}
    {err && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm">{err}</p>}
    <form onSubmit={submit} className="mt-4 grid gap-3">
      <label className="text-sm font-medium">Patient name<input name="patient_name" required maxLength={80} className="input mt-1"/></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">Blood group<select name="blood_group" className="input mt-1">{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select></label>
        <label className="text-sm font-medium">Units (bags)<input name="units" type="number" min={1} max={10} defaultValue={1} className="input mt-1"/></label></div>
      <fieldset className="text-sm font-medium"><legend>Urgency</legend>
        <div className="mt-1 flex overflow-hidden rounded-lg border">{URGENCY.map(([v, l]) => <button type="button" key={v} aria-pressed={urgency === v} onClick={() => setUrgency(v)} className={`flex-1 px-3 py-2 ${urgency === v ? "bg-brand-600 text-white" : ""}`}>{l}</button>)}</div></fieldset>
      <label className="text-sm font-medium">Hospital<input name="hospital" required maxLength={120} className="input mt-1"/></label>
      <label className="text-sm font-medium">District<select name="district" className="input mt-1">{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select></label>
      <label className="text-sm font-medium">Required by (optional)<input name="required_by" type="datetime-local" className="input mt-1"/></label>
      <label className="text-sm font-medium">Contact (phone or email)<input name="contact" required minLength={3} maxLength={60} className="input mt-1"/></label>
      <label className="text-sm font-medium">Details (optional)<textarea name="details" maxLength={300} className="input mt-1"/></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" name="consent" required/>I consent to this request being reviewed and shared with matching donors.</label>
      <button className="btn" disabled={busy}>{busy ? "Submitting…" : "Submit request"}</button>
      <p className="text-xs text-gray-600">Hospitals or blood-bank staff must confirm blood compatibility and donor eligibility. This site cannot.</p>
    </form></div>);
}
