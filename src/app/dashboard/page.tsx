import Link from "next/link";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { getMyCompany } from "@/lib/services/companies";
import { listMyListings } from "@/lib/services/listings";
import { listMyCases } from "@/lib/services/brokerage";
import { listNotifications } from "@/lib/services/notifications";
import { formatDateTime } from "@/lib/format";
import { Alert, Section, StatusPill } from "@/components/ui";
import { NotificationText } from "@/components/notification-text";

export default async function DashboardHome() {
  const actor = (await getActor())!;
  const [t, locale, company, cases, notifs] = await Promise.all([getT(), getLocale(), getMyCompany(actor), listMyCases(actor), listNotifications(actor)]);
  const listings = actor.role === "SELLER" ? await listMyListings(actor) : [];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("dash.welcome", { name: actor.name })}</h1>
      {!company && (
        <Alert tone="warn" title={t("dash.noCompany")}>
          <Link href="/dashboard/company" className="font-semibold underline">{t("dash.createCompany")}</Link>
        </Alert>
      )}
      {company && (
        <Section title={t("dash.company")} actions={<Link href="/dashboard/company" className="text-sm text-electric-600">{t("common.edit")}</Link>}>
          <p className="font-semibold">{company.displayName} <span className="ml-2 text-sm font-normal text-slate-500">{t("dash.alias")}: {company.alias}</span></p>
          <p className="mt-1 text-sm">{t("dash.verification")}: <StatusPill status={company.verificationStatus} label={t(`enums.CompanyVerification.${company.verificationStatus}`)} /></p>
        </Section>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {actor.role === "SELLER" && (
          <Link href="/dashboard/listings" className="card p-4 hover:border-electric-500">
            <p className="text-3xl font-bold">{listings.length}</p>
            <p className="text-sm text-slate-600">{t("dash.listings")}</p>
          </Link>
        )}
        <Link href="/dashboard/cases" className="card p-4 hover:border-electric-500">
          <p className="text-3xl font-bold">{cases.asBuyer.length + cases.asSeller.length}</p>
          <p className="text-sm text-slate-600">{t("broker.cases")}</p>
        </Link>
        <Link href="/dashboard/notifications" className="card p-4 hover:border-electric-500">
          <p className="text-3xl font-bold">{notifs.filter((n) => !n.readAt).length}</p>
          <p className="text-sm text-slate-600">{t("dash.notifications")}</p>
        </Link>
      </div>
      <Section title={t("dash.notifications")}>
        {notifs.length === 0 ? (
          <p className="text-sm text-slate-500">{t("dash.noNotifications")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifs.slice(0, 6).map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                <NotificationText t={t} n={n} />
                <span className="shrink-0 text-xs text-slate-400">{formatDateTime(n.createdAt, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
