import Link from "next/link";
import { getActor } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { requirePermission } from "@/lib/rbac";
import { listBadgeDefinitions, listContentPages, listServices } from "@/lib/services/admin";
import { getSettings } from "@/lib/settings";
import { Section, StatusPill } from "@/components/ui";
import { ActionForm, F } from "@/components/forms";
import { badgeAction, pageAction, serviceAction, settingsAction } from "@/app/actions/admin";

export default async function ContentPage() {
  requirePermission(await getActor(), "admin:content");
  const [t, services, badges, pages, s] = await Promise.all([getT(), listServices(), listBadgeDefinitions(), listContentPages(), getSettings()]);
  const ST = ["AVAILABLE", "AVAILABLE_THROUGH_PARTNER", "COMING_SOON", "CONTACT_US"].map((x) => [x, t(`enums.ServiceStatus.${x}`)] as [string, string]);
  const bool = (k: string, label: string) => (
    <>
      <input type="hidden" name={`__bool_${k}`} value="1" />
      <F name={k} type="checkbox" label={label} defaultChecked={s[k as keyof typeof s] === "true"} />
    </>
  );
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("admin.content")}</h1>
      <p className="text-sm"><Link href="/admin/disclosure" className="text-electric-600 underline">{t("admin.disclosure")} →</Link></p>

      <Section title={t("admin.settings")}>
        <ActionForm action={settingsAction} submitLabel={t("common.save")}>
          <div className="grid gap-3 md:grid-cols-2">
            {bool("policy.holdOnUnknownAnswers", "Hold listings with “Unknown” ownership/customs/location answers")}
            {bool("policy.requireExportReviewForFlaggedModels", "Require export-control check for flagged GPU models")}
            {bool("policy.introRequiresVerifiedCompanies", "Introductions require verified buyer & seller companies")}
          </div>
          <F name="policy.requiredChecksForApproval" label="Required checks for approval (comma-separated CheckType codes)" defaultValue={s["policy.requiredChecksForApproval"]} />
          <div className="grid gap-3 md:grid-cols-4">
            <F name="fees.listingMonthlyUsdEquivalent" type="number" label="Listing fee (US$-equivalent / month)" defaultValue={s["fees.listingMonthlyUsdEquivalent"]} />
            <F name="fees.standardCommissionPct" type="number" label="Standard commission %" defaultValue={s["fees.standardCommissionPct"]} />
            <F name="fees.paymentDeadlineDays" type="number" label="Payment deadline (days)" defaultValue={s["fees.paymentDeadlineDays"]} />
            <F name="fees.agreementTermMonths" type="number" label="Agreement term (months)" defaultValue={s["fees.agreementTermMonths"]} />
            <F name="tax.feeTaxPct" label="Tax on platform fees % (empty = not shown)" defaultValue={s["tax.feeTaxPct"]} />
            <F name="tax.feeTaxLabel" label="Tax label" defaultValue={s["tax.feeTaxLabel"]} />
            <F name="terms.brokerageVersion" label="Brokerage terms version" defaultValue={s["terms.brokerageVersion"]} />
            <F name="terms.buyerIntroVersion" label="Buyer intro terms version" defaultValue={s["terms.buyerIntroVersion"]} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <F name="fx.usdVndRate" label="USD→VND rate (indicative)" defaultValue={s["fx.usdVndRate"]} />
            <F name="fx.rateDate" type="date" label="Rate date" defaultValue={s["fx.rateDate"]} />
            <F name="fx.source" label="Rate source" defaultValue={s["fx.source"]} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <F name="site.operatorLegalName" label={t("footer.operator")} defaultValue={s["site.operatorLegalName"]} />
            <F name="site.businessRegistrationNumber" label={t("footer.regNumber")} defaultValue={s["site.businessRegistrationNumber"]} />
            <F name="site.ecommerceRegistration" label={t("footer.ecommerce")} defaultValue={s["site.ecommerceRegistration"]} />
            <F name="site.contactEmail" type="email" label={t("contact.email")} defaultValue={s["site.contactEmail"]} />
          </div>
        </ActionForm>
      </Section>

      <Section title={t("admin.services")}>
        <div className="space-y-3">
          {services.map((x) => (
            <details key={x.id} className="rounded-lg border border-slate-200 p-3">
              <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold">
                <span>{x.nameEn} {x.isFuture && "· roadmap"}</span>
                <StatusPill status={x.status} label={t(`enums.ServiceStatus.${x.status}`)} />
              </summary>
              <ActionForm action={serviceAction} submitLabel={t("common.save")} submitClass="btn-primary btn-sm" hidden={{ id: x.id }} className="mt-3">
                <F name="status" type="select" label={t("common.status")} options={ST} defaultValue={x.status} required />
                <div className="grid gap-3 md:grid-cols-2">
                  <F name="nameVi" label={t("admin.nameVi")} defaultValue={x.nameVi} required />
                  <F name="nameEn" label={t("admin.nameEn")} defaultValue={x.nameEn} required />
                  <F name="descriptionVi" type="textarea" label="VI" defaultValue={x.descriptionVi} rows={2} required />
                  <F name="descriptionEn" type="textarea" label="EN" defaultValue={x.descriptionEn} rows={2} required />
                  <F name="certificationNote" label={t("admin.certificationNote")} defaultValue={x.certificationNote} />
                  <F name="certificationEvidenceRef" label={t("admin.certificationEvidenceRef")} defaultValue={x.certificationEvidenceRef} />
                </div>
              </ActionForm>
            </details>
          ))}
        </div>
      </Section>

      <Section title={t("admin.badges")}>
        <div className="space-y-3">
          {badges.map((b) => (
            <details key={b.checkType} className="rounded-lg border border-slate-200 p-3">
              <summary className="cursor-pointer text-sm font-semibold">{b.nameEn}</summary>
              <ActionForm action={badgeAction} submitLabel={t("common.save")} submitClass="btn-primary btn-sm" hidden={{ id: b.checkType }} className="mt-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <F name="nameVi" label={t("admin.nameVi")} defaultValue={b.nameVi} required />
                  <F name="nameEn" label={t("admin.nameEn")} defaultValue={b.nameEn} required />
                  <F name="meaningVi" type="textarea" label={`${t("admin.meaning")} (VI)`} defaultValue={b.meaningVi} rows={2} required />
                  <F name="meaningEn" type="textarea" label={`${t("admin.meaning")} (EN)`} defaultValue={b.meaningEn} rows={2} required />
                  <F name="notMeaningVi" type="textarea" label={`${t("admin.notMeaning")} (VI)`} defaultValue={b.notMeaningVi} rows={2} required />
                  <F name="notMeaningEn" type="textarea" label={`${t("admin.notMeaning")} (EN)`} defaultValue={b.notMeaningEn} rows={2} required />
                </div>
              </ActionForm>
            </details>
          ))}
        </div>
      </Section>

      <Section title={t("admin.pages")}>
        <div className="space-y-3">
          {pages.map((p) => (
            <details key={p.slug} className="rounded-lg border border-slate-200 p-3">
              <summary className="cursor-pointer text-sm font-semibold">{p.titleEn} <span className="font-mono text-xs text-slate-500">/legal/{p.slug}</span></summary>
              <ActionForm action={pageAction} submitLabel={t("common.save")} submitClass="btn-primary btn-sm" hidden={{ id: p.slug }} className="mt-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <F name="titleVi" label={t("admin.nameVi")} defaultValue={p.titleVi} required />
                  <F name="titleEn" label={t("admin.nameEn")} defaultValue={p.titleEn} required />
                  <F name="bodyVi" type="textarea" label="VI" defaultValue={p.bodyVi} rows={10} required />
                  <F name="bodyEn" type="textarea" label="EN" defaultValue={p.bodyEn} rows={10} required />
                </div>
                <F name="isLegalDraft" type="checkbox" label={t("admin.isLegalDraft")} defaultChecked={p.isLegalDraft} />
              </ActionForm>
            </details>
          ))}
        </div>
      </Section>
    </div>
  );
}
