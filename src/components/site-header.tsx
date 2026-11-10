import Link from "next/link";
import type { T, Locale } from "@/lib/i18n";
import type { Actor } from "@/lib/rbac";
import { logoutAction, setLocaleAction } from "@/app/actions/auth";

function Logo({ t }: { t: T }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label={t("common.brand")}>
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <rect x="1" y="1" width="32" height="32" rx="8" fill="#0f2147" />
        <rect x="7" y="11" width="20" height="12" rx="2" fill="none" stroke="#5a8bff" strokeWidth="2" />
        <circle cx="13" cy="17" r="2.5" fill="#2dd4bf" />
        <circle cx="21" cy="17" r="2.5" fill="#2dd4bf" />
        <path d="M9 23v3M13 23v3M17 23v3" stroke="#5a8bff" strokeWidth="1.6" />
      </svg>
      <span className="leading-tight">
        <span className="block text-base font-bold text-white">{t("common.brand")}</span>
        <span className="block text-[10px] uppercase tracking-wider text-teal-400">{t("common.operator")}</span>
      </span>
    </Link>
  );
}

export function SiteHeader({ t, locale, actor, unread }: { t: T; locale: Locale; actor: Actor; unread: number }) {
  const nav: [string, string][] = [
    ["/marketplace", t("nav.marketplace")],
    ["/new-gpus", t("nav.newMarket")],
    ["/sell", t("nav.sell")],
    ["/requests", t("nav.requests")],
    ["/swap", t("nav.swap")],
    ["/services", t("nav.services")],
    ["/why", t("nav.why")],
    ["/how-it-works", t("nav.howItWorks")],
    ["/trust", t("nav.trust")],
  ];
  const staff = actor && ["ADMIN", "REVIEWER", "BROKER"].includes(actor.role);

  const langSwitch = (
    <form action={setLocaleAction} className="flex items-center rounded-lg border border-navy-600 p-0.5 text-xs" aria-label={t("common.language")}>
      {(["vi", "en"] as const).map((l) => (
        <button key={l} name="locale" value={l} aria-pressed={locale === l} className={`rounded-md px-2 py-1 font-semibold uppercase ${locale === l ? "bg-electric-600 text-white" : "text-slate-300 hover:text-white"}`}>
          {l === "vi" ? "VI" : "EN"}
        </button>
      ))}
    </form>
  );

  const userBox = actor ? (
    <div className="flex items-center gap-2">
      <Link href="/dashboard/notifications" className="relative rounded-lg p-2 text-slate-300 hover:text-white" aria-label={`${t("common.notifications")} (${unread})`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
        </svg>
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-teal-500 px-1.5 text-[10px] font-bold text-navy-950">{unread}</span>}
      </Link>
      {staff && (
        <Link href="/admin" className="btn btn-sm border border-teal-500 text-teal-400 hover:bg-teal-500 hover:text-navy-950">
          {t("common.admin")}
        </Link>
      )}
      <Link href="/dashboard" className="btn btn-sm bg-electric-600 text-white hover:bg-electric-500">
        {t("common.dashboard")}
      </Link>
      <form action={logoutAction}>
        <button className="btn btn-sm text-slate-300 hover:text-white">{t("common.signOut")}</button>
      </form>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Link href="/auth/login" className="btn btn-sm text-slate-200 hover:text-white">
        {t("common.signIn")}
      </Link>
      <Link href="/auth/register" className="btn btn-sm bg-electric-600 text-white hover:bg-electric-500">
        {t("common.register")}
      </Link>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-navy-700 bg-navy-900/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo t={t} />
        <nav aria-label="Main" className="hidden 2xl:block">
          <ul className="flex items-center gap-1">
            {nav.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium text-slate-200 hover:bg-navy-800 hover:text-white">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          {langSwitch}
          {userBox}
        </div>
        {/* Mobile / tablet menu — works without JavaScript */}
        <details className="group relative 2xl:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-navy-600 px-3 py-2 text-sm text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {t("common.menu")}
          </summary>
          <div className="absolute right-0 mt-2 w-72 rounded-xl border border-navy-700 bg-navy-900 p-4 shadow-xl">
            <ul className="mb-4 space-y-1">
              {nav.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-navy-800">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 lg:hidden">
              {langSwitch}
              {userBox}
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
