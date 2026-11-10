import Link from "next/link";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { listTransactions } from "@/lib/services/brokerage";
import { formatDate, formatUsd, formatVnd } from "@/lib/format";
import { EmptyState, StatusPill } from "@/components/ui";

const TX = ["ENQUIRY", "NEGOTIATION", "INSPECTION", "OFFER_ACCEPTED", "INTRODUCTION_APPROVED", "SALE_AGREEMENT_PENDING", "SALE_AGREEMENT_SIGNED", "PAYMENT_PENDING", "EQUIPMENT_DELIVERED", "COMPLETED", "CANCELLED", "DISPUTED"];
const CS = ["NOT_YET_EARNED", "PENDING_TRIGGER", "DUE", "INVOICED", "PAID", "OVERDUE", "DISPUTED", "WAIVED"];

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = (await getActor())!;
  const sp = await searchParams;
  const [t, locale, rows] = await Promise.all([getT(), getLocale(), listTransactions(actor, sp)]);
  const money = (v: bigint | null, c: string) => (v === null ? "—" : c === "USD" ? formatUsd(Number(v), locale) : formatVnd(v, locale));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("admin.transactions")}</h1>
      <form method="get" className="card grid gap-2 p-3 sm:grid-cols-3 lg:grid-cols-6">
        <select name="status" defaultValue={sp.status ?? ""} className="input" aria-label={t("common.status")}>
          <option value="">{t("common.status")}: {t("common.all")}</option>
          {TX.map((s) => <option key={s} value={s}>{t(`enums.TransactionStatus.${s}`)}</option>)}
        </select>
        <select name="commission" defaultValue={sp.commission ?? ""} className="input" aria-label={t("broker.commission")}>
          <option value="">{t("broker.commission")}: {t("common.all")}</option>
          {CS.map((s) => <option key={s} value={s}>{t(`enums.CommissionStatus.${s}`)}</option>)}
        </select>
        <input name="seller" defaultValue={sp.seller ?? ""} placeholder="VN-S-…" className="input" aria-label={t("broker.sellerParty")} />
        <input name="buyer" defaultValue={sp.buyer ?? ""} placeholder="VN-B-…" className="input" aria-label={t("broker.buyerParty")} />
        <input name="from" type="date" defaultValue={sp.from ?? ""} className="input" aria-label="From" />
        <div className="flex gap-1"><button className="btn-primary flex-1">{t("admin.filter")}</button><Link href="/admin/transactions" className="btn-ghost">✕</Link></div>
      </form>
      {rows.length === 0 ? <EmptyState title={t("common.emptyTitle")} /> : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[960px]">
            <thead><tr><th>{t("broker.reference")}</th><th>{t("listing.title")}</th><th>{t("broker.sellerParty")} / {t("broker.buyerParty")}</th><th>{t("broker.salePrice")}</th><th>{t("broker.commission")}</th><th>{t("common.status")}</th><th>{t("broker.yourBroker")}</th><th>{t("common.updated")}</th></tr></thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id}>
                  <td><Link href={`/admin/transactions/${x.id}`} className="font-mono text-electric-600 hover:underline">{x.reference}</Link><br /><Link href={`/admin/cases/${x.enquiry.id}`} className="font-mono text-xs text-slate-500">{x.enquiry.reference}</Link></td>
                  <td className="max-w-48 truncate">{x.listing.title}</td>
                  <td className="font-mono text-xs">{x.sellerCompany.alias} / {x.buyerCompany?.alias ?? "—"}</td>
                  <td>{money(x.salePrice, x.currency)}</td>
                  <td>{money(x.commissionAmount, x.currency)}<br /><StatusPill status={x.commissionStatus === "DUE" ? "PENDING" : x.commissionStatus} label={t(`enums.CommissionStatus.${x.commissionStatus}`)} /></td>
                  <td><StatusPill status={x.status} label={t(`enums.TransactionStatus.${x.status}`)} /></td>
                  <td className="text-xs">{x.broker.name}</td>
                  <td className="text-xs">{formatDate(x.updatedAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
