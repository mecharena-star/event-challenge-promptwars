import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jashn: plan a wedding, birthday or community event",
  description:
    "A planning assistant that turns your event details into a budget, a dated timeline, a vendor checklist and ideas.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Render per request so the CSP nonce issued in proxy.ts reaches Next's own scripts.
  await connection();
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to the planner
        </a>
        {children}
      </body>
    </html>
  );
}
