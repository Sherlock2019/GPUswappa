import Link from "next/link";
import { notFound } from "next/navigation";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { getTransaction } from "@/lib/services/brokerage";
import { AppError } from "@/lib/errors";
import { can } from "@/lib/rbac";
import { formatDate, formatDateTime, formatUsd, formatVnd } from "@/lib/format";
import { Alert, DefList, Pill, Section, StatusPill } from "@/components/ui";
import { ActionForm, F } from "@/components/forms";
import * as C from "@/app/actions/cases";

const TX = ["ENQUIRY", "NEGOTIATION", "INSPECTION", "OFFER_ACCEPTED", "INTRODUCTION_APPROVED", "SALE_AGREEMENT_PENDING", "SALE_AGREEMENT_SIGNED", "PAYMENT_PENDING", "EQUIPMENT_DELIVERED", "COMPLETED", "CANCELLED", "DISPUTED"];
const CS = ["NOT_YET_EARNED", "PENDING_TRIGGER", "DUE", "INVOICED", "PAID", "OVERDUE", "DISPUTED", "WAIVED"];

export default async function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = (await getActor())!;
  let data;
  try {
    data = await getTransaction(actor, id);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  const { tx: x, summary: s } = data;
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const money = (v: bigint | number | null | undefined) => (v === null || v === undefined ? "—" : x.currency === "USD" ? formatUsd(Number(v), locale) : formatVnd(v, locale));
  const ag = x.agreement;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-slate-500">{x.reference} · <Link href={`/admin/cases/${x.enquiry.id}`} className="text-electric-600">{x.enquiry.reference}</Link></p>
          <h1 className="text-2xl font-bold">{x.listing.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <StatusPill status={x.status} label={t(`enums.TransactionStatus.${x.status}`)} />
            <span>{t("broker.commission")}: {t(`enums.CommissionStatus.${x.commissionStatus}`)}</span>
            {x.disputeStatus !== "NONE" && <Pill tone="red">{t(`enums.DisputeStatus.${x.disputeStatus}`)}</Pill>}
            {x.listing.isDemo && <Pill tone="amber">{t("common.demoListing")}</Pill>}
          </p>
        </div>
      </div>
      {x.notes?.includes("ILLUSTRATIVE") && <Alert tone="warn">{t("broker.exampleTitle")}: {t("broker.exampleText")}</Alert>}

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title={t("broker.feeSummary")}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>{t("broker.salePrice")}</dt><dd className="font-semibold">{money(x.salePrice)}</dd></div>
            <div className="flex justify-between"><dt>{t("broker.listingFees")}</dt><dd>US${s.listingFeesUsdEquivalent}</dd></div>
            <p className="text-xs text-slate-500">{t("broker.listingFeesNote", { count: s.listingFeePeriods })}</p>
            <div className="flex justify-between"><dt>{t("broker.commissionGross")} ({x.commissionType === "PERCENT" ? `${x.commissionPct}%` : t("enums.CommissionType.FIXED")})</dt><dd>{money(s.commissionGross)}</dd></div>
            <div className="flex justify-between"><dt>{t("broker.credit")}</dt><dd>{s.creditApplies ? `− ${money(s.listingFeeCredit)}` : t("broker.creditNone")}</dd></div>
            {s.tax ? (
              <div className="flex justify-between"><dt>{t("broker.tax", { label: s.tax.label, pct: s.tax.pct })}</dt><dd>{money(s.tax.amount)}</dd></div>
            ) : <p className="text-xs text-slate-500">{t("broker.taxNotConfigured")}</p>}
            <div className="flex justify-between border-t pt-2 font-semibold"><dt>{t("broker.total")}</dt><dd>{money(s.totalCommissionDue)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">{t("fees.currencyNote")}</p>
          <p className="mt-1 text-xs text-slate-500">{t("broker.noInvoiceNote")}</p>
          {x.invoiceRef && <p className="mt-1 text-xs">{t("fees.invoiceRef")}: {x.invoiceRef}</p>}
        </Section>

        <Section title={t("admin.update")}>
          <ActionForm action={C.updateTransactionAction} submitLabel={t("admin.update")} hidden={{ txId: x.id }}>
            <F name="status" type="select" label={t("common.status")} options={TX.map((s2) => [s2, t(`enums.TransactionStatus.${s2}`)])} defaultValue={x.status} required />
            <div className="grid grid-cols-[1fr_110px] gap-2">
              <F name="salePrice" label={t("broker.salePrice")} defaultValue={x.salePrice?.toString()} />
              <F name="currency" type="select" label={t("broker.currency")} options={[["VND", "VND"], ["USD", "USD"]]} defaultValue={x.currency} required />
            </div>
            <F name="completionEvidence" label={t("broker.completionEvidence")} defaultValue={x.completionEvidence} />
            <F name="notes" type="textarea" label={t("broker.notes")} defaultValue={x.notes} rows={2} />
          </ActionForm>
        </Section>
      </div>

      {can(actor, "commission:manage") && (
        <Section title={t("broker.adminCommission")}>
          <ActionForm action={C.adminCommissionAction} submitLabel={t("admin.update")} hidden={{ txId: x.id }}>
            <div className="grid gap-3 sm:grid-cols-3">
              <F name="commissionStatus" type="select" label={t("broker.commission")} options={CS.map((c) => [c, t(`enums.CommissionStatus.${c}`)])} defaultValue={x.commissionStatus} required />
              <F name="disputeStatus" type="select" label={t("enums.TransactionStatus.DISPUTED")} options={["NONE", "OPEN", "RESOLVED"].map((d) => [d, t(`enums.DisputeStatus.${d}`)])} defaultValue={x.disputeStatus} required />
              <F name="invoiceRef" label={t("fees.invoiceRef")} defaultValue={x.invoiceRef} />
              <F name="commissionType" type="select" label={t("broker.commissionType")} options={["PERCENT", "FIXED"].map((c) => [c, t(`enums.CommissionType.${c}`)])} defaultValue={x.commissionType} required />
              <F name="commissionPct" type="number" label="%" defaultValue={x.commissionPct?.toString()} step="0.01" />
              <F name="commissionFixed" label={t("enums.CommissionType.FIXED")} defaultValue={x.commissionFixed?.toString()} />
            </div>
            <F name="reason" type="textarea" label={t("admin.reason")} rows={2} required />
          </ActionForm>
        </Section>
      )}

      {/* Draft acknowledgment for review */}
      <Section title={t("broker.acknowledgment")}>
        <Alert tone="warn">{t("broker.acknowledgmentNote")}</Alert>
        <div className="mt-4">
          <DefList
            items={[
              [t("broker.reference"), `${x.reference} / ${x.enquiry.reference}`],
              [t("listing.title"), x.listing.title],
              [t("broker.sellerParty"), `${x.sellerCompany.legalName} (${x.sellerCompany.alias})`],
              [t("broker.buyerParty"), x.buyerCompany ? `${x.buyerCompany.legalName} (${x.buyerCompany.alias})` : "—"],
              [t("broker.yourBroker"), x.broker.name],
              [t("broker.sellerAgreement"), ag ? `${ag.reference} · ${ag.documentVersion} · ${t(`enums.AgreementStatus.${ag.status}`)}` : "—"],
              [t("broker.introduction"), x.introduction ? `${t(`enums.IntroductionStatus.${x.introduction.status}`)} · ${t("broker.approvedBy", { name: x.introduction.approver?.name ?? "—" })} · ${formatDateTime(x.introduction.completedAt, locale)}` : "—"],
              [t("broker.salePrice"), money(x.salePrice)],
              [t("broker.commission"), `${money(x.commissionAmount)} (${x.commissionBasis})`],
              [t("broker.feeTrigger"), t(`enums.FeeTrigger.${x.feeTrigger}`)],
              [t("broker.completionEvidence"), x.completionEvidence],
              [t("common.updated"), formatDate(x.updatedAt, locale)],
            ]}
          />
        </div>
        <p className="mt-3 text-xs text-slate-500">{t("common.legalNotice")}</p>
      </Section>
    </div>
  );
}
