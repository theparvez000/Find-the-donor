"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { browserClient } from "@/lib/browser";

type N = { id: string; title: string; body: string; link: string | null; read_at: string | null; created_at: string };
const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export default function Notifications() {
  const sb = browserClient();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<N[]>([]);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await sb.from("notifications").select("id,title,body,link,read_at,created_at").order("created_at", { ascending: false }).limit(50);
    if (error) setErr("Could not load notifications. Please try again.");
    setItems((data ?? []) as N[]);
  }, [sb]);

  useEffect(() => { (async () => {
    const { data } = await sb.auth.getSession();
    const id = data.session?.user.id ?? null;
    setUid(id);
    if (id) await load();
    setLoading(false);
  })(); }, [sb, load]);

  async function markRead(id: string) {
    const { error } = await sb.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    if (error) return setErr("Could not update the notification.");
    await load();
  }
  async function markAll() {
    if (!uid) return;
    const { error } = await sb.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", uid).is("read_at", null);
    if (error) return setErr("Could not update notifications.");
    await load();
  }

  if (loading) return <p className="py-10 text-center text-gray-600">Loading…</p>;
  if (!uid) return <div className="py-10 text-center"><p>Please sign in to see your notifications.</p><Link href="/login" className="btn mt-4">Sign in</Link></div>;

  const unread = items.filter((n) => !n.read_at).length;
  const shown = tab === "unread" ? items.filter((n) => !n.read_at) : items;

  return (<div className="mx-auto max-w-2xl">
    <div className="flex items-center justify-between gap-2"><h1 className="text-2xl font-bold">Notifications</h1>
      {unread > 0 && <button onClick={markAll} className="rounded-lg border px-3 py-1.5 text-sm font-semibold">Mark all read</button>}</div>
    <div className="mt-3 flex overflow-hidden rounded-lg border text-sm" role="group" aria-label="Filter">
      {([["all", `All (${items.length})`], ["unread", `Unread (${unread})`]] as const).map(([v, l]) => <button key={v} aria-pressed={tab === v} onClick={() => setTab(v)} className={`flex-1 px-3 py-2 ${tab === v ? "bg-brand-600 text-white" : ""}`}>{l}</button>)}
    </div>
    {err && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm">{err}</p>}
    {shown.length === 0 && <p className="mt-4 rounded-xl border p-6 text-center text-gray-600">{tab === "unread" ? "No unread notifications." : "No notifications yet. You will see donor responses, new requests sent to you, and updates to your blood requests here."}</p>}
    <ul className="mt-4 grid gap-3">{shown.map((n) => (<li key={n.id} className={`card ${n.read_at ? "" : "border-brand-500 bg-brand-50"}`}>
      <div className="flex items-start justify-between gap-3"><div className="min-w-0">
        <p className="font-semibold">{!n.read_at && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand-600" aria-label="Unread"/>}{n.title}</p>
        <p className="mt-1 text-sm text-gray-700">{n.body}</p><p className="mt-1 text-xs text-gray-500">{fmt(n.created_at)}</p></div>
        <div className="flex shrink-0 flex-col gap-2">
          {n.link && <Link href={n.link} onClick={() => { if (!n.read_at) markRead(n.id); }} className="btn !px-3 !py-1.5 text-sm">Open</Link>}
          {!n.read_at && <button onClick={() => markRead(n.id)} className="rounded-lg border px-3 py-1.5 text-sm font-semibold">Mark read</button>}
        </div></div>
    </li>))}</ul>
  </div>);
}
