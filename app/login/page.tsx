"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/browser";
export default function Login() {
  const r = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMsg("");
    const fd = new FormData(e.currentTarget);
    const cred = { email: String(fd.get("email")), password: String(fd.get("password")) };
    const sb = browserClient();
    const { data, error } = mode === "in" ? await sb.auth.signInWithPassword(cred) : await sb.auth.signUp(cred);
    setBusy(false);
    if (error) return setMsg(error.message);
    if (data.session) r.push("/dashboard"); else setMsg("Check your email to confirm your account, then sign in.");
  }
  return (<div className="mx-auto max-w-sm">
    <h1 className="text-2xl font-bold">{mode === "in" ? "Sign in" : "Create account"}</h1>
    <form onSubmit={go} className="mt-4 grid gap-3">
      <label className="text-sm font-medium">Email<input name="email" type="email" required autoComplete="email" className="input mt-1"/></label>
      <label className="text-sm font-medium">Password<input name="password" type="password" required minLength={8} autoComplete={mode === "in" ? "current-password" : "new-password"} className="input mt-1"/></label>
      <button className="btn" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Sign up"}</button>
    </form>
    {msg && <p role="alert" className="mt-3 rounded-lg bg-yellow-50 p-3 text-sm">{msg}</p>}
    <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 text-sm text-brand-700 underline">{mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}</button>
  </div>);
}
