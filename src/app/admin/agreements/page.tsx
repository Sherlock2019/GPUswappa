import Link from "next/link";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { listAgreements } from "@/lib/services/brokerage";
import { formatDate, formatDateTime } from "@/lib/format";
import { Alert, EmptyState, Section, StatusPill } from "@/components/ui";
import { ActionForm, F } from "@/components/forms";
import { reviseAgreementAction, terminateAgreementAction } from "@/app/actions/admin";

export default async function AgreementsPage() {
  const actor = (await getActor())!;
  const [t, locale, data] = await Promise.all([getT(), getLocale(), listAgreements(actor)]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("admin.agreements")}</h1>
      <Alert tone="warn">{t("agreements.draftNote")}</Alert>
      <Section title={t("agreements.seller")}>
        {data.seller.length === 0 ? <EmptyState title={t("common.emptyTitle")} /> : (
          <div className="overflow-x-auto">
            <table className="table min-w-[1000px]">
              <thead><tr><th>Ref</th><th>{t("listing.title")}</th><th>{t("broker.sellerParty")}</th><th>{t("agreements.version")}</th><th>%</th><th>{t("broker.feeTrigger")}</th><th>{t("broker.credit")}</th><th>{t("agreements.acceptedAt")}</th><th>{t("agreements.period")}</th><th>{t("common.status")}</th><th /></tr></thead>
              <tbody>
                {data.seller.map((a) => (
                  <tr key={a.id}>
                    <td className="font-mono text-xs">{a.reference}</td>
                    <td className="max-w-40 truncate"><Link href={`/admin/listings/${a.listing.id}`} className="text-electric-600">{a.listing.title}</Link></td>
                    <td className="text-xs">{a.sellerCompany.displayName}<br /><span className="font-mono">{a.sellerCompany.alias}</span></td>
                    <td className="text-xs">{a.documentVersion}</td>
                    <td className="text-xs">{String(a.standardCommissionPct)}{a.negotiatedCommissionPct !== null && <><br /><strong>→ {String(a.negotiatedCommissionPct)}</strong></>}</td>
                    <td className="text-xs">{t(`enums.FeeTrigger.${a.feeTrigger}`)}</td>
                    <td className="text-xs">{a.listingFeeCredit ? t("common.yes") : t("common.no")}</td>
                    <td className="text-xs">{a.acceptedAt ? `${formatDateTime(a.acceptedAt, locale)} · ${a.acceptanceMethod} · ${a.acceptedBy?.name ?? ""}` : "—"}</td>
                    <td className="text-xs">{formatDate(a.startDate, locale)} – {formatDate(a.endDate, locale)}</td>
                    <td><StatusPill status={a.status === "ACTIVE" ? "ACTIVE" : a.status === "AWAITING_SELLER_REVIEW" ? "PENDING" : a.status === "TERMINATED" ? "CLOSED" : a.status} label={t(`enums.AgreementStatus.${a.status}`)} /></td>
                    <td>
                      {["ACTIVE", "ACCEPTED"].includes(a.status) && (
                        <details>
                          <summary className="cursor-pointer text-xs text-electric-600">{t("agreements.revise")}</summary>
                          <ActionForm action={reviseAgreementAction} submitLabel={t("agreements.revise")} submitClass="btn-primary btn-sm" hidden={{ id: a.id }} className="mt-2 w-80">
                            <F name="feeTrigger" type="select" label={t("broker.feeTrigger")} options={["SALE_AGREEMENT_SIGNED", "PAYMENT_PENDING", "EQUIPMENT_DELIVERED", "COMPLETED"].map((x) => [x, t(`enums.FeeTrigger.${x}`)])} defaultValue={a.feeTrigger} required />
                            <F name="paymentDeadlineDays" type="number" label="Days" defaultValue={a.paymentDeadlineDays} required />
                            <F name="negotiatedCommissionPct" type="number" step="0.01" label={t("agreements.negotiated")} defaultValue={a.negotiatedCommissionPct?.toString()} />
                            <F name="negotiatedNote" label={t("agreements.negotiatedNote")} defaultValue={a.negotiatedNote} />
                            <F name="introProtectionMonths" type="number" label={t("agreements.protection")} defaultValue={a.introProtectionMonths ?? ""} />
                            <F name="listingFeeCredit" type="checkbox" label={t("broker.credit")} defaultChecked={a.listingFeeCredit} />
                            <p className="text-xs font-semibold">{t("agreements.includes")}</p>
                            <F name="taxesIncluded" type="checkbox" label={t("agreements.taxes")} defaultChecked={a.taxesIncluded} />
                            <F name="shippingIncluded" type="checkbox" label={t("agreements.shipping")} defaultChecked={a.shippingIncluded} />
                            <F name="installationIncluded" type="checkbox" label={t("agreements.installation")} defaultChecked={a.installationIncluded} />
                            <F name="reason" type="textarea" label={t("admin.reason")} rows={2} required />
                          </ActionForm>
                          <ActionForm action={terminateAgreementAction} hidden={{ id: a.id }} submitLabel={t("agreements.terminate")} submitClass="btn-danger btn-sm" className="mt-3 w-80 border-t pt-3">
                            <F name="reason" type="textarea" label={t("admin.reason")} rows={2} required />
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
      </Section>
      <Section title={t("agreements.buyer")}>
        {data.buyer.length === 0 ? <EmptyState title={t("common.emptyTitle")} /> : (
          <div className="overflow-x-auto">
            <table className="table min-w-[800px]">
              <thead><tr><th>{t("broker.reference")}</th><th>{t("broker.buyerParty")}</th><th>{t("agreements.representative")}</th><th>{t("listing.title")}</th><th>{t("agreements.version")}</th><th>{t("agreements.acceptedAt")}</th><th>{t("broker.introduction")}</th></tr></thead>
              <tbody>
                {data.buyer.map((b) => (
                  <tr key={b.id}>
                    <td><Link href={`/admin/cases/${b.enquiry.id}`} className="font-mono text-electric-600">{b.enquiry.reference}</Link></td>
                    <td className="text-xs">{b.buyerCompany ? `${b.buyerCompany.displayName} (${b.buyerCompany.alias})` : "—"}</td>
                    <td className="text-xs">{b.authorizedRepresentative}</td>
                    <td className="max-w-40 truncate text-xs">{b.listing.title}</td>
                    <td className="text-xs">{b.termsVersion}</td>
                    <td className="text-xs">{formatDateTime(b.acceptedAt, locale)} · {b.acceptanceMethod}</td>
                    <td className="text-xs">{b.enquiry.introductions[0] ? t(`enums.IntroductionStatus.${b.enquiry.introductions[0].status}`) : t("enums.IntroductionStatus.NOT_REQUESTED")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
