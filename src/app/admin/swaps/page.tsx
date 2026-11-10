import Link from "next/link";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { lname } from "@/lib/i18n";
import { listAllSwaps } from "@/lib/services/marketplace";
import { formatDate, formatVnd } from "@/lib/format";
import { EmptyState, StatusPill } from "@/components/ui";
import { StatusForm, PageTitle } from "../inbox-pages";
import { swapStatusAction } from "@/app/actions/admin";

export default async function AdminSwaps() {
  const actor = (await getActor())!;
  const [t, locale, rows] = await Promise.all([getT(), getLocale(), listAllSwaps(actor)]);
  return (
    <div className="space-y-4">
      <PageTitle>{t("admin.swaps")}</PageTitle>
      <p className="text-sm text-slate-600">{t("swap.checksNote")} {t("swap.taxNote")}</p>
      {rows.length === 0 ? <EmptyState title={t("common.emptyTitle")} /> : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[960px]">
            <thead><tr><th>{t("swap.offered")}</th><th>{t("swap.requested")}</th><th>{t("swap.cashDirection")}</th><th>{t("broker.buyerParty")}</th><th>{t("common.status")}</th><th>{t("common.created")}</th><th /></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td><p className="font-medium">{s.offeredEquipment}</p><p className="text-xs text-slate-500">{t(`enums.Condition.${s.offeredCondition}`)} · {formatVnd(s.offeredEstimatedValue, locale)}</p><p className="text-xs">{s.offeredDetails}</p></td>
                  <td><p>{s.requestedEquipment}</p>{s.listing && <Link href={`/admin/listings/${s.listing.id}`} className="text-xs text-electric-600">{s.listing.title}</Link>}<p className="text-xs text-slate-500">{formatVnd(s.requestedEstimatedValue, locale)}</p></td>
                  <td className="text-xs">{t(`enums.CashDirection.${s.cashDirection}`)} {s.cashAdjustment ? formatVnd(s.cashAdjustment, locale) : ""}<br />{lname(s.preferredLocation, locale)} · {s.proposedTiming}</td>
                  <td className="text-xs">{s.proposer.name} &lt;{s.proposer.email}&gt;<br />{s.proposerCompany?.displayName}</td>
                  <td><StatusPill status={s.status} label={t(`enums.SwapStatus.${s.status}`)} /></td>
                  <td className="text-xs">{formatDate(s.createdAt, locale)}</td>
                  <td><StatusForm action={swapStatusAction as never} id={s.id} statuses={["SUBMITTED", "UNDER_REVIEW", "FORWARDED", "DECLINED", "CLOSED"]} enumKey="SwapStatus" current={s.status} notes={s.adminNotes} t={t} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
