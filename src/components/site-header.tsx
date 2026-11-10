import Link from "next/link";
import type { T, Locale } from "@/lib/i18n";
import type { Actor } from "@/lib/rbac";
import { logoutAction, setLocaleAction } from "@/app/actions/auth";

function Logo({ t }: { t: T }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-3" aria-label={t("common.brand")}>
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1d5bff" />
            <stop offset="1" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="42" height="42" rx="11" fill="url(#lg)" />
        <rect x="9" y="14" width="26" height="15" rx="2.5" fill="none" stroke="#fff" strokeWidth="2.2" />
        <circle cx="17" cy="21.5" r="3.2" fill="#fff" />
        <circle cx="27" cy="21.5" r="3.2" fill="#fff" />
        <path d="M12 29v4M17 29v4M22 29v4M27 29v4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="leading-none">
        <span className="block whitespace-nowrap text-2xl font-extrabold tracking-tight text-white">
          AI-GPU-<span className="bg-gradient-to-r from-electric-400 to-teal-400 bg-clip-text text-transparent">Swapper</span>
        </span>
        <span className="mt-1 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">{t("common.operator")}</span>
      </span>
    </Link>
  );
}

export function SiteHeader({ t, locale, actor, unread }: { t: T; locale: Locale; actor: Actor; unread: number }) {
  const nav: [string, string][] = [
    ["/used-gpus", t("nav.usedMarket")],
    ["/new-gpus", t("nav.newMarket")],
    ["/marketplace", t("nav.marketplace")],
    ["/sell", t("nav.sell")],
    ["/requests", t("nav.requests")],
    ["/swap", t("nav.swap")],
    ["/services", t("nav.services")],
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
      <div className="mx-auto flex h-[76px] w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
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
