import Link from "next/link";
import { BLOOD_GROUPS, DISTRICTS } from "@/lib/data";
export default function Home() {
  return (<>
    <section className="py-12 text-center">
      <h1 className="text-4xl font-extrabold text-brand-900 sm:text-5xl">Every Drop Counts.<br/>Every Life Matters.</h1>
      <p className="mx-auto mt-4 max-w-xl text-gray-600">Find willing blood donors across Bangladesh, or post a blood request that is reviewed before it goes public.</p>
      <div className="mt-6 flex justify-center gap-3"><Link href="/scan" className="btn">Scan for Donors</Link><Link href="/request" className="rounded-lg border border-brand-600 px-5 py-2.5 font-semibold text-brand-600">Request Blood</Link></div>
    </section>
    <form action="/donors" className="grid gap-3 rounded-2xl border bg-brand-50 p-5 sm:grid-cols-3">
      <label className="text-sm font-medium">Blood group<select name="group" className="input mt-1">{BLOOD_GROUPS.map(g=><option key={g}>{g}</option>)}</select></label>
      <label className="text-sm font-medium">District<select name="district" className="input mt-1"><option value="">Any</option>{DISTRICTS.map(d=><option key={d}>{d}</option>)}</select></label>
      <button className="btn self-end">Browse donors</button>
    </form>
    <section className="mt-10 grid gap-4 sm:grid-cols-3">
      {[["1. Scan","Search registered donors by blood group and area."],["2. Request","Submit a request. Moderators review it before it is public."],["3. Confirm","Always confirm compatibility with the hospital or blood bank."]].map(([t,d])=>
      <div key={t} className="rounded-xl border p-4"><h2 className="font-semibold">{t}</h2><p className="mt-1 text-sm text-gray-600">{d}</p></div>)}
    </section>
  </>);
}
