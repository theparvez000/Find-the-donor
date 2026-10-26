"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { browserClient } from "@/lib/browser";

type R = { id: string; patient_name: string; blood_group: string; units: number; hospital: string; district: string; contact: string; details: string | null; status: string; created_at: string };
type L = { id: string; target_id: string; old_status: string; new_status: string; created_at: string };
const STATUSES = ["pending", "approved", "rejected", "fulfilled", "cancelled"];
const NEXT: Record<string, [string, string][]> = { pending: [["approved", "Approve"], ["rejected", "Reject"]], approved: [["fulfilled", "Mark fulfilled"], ["cancelled", "Cancel"]] };
const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export default function Admin() {
  const sb = browserClient();
  const [state, setState] = useState<"loading" | "anon" | "denied" | "admin">("loading");
  const [status, setStatus] = useState("pending"); const [rows, setRows] = useState<R[]>([]); const [log, setLog] = useState<L[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({}); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const load = useCallback(async (st: string) => {
    const a = await sb.from("blood_requests").select("id,patient_name,blood_group,units,hospital,district,contact,details,status,created_at").eq("status", st).order("created_at", { ascending: false }).limit(50);
    const b = await sb.from("admin_audit_logs").select("id,target_id,old_status,new_status,created_at").order("created_at", { ascending: false }).limit(15);
    const c = await Promise.all(STATUSES.map((s) => sb.from("blood_requests").select("id", { count: "exact", head: true }).eq("status", s)));
    if (a.error) setMsg({ ok: false, t: "Could not load requests." });
    setRows((a.data ?? []) as R[]); setLog((b.data ?? []) as L[]);
    setCounts(Object.fromEntries(STATUSES.map((s, i) => [s, c[i].count ?? 0])));
  }, [sb]);

  useEffect(() => { (async () => {
    const { data } = await sb.auth.getSession(); const id = data.session?.user.id;
    if (!id) return setState("anon");
    const p = await sb.from("profiles").select("role").eq("id", id).maybeSingle();
    if (p.data?.role !== "admin") return setState("denied");
    setState("admin"); await load("pending"); })(); }, [sb, load]);

  async function move(id: string, to: string) {
    const { data, error } = await sb.from("blood_requests").update({ status: to }).eq("id", id).select("id");
    if (error || !data?.length) return setMsg({ ok: false, t: "Not allowed or could not update." });
    setMsg({ ok: true, t: `Request marked ${to}.` }); await load(status);
  }
  async function pick(s: string) { setStatus(s); setMsg(null); await load(s); }

  if (state === "loading") return <p className="py-10 text-center text-gray-600">Loading…</p>;
  if (state === "anon") return <div className="py-10 text-center"><p>Please sign in.</p><Link href="/login" className="btn mt-4">Sign in</Link></div>;
  if (state === "denied") return <p className="py-10 text-center text-gray-700">This page is for administrators only.</p>;

  return (<div className="mx-auto max-w-3xl">
    <h1 className="text-2xl font-bold">Admin: blood requests</h1>
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Status">{STATUSES.map((s) => <button key={s} aria-pressed={status === s} onClick={() => pick(s)} className={`rounded-full border px-3 py-1.5 text-sm font-medium capitalize ${status === s ? "border-brand-600 bg-brand-600 text-white" : ""}`}>{s} ({counts[s] ?? 0})</button>)}</div>
    {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-3 rounded-lg p-3 text-sm ${msg.ok ? "bg-green-50" : "bg-red-50"}`}>{msg.t}</p>}
    <div className="mt-4 grid gap-3">
      {rows.length === 0 && <p className="rounded-xl border p-6 text-center text-gray-600">No {status} requests.</p>}
      {rows.map((r) => <div key={r.id} className="rounded-xl border p-4">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-brand-600 font-bold text-white">{r.blood_group}</span>
          <div><p className="font-semibold">{r.units} bag(s) for {r.patient_name}</p><p className="text-sm text-gray-600">{r.hospital}, {r.district}</p></div></div>
        <p className="mt-2 text-sm">Contact (private, admin only): <b>{r.contact}</b></p>
        {r.details && <p className="mt-1 text-sm text-gray-700">{r.details}</p>}
        <p className="mt-1 text-xs text-gray-500">Submitted {fmt(r.created_at)}. Verify with the hospital before approving.</p>
        <div className="mt-3 flex flex-wrap gap-2">{(NEXT[r.status] ?? []).map(([to, l]) => <button key={to} onClick={() => move(r.id, to)} className={to === "approved" || to === "fulfilled" ? "btn !py-1.5 text-sm" : "rounded-lg border px-3 py-1.5 text-sm font-medium"}>{l}</button>)}</div>
      </div>)}
    </div>
    <h2 className="mt-8 font-semibold">Recent moderation log</h2>
    <ul className="mt-2 grid gap-1 text-sm text-gray-700">{log.length === 0 && <li className="text-gray-500">No actions yet.</li>}{log.map((l) => <li key={l.id}>{fmt(l.created_at)}: {l.old_status} → <b>{l.new_status}</b> <span className="text-xs text-gray-500">(request {l.target_id.slice(0, 8)})</span></li>)}</ul>
  </div>);
}
