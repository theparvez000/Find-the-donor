import { BLOOD_GROUPS, DISTRICTS } from "@/lib/data";
import { supabase, supabaseConfigured } from "@/lib/supabase";
async function submit(fd: FormData) {
  "use server";
  const { redirect } = await import("next/navigation");
  const s = (k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);
  const group = s("blood_group", 4), district = s("district", 40), units = Number(fd.get("units"));
  const row = { patient_name: s("patient_name", 80), blood_group: group, units, hospital: s("hospital", 120), district, contact: s("contact", 60), details: s("details", 300) };
  const valid = (BLOOD_GROUPS as readonly string[]).includes(group) && DISTRICTS.includes(district) && Number.isInteger(units) && units >= 1 && units <= 10 && row.patient_name && row.hospital && row.contact && fd.get("consent") === "on";
  if (!valid || !supabaseConfigured()) redirect("/request?status=error");
  const { error } = await supabase().from("blood_requests").insert(row);
  redirect(error ? "/request?status=error" : "/request?status=ok");
}
export default async function Request({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  return (<div className="max-w-xl">
    <h1 className="text-2xl font-bold">Request Blood</h1>
    <p className="mt-1 text-sm text-gray-600">Requests are reviewed by a moderator before they appear publicly. Your contact is never published.</p>
    {status === "ok" && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm">Request submitted and awaiting review.</p>}
    {status === "error" && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm">Could not submit. Check all fields and try again.</p>}
    <form action={submit} className="mt-4 grid gap-3">
      <label className="text-sm font-medium">Patient name<input name="patient_name" required maxLength={80} className="input mt-1"/></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">Blood group<select name="blood_group" className="input mt-1">{BLOOD_GROUPS.map(g=><option key={g}>{g}</option>)}</select></label>
        <label className="text-sm font-medium">Units (bags)<input name="units" type="number" min={1} max={10} defaultValue={1} className="input mt-1"/></label></div>
      <label className="text-sm font-medium">Hospital<input name="hospital" required maxLength={120} className="input mt-1"/></label>
      <label className="text-sm font-medium">District<select name="district" className="input mt-1">{DISTRICTS.map(d=><option key={d}>{d}</option>)}</select></label>
      <label className="text-sm font-medium">Contact (phone or email)<input name="contact" required maxLength={60} className="input mt-1"/></label>
      <label className="text-sm font-medium">Details (optional)<textarea name="details" maxLength={300} className="input mt-1"/></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" name="consent" required/>I consent to this request being reviewed and shared with matching donors.</label>
      <button className="btn">Submit request</button>
    </form></div>);
}
