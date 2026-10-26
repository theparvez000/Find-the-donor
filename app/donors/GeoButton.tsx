"use client";
import { useRouter, useSearchParams } from "next/navigation";
export default function GeoButton() {
  const r = useRouter(); const sp = useSearchParams();
  function go() {
    if (!navigator.geolocation) return alert("Location is not supported. Please choose a district instead.");
    navigator.geolocation.getCurrentPosition((p) => {
      const q = new URLSearchParams(sp.toString());
      q.set("lat", p.coords.latitude.toFixed(2)); q.set("lng", p.coords.longitude.toFixed(2)); q.delete("page");
      r.push("/donors?" + q.toString());
    }, () => alert("Location permission denied. You can still choose a district."));
  }
  return <button type="button" onClick={go} className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-700">📍 Use my location</button>;
}
