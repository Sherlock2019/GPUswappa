import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getT } from "@/lib/i18n/server";
import { searchListings } from "@/lib/services/listings";
import { ListingCard } from "@/components/listing";
import { Alert, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Used data-centre GPUs" };

export default async function UsedGpuMarketPage() {
  const [t, locale, result] = await Promise.all([getT(), getLocale(), searchListings({ condition: "PREOWNED", sort: "newest" })]);
  const points = t.raw<{ title: string; text: string }[]>("usedMarket.points");
  return (
    <>
      <PageHeader
        eyebrow={t("nav.usedMarket")}
        title={t("usedMarket.title")}
        subtitle={t("usedMarket.subtitle")}
        photo="dcServerRoom"
        actions={
          <>
            <Link href="/marketplace?condition=PREOWNED" className="btn-primary">{t("usedMarket.browseAll")}</Link>
            <Link href="/sell" className="btn border border-white/30 text-white hover:bg-white/10">{t("usedMarket.sellCta")}</Link>
          </>
        }
      />
      <div className="container-page space-y-10 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {points.map((p) => (
            <div key={p.title} className="card p-5">
              <h2 className="font-semibold text-navy-900">{p.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{p.text}</p>
            </div>
          ))}
        </div>
        <Alert tone="warn">{t("usedMarket.note")}</Alert>
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-bold">{t("usedMarket.listTitle")}</h2>
            <span className="text-sm text-slate-500">{t("common.results", { count: result.total })}</span>
          </div>
          {result.items.length === 0 ? (
            <EmptyState title={t("usedMarket.empty")} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((l) => <ListingCard key={l.id} l={l} t={t} locale={locale} />)}
            </div>
          )}
          <p className="mt-4 text-sm text-slate-600">{t("listing.brokerNotice")}</p>
        </section>
      </div>
    </>
  );
}
