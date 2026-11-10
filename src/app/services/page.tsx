import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getT } from "@/lib/i18n/server";
import { listServices } from "@/lib/services/admin";
import { getSettings, paymentPartner } from "@/lib/settings";
import { PageHeader, Pill, StatusPill } from "@/components/ui";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  const [t, locale, services, settings] = await Promise.all([getT(), getLocale(), listServices(), getSettings()]);
  const partner = paymentPartner(settings);
  const current = services.filter((s) => !s.isFuture);
  const future = services.filter((s) => s.isFuture);
  const card = (s: (typeof services)[number], isFuture = false) => (
    <article key={s.id} className={`card p-5 ${isFuture ? "border-dashed" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{locale === "en" ? s.nameEn : s.nameVi}</h3>
        {isFuture ? <Pill tone="amber">{t("common.comingSoon")}</Pill> : <StatusPill status={s.status} label={t(`enums.ServiceStatus.${s.status}`)} />}
      </div>
      <p className="mt-2 text-sm text-slate-600">{locale === "en" ? s.descriptionEn : s.descriptionVi}</p>
      <p className="mt-3 text-xs text-slate-500">{s.certificationNote && s.certificationEvidenceRef ? t("services.certifiedNote", { note: s.certificationNote }) : t("services.noCertNote")}</p>
    </article>
  );
  return (
    <>
      <PageHeader title={t("services.title")} subtitle={t("services.subtitle")} actions={<Link href="/contact?type=GENERAL" className="btn-secondary">{t("services.contact")}</Link>} />
      <div className="container-page space-y-10 py-10">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{current.map((s) => card(s))}</div>
        <section aria-labelledby="future">
          <h2 id="future" className="text-xl font-bold">{t("services.futureTitle")}</h2>
          <p className="mb-4 text-sm text-slate-600">{t("services.futureNote")}</p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{future.map((s) => card(s, true))}</div>
        </section>
        <section className="card p-5">
          <h2 className="font-semibold">{t("payments.title")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("payments.none")}</p>
          {partner && <p className="mt-2 text-sm">{t("payments.partner", { name: partner.name })} — {partner.description}</p>}
        </section>
      </div>
    </>
  );
}
