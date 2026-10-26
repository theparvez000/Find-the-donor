"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { browserClient } from "@/lib/browser";

type Got = { id: string; blood_group: string; created_at: string; response: string | null; responded_at: string | null };
type Sent = Got & { donor_name: string };
const LABEL: Record<string, string> = { can_help: "I can help", cannot_help: "Cannot help right now", need_details: "Need more details" };
const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export default function Inbox() {
  const sb = browserClient();
  const [uid, setUid] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"got" | "sent">("got");
  const [got, setGot] = useState<Got[]>([]); const [sent, setSent] = useState<Sent[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const load = useCallback(async (id: string) => {
    const a = await sb.from("donor_contact_requests").select("id,blood_group,created_at,response,responded_at").eq("donor_id", id).order("created_at", { ascending: false }).limit(50);
    const b = await sb.rpc("my_sent_requests");
    if (a.error || b.error) setMsg({ ok: false, t: "Could not load your requests. Please try again." });
    setGot((a.data ?? []) as Got[]); setSent((b.data ?? []) as Sent[]);
  }, [sb]);

  useEffect(() => { (async () => {
    const { data } = await sb.auth.getSession(); const id = data.session?.user.id ?? null; setUid(id);
    if (id) await load(id); setLoading(false); })(); }, [sb, load]);

  async function respond(id: string, response: string) {
    const { error } = await sb.from("donor_contact_requests").update({ response }).eq("id", id);
    if (error) return setMsg({ ok: false, t: "Could not save your answer." });
    setMsg({ ok: true, t: "Answer saved. The requester sees only your first name and this answer, not your contact details." });
    if (uid) await load(uid);
  }

  if (loading) return <p className="py-10 text-center text-gray-600">Loading…</p>;
  if (!uid) return <div className="py-10 text-center"><p>Please sign in to see your requests.</p><Link href="/login" className="btn mt-4">Sign in</Link></div>;

  return (<div className="mx-auto max-w-2xl">
    <h1 className="text-2xl font-bold">Requests</h1>
    <div className="mt-3 flex overflow-hidden rounded-lg border text-sm" role="group" aria-label="Inbox tabs">
      {([["got", `Received (${got.length})`], ["sent", `Sent (${sent.length})`]] as const).map(([v, l]) => <button key={v} aria-pressed={tab === v} onClick={() => setTab(v)} className={`flex-1 px-3 py-2 ${tab === v ? "bg-brand-600 text-white" : ""}`}>{l}</button>)}
    </div>
    {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-3 rounded-lg p-3 text-sm ${msg.ok ? "bg-green-50" : "bg-red-50"}`}>{msg.t}</p>}

    {tab === "got" && <div className="mt-4 grid gap-3">
      {got.length === 0 && <p className="rounded-xl border p-6 text-center text-gray-600">No requests yet. Only donors who are listed, accept requests and are set to Available can receive them.</p>}
      {got.map((r) => <div key={r.id} className="rounded-xl border p-4">
        <p className="font-semibold">Someone needs {r.blood_group} blood</p>
        <p className="text-xs text-gray-500">Sent {fmt(r.created_at)} · the requester's identity is not shared with you</p>
        {r.response && <p className="mt-2 text-sm">Your answer: <b>{LABEL[r.response]}</b> <span className="text-xs text-gray-500">({r.responded_at ? fmt(r.responded_at) : ""})</span></p>}
        <div className="mt-3 flex flex-wrap gap-2">{Object.entries(LABEL).map(([k, l]) => <button key={k} onClick={() => respond(r.id, k)} aria-pressed={r.response === k} className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${r.response === k ? "border-brand-600 bg-brand-600 text-white" : ""}`}>{l}</button>)}</div>
      </div>)}
      <p className="text-xs text-gray-500">Answering does not confirm medical eligibility. Blood-bank staff or a doctor decide that. Sharing contact details is not built yet.</p>
    </div>}

    {tab === "sent" && <div className="mt-4 grid gap-3">
      {sent.length === 0 && <p className="rounded-xl border p-6 text-center text-gray-600">You have not sent any requests. Use <Link href="/scan" className="underline">Scan for Donors</Link>.</p>}
      {sent.map((r) => <div key={r.id} className="rounded-xl border p-4">
        <p className="font-semibold">{r.donor_name} · {r.blood_group}</p>
        <p className="text-xs text-gray-500">Sent {fmt(r.created_at)}</p>
        <p className="mt-2 text-sm">{r.response ? <>Answer: <b>{LABEL[r.response]}</b></> : "Waiting for an answer"}</p>
      </div>)}
      <p className="text-xs text-gray-500">Donors answer at their own pace. Always confirm with the hospital or blood bank.</p>
    </div>}
  </div>);
}
