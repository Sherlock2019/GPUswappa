import Link from "next/link";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { listIntroductions } from "@/lib/services/brokerage";
import { formatDateTime } from "@/lib/format";
import { EmptyState, StatusPill } from "@/components/ui";

const ST = ["PENDING_REVIEW", "MORE_INFO_REQUIRED", "APPROVED", "COMPLETED", "REJECTED", "CANCELLED"];

export default async function IntroductionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const actor = (await getActor())!;
  const { status } = await searchParams;
  const [t, locale, rows] = await Promise.all([getT(), getLocale(), listIntroductions(actor, ST.includes(status ?? "") ? status : undefined)]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("admin.introductions")}</h1>
      <nav className="flex flex-wrap gap-1">
        <Link href="/admin/introductions" className={`btn btn-sm ${!status ? "bg-navy-900 text-white" : "btn-ghost"}`}>{t("common.all")}</Link>
        {ST.map((s) => <Link key={s} href={`?status=${s}`} className={`btn btn-sm ${status === s ? "bg-navy-900 text-white" : "btn-ghost"}`}>{t(`enums.IntroductionStatus.${s}`)}</Link>)}
      </nav>
      {rows.length === 0 ? <EmptyState title={t("common.emptyTitle")} /> : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[900px]">
            <thead><tr><th>{t("broker.reference")}</th><th>{t("listing.title")}</th><th>{t("broker.sellerParty")} → {t("broker.buyerParty")}</th><th>{t("common.status")}</th><th>{t("broker.relationship")}</th><th>{t("broker.yourBroker")}</th><th>{t("broker.approve")}</th><th>{t("broker.disclosed")}</th></tr></thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id}>
                  <td><Link href={`/admin/cases/${i.enquiry.id}`} className="font-mono text-electric-600 hover:underline">{i.enquiry.reference}</Link><br /><span className="text-xs text-slate-500">{formatDateTime(i.requestedAt, locale)}</span></td>
                  <td className="max-w-48 truncate">{i.listing.title}</td>
                  <td className="font-mono text-xs">{i.sellerCompany.alias} ↔ {i.buyerCompany.alias}</td>
                  <td><StatusPill status={i.status === "COMPLETED" ? "APPROVED" : i.status === "PENDING_REVIEW" ? "PENDING" : i.status} label={t(`enums.IntroductionStatus.${i.status}`)} /></td>
                  <td className="text-xs">{t(`enums.ExistingRelationship.${i.existingRelationship}`)}</td>
                  <td className="text-xs">{i.broker.name}</td>
                  <td className="text-xs">{i.approver?.name ?? "—"}</td>
                  <td className="text-xs">{i.disclosures.length ? `${i.disclosures.length} · ${formatDateTime(i.completedAt, locale)}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
