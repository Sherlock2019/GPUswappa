import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getT } from "@/lib/i18n/server";
import { lname } from "@/lib/i18n";
import { searchListings } from "@/lib/services/listings";
import { getActiveCatalog } from "@/lib/services/admin";
import { ListingCard } from "@/components/listing";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Marketplace" };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function MarketplacePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [t, locale, catalog, result] = await Promise.all([getT(), getLocale(), getActiveCatalog(), searchListings(sp)]);
  const p = result.params;
  const view = sp.view === "list" ? "list" : "grid";
  const qs = (over: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...flat(sp), ...over })) if (v !== undefined && v !== "") u.set(k, String(v));
    return `/marketplace?${u.toString()}`;
  };
  const opts = (prefix: string, vals: string[]) => vals.map((v) => [v, t(`${prefix}.${v}`)] as [string, string]);
  const sel = (name: string, label: string, options: [string, string][], value?: string) => (
    <div>
      <label htmlFor={`m-${name}`} className="label">{label}</label>
      <select id={`m-${name}`} name={name} defaultValue={value ?? ""} className="input">
        <option value="">{t("common.all")}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </div>
  );

  return (
    <>
      <PageHeader title={t("market.title")} subtitle={t("market.subtitle")} actions={<Link href="/requests#new" className="btn-secondary">{t("market.postRequest")}</Link>} />
      <div className="container-page grid gap-6 py-8 lg:grid-cols-[280px_1fr]">
        <aside aria-label={t("market.filters")}>
          <form method="get" action="/marketplace" className="card space-y-3 p-4 lg:sticky lg:top-20">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{t("market.filters")}</h2>
            <div>
              <label htmlFor="m-q" className="label">{t("market.keyword")}</label>
              <input id="m-q" name="q" defaultValue={p.q ?? ""} className="input" />
            </div>
            {sel("category", t("listing.category"), catalog.categories.map((c) => [c.slug, lname(c, locale)]), p.category)}
            {sel("model", t("listing.gpuModel"), catalog.models.map((m) => [m.id, m.name]), p.model)}
            {sel("manufacturer", t("listing.manufacturer"), opts("enums.Manufacturer", ["NVIDIA", "AMD", "INTEL", "SERVER_MANUFACTURER", "OTHER"]), p.manufacturer)}
            {sel("location", t("listing.location"), catalog.locations.map((l) => [l.code, lname(l, locale)]), p.location)}
            {sel("condition", t("listing.condition"), opts("enums.Condition", ["NEW", "UNUSED", "USED", "REFURBISHED"]), p.condition)}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="m-pmin" className="label">{t("market.priceMin")}</label>
                <input id="m-pmin" name="priceMin" inputMode="numeric" defaultValue={p.priceMin ?? ""} className="input" />
              </div>
              <div>
                <label htmlFor="m-pmax" className="label">{t("market.priceMax")}</label>
                <input id="m-pmax" name="priceMax" inputMode="numeric" defaultValue={p.priceMax ?? ""} className="input" />
              </div>
              <div>
                <label htmlFor="m-qmin" className="label">{t("market.qtyMin")}</label>
                <input id="m-qmin" name="qtyMin" inputMode="numeric" defaultValue={p.qtyMin ?? ""} className="input" />
              </div>
              <div>
                <label htmlFor="m-qmax" className="label">{t("market.qtyMax")}</label>
                <input id="m-qmax" name="qtyMax" inputMode="numeric" defaultValue={p.qtyMax ?? ""} className="input" />
              </div>
            </div>
            {sel(
              "verified",
              t("market.verification"),
              [["any", t("market.anyBadge")], ...opts("enums.CheckType", ["SELLER_IDENTITY", "SELLER_AUTHORITY", "OWNERSHIP_EVIDENCE", "CUSTOMS_STATUS", "TECHNICAL_CONDITION", "WARRANTY_EVIDENCE", "DATA_SANITISATION", "EXPORT_CONTROL"])],
              p.verified,
            )}
            {sel("warranty", t("listing.warranty"), [["ANY_WARRANTY", t("market.anyWarranty")], ...opts("enums.WarrantyStatus", ["MANUFACTURER", "SELLER", "NONE"])], p.warranty)}
            {sel("txn", t("listing.transactionType"), opts("enums.TransactionType", ["SALE", "SWAP", "SALE_OR_SWAP"]), p.txn)}
            {sel("sort", t("market.sort"), [["newest", t("market.sortNewest")], ["price_asc", t("market.sortPriceAsc")], ["price_desc", t("market.sortPriceDesc")], ["relevance", t("market.sortRelevance")]], p.sort)}
            <input type="hidden" name="view" value={view} />
            <div className="flex gap-2 pt-1">
              <button className="btn-primary flex-1">{t("common.apply")}</button>
              <Link href="/marketplace" className="btn-ghost">{t("common.clear")}</Link>
            </div>
          </form>
        </aside>

        <section aria-live="polite">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">{t("common.results", { count: result.total })}</p>
            <div className="flex gap-1" role="group" aria-label="View">
              <Link href={qs({ view: "grid" })} aria-current={view === "grid"} className={`btn-sm btn ${view === "grid" ? "bg-navy-900 text-white" : "btn-ghost"}`}>{t("common.gridView")}</Link>
              <Link href={qs({ view: "list" })} aria-current={view === "list"} className={`btn-sm btn ${view === "list" ? "bg-navy-900 text-white" : "btn-ghost"}`}>{t("common.listView")}</Link>
            </div>
          </div>
          {result.items.length === 0 ? (
            <EmptyState title={t("market.empty")} text={t("market.emptyHint")} action={<Link href="/requests#new" className="btn-primary">{t("market.postRequest")}</Link>} />
          ) : (
            <div className={view === "grid" ? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3" : "space-y-4"}>
              {result.items.map((l) => (
                <ListingCard key={l.id} l={l} t={t} locale={locale} view={view} />
              ))}
            </div>
          )}
          {result.pageCount > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
              {result.page > 1 ? <Link className="btn-secondary" href={qs({ page: result.page - 1 })}>← {t("common.previous")}</Link> : <span />}
              <span className="text-sm text-slate-600">{t("common.page", { page: result.page, count: result.pageCount })}</span>
              {result.page < result.pageCount ? <Link className="btn-secondary" href={qs({ page: result.page + 1 })}>{t("common.nextPage")} →</Link> : <span />}
            </nav>
          )}
        </section>
      </div>
    </>
  );
}

function flat(sp: Record<string, string | string[] | undefined>) {
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    const s = Array.isArray(v) ? v[0] : v;
    if (s) o[k] = s;
  }
  return o;
}
