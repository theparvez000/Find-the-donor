import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";
export const metadata = { title: "Find the donor", description: "Every Drop Counts. Every Life Matters. Find blood donors in Bangladesh." };
export default function Root({ children }: { children: ReactNode }) {
  return (<html lang="en"><body>
    <header className="border-b"><nav className="mx-auto flex max-w-5xl items-center justify-between p-4" aria-label="Main">
      <Link href="/" className="text-lg font-bold text-brand-700">🩸 Find the donor</Link>
      <div className="flex gap-4 text-sm font-medium"><Link href="/donors">Find Donors</Link><Link href="/request">Request Blood</Link></div>
    </nav></header>
    <main className="mx-auto max-w-5xl p-4">{children}</main>
    <footer className="mx-auto mt-16 max-w-5xl border-t p-4 text-xs text-gray-600">Find the donor connects people; it gives no medical advice and cannot guarantee blood availability or donor eligibility. Always confirm with a hospital or blood bank.</footer>
  </body></html>);
}
