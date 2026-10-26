import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";
import Header from "@/components/Header";

export const metadata = { title: "Find the donor", description: "Every Drop Counts. Every Life Matters. Find blood donors in Bangladesh." };

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
      <body>
        <Header />
        <main className="mx-auto max-w-5xl p-4">{children}</main>
        <footer className="mx-auto mt-16 max-w-5xl border-t p-4 text-xs text-gray-600">
          Find the donor connects people; it gives no medical advice and cannot guarantee blood availability or donor eligibility. Always confirm with a hospital or blood bank.{" "}
          <Link href="/donors" className="underline">Browse donors</Link>
        </footer>
      </body>
    </html>
  );
}
