import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getT } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { CreditedPhoto } from "@/components/listing";

export const metadata: Metadata = { title: "Why" };

export default async function WhyPage() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const items = t.raw<{ title: string; text: string }[]>("home.whyItems");
  return (
    <>
      <PageHeader title={t("why.title")} subtitle={t("why.lead")} />
      <div className="container-page space-y-12 py-10">
        <section className="grid gap-8 lg:grid-cols-[1fr_420px]">
          <div>
            <h2 className="text-2xl font-bold">{t("home.whatTitle")}</h2>
            <p className="mt-3 text-slate-700">{t("home.whatText")}</p>
          </div>
          <CreditedPhoto k="h100Lineup" locale={locale} t={t} imgClass="h-64" />
        </section>
        <section>
          <h2 className="text-2xl font-bold">{t("why.problemTitle")}</h2>
          <p className="mt-2 text-slate-700">{t("home.whyLead")}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {items.map((w) => (
              <div key={w.title} className="card p-5">
                <h3 className="font-semibold text-navy-900">{w.title}</h3>
                <p className="mt-2 text-sm text-slate-700">{w.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">{t("home.whyNote")}</p>
        </section>
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-xl font-bold">{t("why.solutionTitle")}</h2>
            <ul className="mt-3 space-y-2">
              {t.list("why.solutionItems").map((s) => (
                <li key={s} className="flex gap-2 text-sm"><span className="text-teal-600" aria-hidden="true">✓</span>{s}</li>
              ))}
            </ul>
          </div>
          <div className="card p-6">
            <h2 className="text-xl font-bold">{t("why.whoTitle")}</h2>
            <ul className="mt-3 space-y-2">
              {t.list("why.whoItems").map((s) => (
                <li key={s} className="flex gap-2 text-sm"><span className="text-electric-600" aria-hidden="true">●</span>{s}</li>
              ))}
            </ul>
          </div>
        </section>
        <section className="grid items-center gap-6 rounded-2xl bg-navy-900 p-8 text-white md:grid-cols-[1fr_360px]">
          <div>
            <h2 className="text-2xl font-bold !text-white">{t("newMarket.title")}</h2>
            <p className="mt-2 text-slate-300">{t("newMarket.subtitle")}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/new-gpus" className="btn-teal">{t("common.learnMore")}</Link>
              <Link href="/marketplace" className="btn border border-white/30 text-white hover:bg-white/10">{t("home.browse")}</Link>
            </div>
          </div>
          <CreditedPhoto k="dcCern" locale={locale} t={t} imgClass="h-48" className="[&_figcaption]:text-slate-400" />
        </section>
      </div>
    </>
  );
}
