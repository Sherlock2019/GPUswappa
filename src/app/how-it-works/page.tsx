import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { Alert, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "How it works" };

export default async function HowPage() {
  const t = await getT();
  return (
    <>
      <PageHeader title={t("how.title")} subtitle={t("listing.brokerNotice")} />
      <div className="container-page space-y-8 py-10">
        <div className="grid gap-6 lg:grid-cols-2">
          {(["seller", "buyer"] as const).map((who) => (
            <section key={who} className="card p-6">
              <h2 className="text-xl font-bold text-teal-600">{who === "seller" ? t("home.howSeller") : t("home.howBuyer")}</h2>
              <ol className="mt-4 space-y-4">
                {t.list(`how.${who}Steps`).map((s, i, arr) => (
                  <li key={s} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 font-bold text-white">{i + 1}</span>
                      {i < arr.length - 1 && <span aria-hidden="true" className="mt-1 w-px flex-1 bg-slate-300" />}
                    </div>
                    <p className="pt-1.5 font-medium">{s}</p>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
        <section className="card p-6">
          <h2 className="text-lg font-semibold">{t("broker.introduction")}</h2>
          <p className="mt-2 text-sm text-slate-700">{t("agreements.acceptText")}</p>
          <p className="mt-2 text-sm text-slate-700">{t("fees.standard")}</p>
          <p className="mt-2 text-sm text-slate-700">{t("agreements.summaryCommission", { pct: "5" })}</p>
          <p className="mt-2 text-sm text-slate-700">{t("agreements.summaryNoGuarantee")}</p>
        </section>
        <Alert tone="warn">{t("how.disclaimer")}</Alert>
      </div>
    </>
  );
}
