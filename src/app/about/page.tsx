import type { Metadata } from "next";
import { getLocale, getT } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { CreditedPhoto } from "@/components/listing";
import { ActionForm, F } from "@/components/forms";
import { partnerAction } from "@/app/actions/market";

export const metadata: Metadata = { title: "About" };

const CATS = ["DATA_CENTRE", "SYSTEM_INTEGRATOR", "RESELLER", "ITAD_SANITISATION", "LEGAL_CUSTOMS", "LOGISTICS", "BANK_PAYMENT", "OTHER"];

export default async function AboutPage() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return (
    <>
      <PageHeader title={t("about.title")} subtitle={t("about.mission")} eyebrow={t("common.operatorRole")} />
      <div className="container-page space-y-10 py-10">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="space-y-3 text-slate-700">
            <p className="text-lg">{t("about.text")}</p>
            <p>{t("agreements.acceptText")}</p>
          </div>
          <CreditedPhoto k="dcServerRoom" locale={locale} t={t} imgClass="h-72" />
        </div>
        <section>
          <h2 className="mb-4 text-2xl font-bold">{t("about.partnersTitle")}</h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {CATS.map((c) => (
              <li key={c} className="card p-4 text-sm font-medium">{t(`enums.PartnerCategory.${c}`)}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-slate-600">{t("about.partnersNote")}</p>
        </section>
        <section id="partner" className="card max-w-2xl p-6">
          <h2 className="text-xl font-bold">{t("about.partnerForm")}</h2>
          <ActionForm action={partnerAction} submitLabel={t("common.submit")} resetOnSuccess className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <F name="organization" label={t("about.organization")} required />
              <F name="contactName" label={t("about.contactName")} required />
              <F name="email" type="email" label={t("contact.email")} required />
              <F name="phone" type="tel" label={t("about.phone")} />
            </div>
            <F name="partnerCategory" type="select" label={t("about.partnerCategory")} options={CATS.map((c) => [c, t(`enums.PartnerCategory.${c}`)])} required />
            <F name="message" type="textarea" label={t("about.message")} required />
            {/* Honeypot */}
            <div className="hidden" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
