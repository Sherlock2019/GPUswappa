import type { Metadata } from "next";
import { getLocale, getT } from "@/lib/i18n/server";
import { listBadgeDefinitions } from "@/lib/services/admin";
import { Alert, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Trust & Safety" };

export default async function TrustPage() {
  const [t, locale, defs] = await Promise.all([getT(), getLocale(), listBadgeDefinitions()]);
  const sections = t.raw<{ title: string; text: string }[]>("trust.sections");
  return (
    <>
      <PageHeader title={t("trust.title")} subtitle={t("trust.subtitle")} />
      <div className="container-page space-y-10 py-10">
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((s) => (
            <section key={s.title} className="card p-5">
              <h2 className="font-semibold text-navy-900">{s.title}</h2>
              <p className="mt-2 text-sm text-slate-700">{s.text}</p>
            </section>
          ))}
        </div>
        <section aria-labelledby="badges">
          <h2 id="badges" className="mb-4 text-2xl font-bold">{t("trust.badgesTitle")}</h2>
          <div className="card overflow-x-auto">
            <table className="table min-w-[640px]">
              <thead>
                <tr>
                  <th scope="col">{t("listing.checksTitle")}</th>
                  <th scope="col">{t("listing.badgeCovers")}</th>
                  <th scope="col">{t("listing.badgeNot")}</th>
                </tr>
              </thead>
              <tbody>
                {defs.map((d) => (
                  <tr key={d.checkType}>
                    <th scope="row" className="px-3 py-2 font-semibold">✓ {locale === "en" ? d.nameEn : d.nameVi}</th>
                    <td>{locale === "en" ? d.meaningEn : d.meaningVi}</td>
                    <td className="text-slate-600">{locale === "en" ? d.notMeaningEn : d.notMeaningVi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <Alert tone="warn">{t("common.legalNotice")}</Alert>
      </div>
    </>
  );
}
