import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [actor, t] = await Promise.all([getActor(), getT()]);
  if (!actor) redirect("/auth/login?next=/dashboard");
  const links: [string, string][] = [
    ["/dashboard", t("dash.overview")],
    ["/dashboard/company", t("dash.company")],
    ...(actor.role === "SELLER" ? ([["/dashboard/listings", t("dash.listings")]] as [string, string][]) : []),
    ["/dashboard/cases", t("broker.cases")],
    ["/dashboard/saved", t("dash.saved")],
    ["/dashboard/requests", t("dash.requests")],
    ["/dashboard/swaps", t("dash.swaps")],
    ["/dashboard/notifications", t("dash.notifications")],
    ["/dashboard/settings", t("dash.settings")],
  ];
  return (
    <div className="container-page grid gap-6 py-8 lg:grid-cols-[220px_1fr]">
      <nav aria-label={t("dash.title")} className="lg:sticky lg:top-20 lg:self-start">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{t("dash.title")}</p>
        <ul className="flex gap-1 overflow-x-auto lg:flex-col">
          {links.map(([href, label]) => (
            <li key={href}>
              <Link href={href} className="block whitespace-nowrap rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-white hover:text-electric-600">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
