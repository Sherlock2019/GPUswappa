import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getLocale, getT } from "@/lib/i18n/server";
import { getActor } from "@/lib/auth";
import { unreadCount } from "@/lib/services/notifications";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: { default: "AI-GPU-Swapper — GPU Swap Vietnam", template: "%s · AI-GPU-Swapper" },
  description: "B2B marketplace and managed broker for GPU infrastructure already located in Vietnam.",
  robots: process.env.DEMO_MODE === "true" ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = { themeColor: "#0a1633", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, t, actor, settings] = await Promise.all([getLocale(), getT(), getActor(), getSettings()]);
  const unread = await unreadCount(actor);
  const demo = process.env.DEMO_MODE === "true";
  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
          {t("common.skipToContent")}
        </a>
        {demo && (
          <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-navy-950" role="note">
            {t("common.demoBanner")}
          </div>
        )}
        <SiteHeader t={t} locale={locale} actor={actor} unread={unread} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter t={t} settings={settings} />
      </body>
    </html>
  );
}
