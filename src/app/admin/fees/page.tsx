import Link from "next/link";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { listFees } from "@/lib/services/brokerage";
import { formatDate, formatUsd, formatVnd } from "@/lib/format";
import { Alert, EmptyState, StatusPill } from "@/components/ui";
import { ActionForm, F } from "@/components/forms";
import { feePaymentAction, feeWaiveAction } from "@/app/actions/admin";

const ST = ["NOT_DUE", "DUE", "OVERDUE", "PAID", "WAIVED"];

export default async function FeesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const actor = (await getActor())!;
  const { status } = await searchParams;
  const [t, locale, rows] = await Promise.all([getT(), getLocale(), listFees(actor, ST.includes(status ?? "") ? status : undefined)]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("admin.fees")}</h1>
      <Alert>{t("fees.standard")} {t("fees.manualOnly")} {t("fees.currencyNote")}</Alert>
      <nav className="flex flex-wrap gap-1">
        <Link href="/admin/fees" className={`btn btn-sm ${!status ? "bg-navy-900 text-white" : "btn-ghost"}`}>{t("common.all")}</Link>
        {ST.map((s) => <Link key={s} href={`?status=${s}`} className={`btn btn-sm ${status === s ? "bg-navy-900 text-white" : "btn-ghost"}`}>{t(`enums.ListingFeeStatus.${s}`)}</Link>)}
      </nav>
      {rows.length === 0 ? <EmptyState title={t("common.emptyTitle")} /> : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[980px]">
            <thead><tr><th>{t("listing.title")}</th><th>{t("broker.sellerParty")}</th><th>{t("fees.period")}</th><th>{t("fees.usd")}</th><th>{t("fees.due")}</th><th>{t("common.status")}</th><th>{t("fees.billed")}</th><th>{t("fees.action")}</th></tr></thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id}>
                  <td className="max-w-48 truncate"><Link href={`/admin/listings/${f.listing.id}`} className="text-electric-600">{f.listing.title}</Link></td>
                  <td className="text-xs">{f.listing.sellerCompany.displayName}<br /><span className="font-mono">{f.listing.sellerCompany.alias}</span></td>
                  <td className="text-xs">{formatDate(f.periodStart, locale)} – {formatDate(f.periodEnd, locale)}</td>
                  <td>US${f.usdEquivalent}</td>
                  <td className="text-xs">{formatDate(f.dueDate, locale)}</td>
                  <td><StatusPill status={f.status === "OVERDUE" ? "REJECTED" : f.status === "DUE" ? "PENDING" : f.status === "PAID" ? "APPROVED" : f.status} label={t(`enums.ListingFeeStatus.${f.status}`)} />{f.reason && <p className="text-[11px] text-slate-500">{f.reason}</p>}</td>
                  <td className="text-xs">{f.billedAmount !== null ? (f.billedCurrency === "USD" ? formatUsd(Number(f.billedAmount), locale) : formatVnd(f.billedAmount, locale)) : "—"}{f.invoiceRef && <><br />{f.invoiceRef}</>}</td>
                  <td>
                    {f.status !== "PAID" && f.status !== "WAIVED" && (
                      <details>
                        <summary className="cursor-pointer text-xs text-electric-600">{t("fees.recordPayment")} / {t("fees.waive")}</summary>
                        <ActionForm action={feePaymentAction} submitLabel={t("fees.recordPayment")} submitClass="btn-teal btn-sm" hidden={{ id: f.id }} className="mt-2 w-72">
                          <div className="grid grid-cols-2 gap-2">
                            <F name="billedCurrency" type="select" label={t("broker.currency")} options={[["VND", "VND"], ["USD", "USD"]]} defaultValue="VND" required />
                            <F name="billedAmount" label={t("broker.amount")} required />
                          </div>
                          <F name="fxBasis" label={t("fees.fxBasis")} />
                          <F name="invoiceRef" label={t("fees.invoiceRef")} />
                          <F name="taxTreatment" label={t("fees.taxTreatment")} />
                        </ActionForm>
                        <ActionForm action={feeWaiveAction} hidden={{ id: f.id }} className="mt-3 w-72 border-t pt-3">
                          <F name="usdEquivalent" type="number" label={t("fees.usd")} defaultValue={f.usdEquivalent} />
                          <F name="reason" type="textarea" label={t("admin.reason")} rows={2} required />
                          <div className="flex gap-2">
                            <button name="action" value="MODIFY" className="btn-secondary btn-sm">{t("admin.update")}</button>
                            <button name="action" value="WAIVE" className="btn-danger btn-sm">{t("enums.ListingFeeStatus.WAIVED")}</button>
                          </div>
                        </ActionForm>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
