import { getActor } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { requirePermission } from "@/lib/rbac";
import { getSettings, paymentPartner, PUBLIC_DISCLOSURE_FIELDS, publicSellerFields } from "@/lib/settings";
import { Alert, Section } from "@/components/ui";
import { ActionForm, CheckGroup, F } from "@/components/forms";
import { settingsAction } from "@/app/actions/admin";

export default async function DisclosurePage() {
  requirePermission(await getActor(), "admin:content");
  const [t, s] = await Promise.all([getT(), getSettings()]);
  const current = publicSellerFields(s);
  const partner = paymentPartner(s);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("admin.disclosure")}</h1>
      <Alert tone="warn">
        Seller information selected below is ALWAYS shown on public listings, regardless of the alias. Vietnamese legal counsel must confirm the platform&apos;s
        classification (e.g. e-commerce trading floor) and which seller details the law requires to be displayed before production launch. Aliases must never be
        used to avoid a legally required disclosure. Counsel review recorded: <strong>{s["disclosure.reviewedByCounsel"] === "true" ? "yes" : "no"}</strong>.
      </Alert>
      <Section title="Public seller disclosure fields">
        <ActionForm action={settingsAction} submitLabel={t("common.save")}>
          <input type="hidden" name="__disclosure" value="1" />
          <CheckGroup name="disclosure.publicSellerFields" label="Always display publicly" options={PUBLIC_DISCLOSURE_FIELDS.map((f) => [f, t(`enums.DisclosableField.${f}`)])} defaults={current} />
          <input type="hidden" name="__bool_disclosure.reviewedByCounsel" value="1" />
          <F name="disclosure.reviewedByCounsel" type="checkbox" label="These settings have been reviewed by Vietnamese legal counsel" defaultChecked={s["disclosure.reviewedByCounsel"] === "true"} />
        </ActionForm>
      </Section>
      <Section title={t("payments.title")}>
        <p className="mb-3 text-sm text-slate-600">{t("payments.none")} Escrow, split payments and funds custody are not built. A partner is displayed publicly only when status = “{t("enums.PaymentPartnerStatus.AVAILABLE_VIA_PARTNER")}”, a name is entered, and the content is approved.</p>
        <p className="mb-3 text-sm">Currently displayed: <strong>{partner ? partner.name : "nothing"}</strong></p>
        <ActionForm action={settingsAction} submitLabel={t("common.save")}>
          <F name="payments.partnerStatus" type="select" label={t("common.status")} options={["NOT_CONFIGURED", "UNDER_EVALUATION", "AVAILABLE_VIA_PARTNER"].map((x) => [x, t(`enums.PaymentPartnerStatus.${x}`)])} defaultValue={s["payments.partnerStatus"]} required />
          <F name="payments.partnerName" label="Verified partner name" defaultValue={s["payments.partnerName"]} />
          <F name="payments.partnerDescription" type="textarea" label="Approved description" defaultValue={s["payments.partnerDescription"]} rows={2} />
          <input type="hidden" name="__bool_payments.partnerApproved" value="1" />
          <F name="payments.partnerApproved" type="checkbox" label="Partner details verified and content approved by an administrator" defaultChecked={s["payments.partnerApproved"] === "true"} />
        </ActionForm>
      </Section>
    </div>
  );
}
