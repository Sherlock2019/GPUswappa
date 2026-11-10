import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getT } from "@/lib/i18n/server";
import { PageHeader, Alert } from "@/components/ui";
import { CreditedPhoto } from "@/components/listing";
import { LANDED_COST_BUFFER, MARKET_DATA_AS_OF, MARKET_SOURCES, NEW_GPU_PRICES } from "@/lib/market-data";

export const metadata: Metadata = { title: "New data-centre GPU market" };

export default async function NewGpuMarketPage() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const channels = t.raw<{ title: string; text: string }[]>("newMarket.channels");
  const rules = t.raw<{ title: string; text: string }[]>("newMarket.rules");

  return (
    <>
      <PageHeader
        eyebrow={t("newMarket.asOf", { date: MARKET_DATA_AS_OF })}
        title={t("newMarket.title")}
        subtitle={t("newMarket.subtitle")}
        actions={
          <>
            <Link href="/requests?condition=NEW_OR_UNUSED#new" className="btn-primary">{t("newMarket.cta")}</Link>
            <Link href="/marketplace?condition=NEW" className="btn-secondary">{t("newMarket.browseNew")}</Link>
          </>
        }
      />
      <div className="container-page space-y-10 py-10">
        <Alert tone="warn">{t("newMarket.disclaimer")}</Alert>

        <section className="grid gap-8 lg:grid-cols-[1fr_380px]" aria-labelledby="why-new">
          <div>
            <h2 id="why-new" className="text-2xl font-bold">{t("newMarket.whyNewTitle")}</h2>
            <ul className="mt-4 space-y-3">
              {t.list("newMarket.whyNew").map((p) => (
                <li key={p} className="flex gap-3 text-slate-700">
                  <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <CreditedPhoto k="h100Standing" locale={locale} t={t} imgClass="h-64" />
        </section>

        <section aria-labelledby="prices">
          <h2 id="prices" className="mb-4 text-2xl font-bold">{t("newMarket.pricesTitle")}</h2>
          <div className="card overflow-x-auto">
            <table className="table min-w-[720px]">
              <caption className="sr-only">{t("newMarket.pricesTitle")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("newMarket.product")}</th>
                  <th scope="col">{t("newMarket.memory")}</th>
                  <th scope="col">{t("newMarket.gpuPrice")}</th>
                  <th scope="col">{t("newMarket.serverPrice")}</th>
                  <th scope="col">{t("newMarket.cloudPrice")}</th>
                  <th scope="col"><span className="sr-only">{t("admin.note")}</span></th>
                </tr>
              </thead>
              <tbody>
                {NEW_GPU_PRICES.map((r) => (
                  <tr key={r.product}>
                    <th scope="row" className="px-3 py-2 font-semibold text-navy-900">{r.product}</th>
                    <td>{r.memory}</td>
                    <td>{r.gpuPrice}</td>
                    <td>{r.serverPrice}</td>
                    <td>{r.cloudPrice}</td>
                    <td className="text-xs text-slate-600">{t(`newMarket.notes.${r.noteKey}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs font-medium text-amber-700">{t("common.illustrativePrice")}</p>
          <p className="mt-2 text-sm text-slate-600">{t("newMarket.priceNote", { buffer: LANDED_COST_BUFFER })}</p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-2xl font-bold">{t("newMarket.channelsTitle")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {channels.map((c) => (
                <div key={c.title} className="card p-4">
                  <h3 className="font-semibold">{c.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{c.text}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">{t("newMarket.channelsNote")}</p>
          </div>
          <div className="card border-red-200 bg-red-50/40 p-5">
            <h2 className="text-xl font-bold">{t("newMarket.avoidTitle")}</h2>
            <ul className="mt-3 space-y-2">
              {t.list("newMarket.avoid").map((a) => (
                <li key={a} className="flex gap-2 text-sm text-slate-800">
                  <span aria-hidden="true" className="text-red-700">✕</span>
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="rules">
          <h2 id="rules" className="mb-4 text-2xl font-bold">{t("newMarket.rulesTitle")}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {rules.map((r) => (
              <div key={r.title} className="card p-5">
                <h3 className="font-semibold text-navy-900">{r.title}</h3>
                <p className="mt-2 text-sm text-slate-700">{r.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="text-xl font-bold">{t("newMarket.checklistTitle")}</h2>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
              {t.list("newMarket.checklist").map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
          </div>
          <div className="card bg-navy-900 p-5 text-white">
            <h2 className="text-xl font-bold !text-white">{t("newMarket.platformRoleTitle")}</h2>
            <p className="mt-3 text-sm text-slate-300">{t("newMarket.platformRole")}</p>
            <p className="mt-3 text-xs text-slate-400">{t("common.noPayments")}</p>
            <Link href="/requests?condition=NEW_OR_UNUSED#new" className="btn-teal mt-5">{t("newMarket.cta")}</Link>
          </div>
        </section>

        <section aria-labelledby="sources">
          <h2 id="sources" className="mb-2 text-lg font-semibold">{t("newMarket.sourcesTitle")}</h2>
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
            {MARKET_SOURCES.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-electric-600">{s.label}</a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">{t("footer.trademarks")}</p>
        </section>
      </div>
    </>
  );
}
