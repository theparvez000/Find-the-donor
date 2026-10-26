"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { browserClient } from "@/lib/browser";

type Req = { id: string; blood_group: string; units: number; hospital: string; district: string; urgency: string; required_by: string | null; status: string; created_at: string };
type Ev = { request_id: string; status: string; created_at: string };
const LABEL: Record<string, string> = { submitted: "Request submitted", approved: "Approved by a moderator", rejected: "Not approved by a moderator", fulfilled: "Marked fulfilled", cancelled: "Cancelled" };
const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

function Timeline({ req, events }: { req: Req; events: Ev[] }) {
  return (<ol className="mt-4 ml-2 border-l-2 border-brand-100 pl-5" aria-label="Request timeline">
    {events.map((e, i) => (<li key={`${e.status}-${i}`} className="relative pb-4">
      <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ${e.status === "rejected" || e.status === "cancelled" ? "bg-gray-500" : "bg-brand-600"}`} aria-hidden="true"/>
      <p className="text-sm font-semibold">{LABEL[e.status] ?? e.status}</p>
      <p className="text-xs text-gray-500">{fmt(e.created_at)}</p>
    </li>))}
    {req.status === "pending" && <li className="relative pb-1">
      <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-gray-300" aria-hidden="true"/>
      <p className="text-sm font-semibold text-gray-600">Waiting for moderator review</p>
    </li>}
  </ol>);
}

export default function Track() {
  const sb = browserClient();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const load = useCallback(async (id: string) => {
    const r = await sb.from("blood_requests").select("id,blood_group,units,hospital,district,urgency,required_by,status,created_at").eq("requester_id", id).order("created_at", { ascending: false }).limit(50);
    if (r.error) { setMsg({ ok: false, t: "Could not load your requests. Please try again." }); return; }
    const list = (r.data ?? []) as Req[];
    setReqs(list);
    if (list.length === 0) { setEvents([]); return; }
    const e = await sb.from("request_events").select("request_id,status,created_at").in("request_id", list.map((x) => x.id)).order("created_at", { ascending: true });
    if (e.error) setMsg({ ok: false, t: "Could not load the timeline. Please try again." });
    setEvents((e.data ?? []) as Ev[]);
  }, [sb]);

  useEffect(() => { (async () => {
    const { data } = await sb.auth.getSession();
    const id = data.session?.user.id ?? null;
    setUid(id);
    if (id) await load(id);
    setLoading(false);
  })(); }, [sb, load]);

  async function cancel(id: string) {
    if (!window.confirm("Cancel this request?")) return;
    const { data, error } = await sb.from("blood_requests").update({ status: "cancelled" }).eq("id", id).select("id");
    if (error || !data || data.length === 0) return setMsg({ ok: false, t: "Could not cancel this request." });
    setMsg({ ok: true, t: "Request cancelled." });
    if (uid) await load(uid);
  }

  if (loading) return <p className="py-10 text-center text-gray-600">Loading…</p>;
  if (!uid) return <div className="py-10 text-center"><p>Please sign in to track your blood requests.</p><Link href="/login" className="btn mt-4">Sign in</Link></div>;

  return (<div className="mx-auto max-w-2xl">
    <h1 className="text-2xl font-bold">My Requests</h1>
    <p className="mt-1 text-sm text-gray-600">Only requests you submitted while signed in appear here.</p>
    {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-3 rounded-lg p-3 text-sm ${msg.ok ? "bg-green-50" : "bg-red-50"}`}>{msg.t}</p>}
    {reqs.length === 0 && <div className="mt-4 rounded-xl border p-6 text-center text-gray-600"><p>You have not submitted a request while signed in.</p><Link href="/request" className="btn mt-4">Request blood</Link></div>}
    <div className="mt-4 grid gap-4">{reqs.map((r) => (<article key={r.id} className="card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="font-semibold">{r.blood_group} · {r.units} bag{r.units > 1 ? "s" : ""} · {r.hospital}, {r.district}</h2>
          <p className="text-xs text-gray-500">Submitted {fmt(r.created_at)}{r.required_by ? ` · needed by ${fmt(r.required_by)}` : ""}</p></div>
        {r.urgency !== "normal" && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">{r.urgency === "emergency" ? "Emergency" : "Urgent"}</span>}
      </div>
      <Timeline req={r} events={events.filter((e) => e.request_id === r.id)}/>
      {r.status === "approved" && <p className="mt-2 text-xs text-gray-600">Your request is listed publicly without your contact. Donor matching is not automatic: use <Link href="/scan" className="underline">Scan for Donors</Link> and confirm with the hospital.</p>}
      {(r.status === "pending" || r.status === "approved") && <button onClick={() => cancel(r.id)} className="mt-3 rounded-lg border px-3 py-1.5 text-sm font-semibold">Cancel request</button>}
    </article>))}</div>
  </div>);
}
