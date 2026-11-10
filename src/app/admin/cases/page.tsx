import Link from "next/link";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { listBrokerCases } from "@/lib/services/brokerage";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { formatDate } from "@/lib/format";
import { EmptyState, Pill, StatusPill } from "@/components/ui";

const STATUSES = ["NEW", "BUYER_VERIFICATION_REQUIRED", "UNDER_BROKER_REVIEW", "QUESTIONS_RELAYED", "OFFER_RECEIVED", "NEGOTIATING", "INSPECTION_REQUESTED", "INTRODUCTION_PENDING", "INTRODUCED", "CLOSED", "CANCELLED"];

export default async function BrokerCases({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = (await getActor())!;
  const sp = await searchParams;
  const [t, locale, rows] = await Promise.all([getT(), getLocale(), listBrokerCases(actor, sp)]);
  const brokers = can(actor, "broker:all") ? await prisma.user.findMany({ where: { role: { in: ["BROKER", "ADMIN"] } }, select: { id: true, name: true } }) : [];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("admin.cases")}</h1>
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">⚠ {t("broker.brokerWarning")}</div>
      <form method="get" className="card grid gap-2 p-3 sm:grid-cols-3 lg:grid-cols-7" aria-label={t("broker.filters")}>
        <select name="status" defaultValue={sp.status ?? ""} className="input" aria-label={t("common.status")}>
          <option value="">{t("common.status")}: {t("common.all")}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`enums.EnquiryStatus.${s}`)}</option>)}
        </select>
        {brokers.length > 0 && (
          <select name="broker" defaultValue={sp.broker ?? ""} className="input" aria-label={t("broker.yourBroker")}>
            <option value="">{t("broker.yourBroker")}: {t("common.all")}</option>
            <option value="none">{t("admin.unassigned")}</option>
            {brokers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <input name="seller" defaultValue={sp.seller ?? ""} placeholder="VN-S-…" className="input" aria-label={t("broker.sellerParty")} />
        <input name="buyer" defaultValue={sp.buyer ?? ""} placeholder="VN-B-…" className="input" aria-label={t("broker.buyerParty")} />
        <input name="from" type="date" defaultValue={sp.from ?? ""} className="input" aria-label="From" />
        <input name="to" type="date" defaultValue={sp.to ?? ""} className="input" aria-label="To" />
        <div className="flex gap-1"><button className="btn-primary flex-1">{t("admin.filter")}</button><Link href="/admin/cases" className="btn-ghost">✕</Link></div>
      </form>
      {rows.length === 0 ? <EmptyState title={t("broker.casesEmpty")} /> : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[900px]">
            <thead>
              <tr><th>{t("broker.reference")}</th><th>{t("listing.title")}</th><th>{t("broker.buyerParty")}</th><th>{t("broker.sellerParty")}</th><th>{t("common.status")}</th><th>{t("broker.yourBroker")}</th><th>{t("broker.introduction")}</th><th>{t("broker.transaction")}</th><th>{t("common.created")}</th></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/admin/cases/${c.id}`} className="font-mono text-electric-600 hover:underline">{c.reference}</Link></td>
                  <td className="max-w-56 truncate">{c.listing.title} {c.listing.isDemo && <Pill tone="amber">Demo</Pill>}</td>
                  <td className="font-mono text-xs">{c.buyerCompany?.alias ?? "—"}</td>
                  <td className="font-mono text-xs">{c.sellerCompany.alias}</td>
                  <td><StatusPill status={c.status} label={t(`enums.EnquiryStatus.${c.status}`)} /></td>
                  <td className="text-xs">{c.broker?.name ?? t("admin.unassigned")}</td>
                  <td className="text-xs">{c.introductions[0] ? t(`enums.IntroductionStatus.${c.introductions[0].status}`) : "—"}</td>
                  <td className="text-xs">{c.transaction ? `${c.transaction.reference} · ${t(`enums.TransactionStatus.${c.transaction.status}`)}` : "—"}</td>
                  <td className="text-xs">{formatDate(c.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
