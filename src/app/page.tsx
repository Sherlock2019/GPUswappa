/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getLocale, getT } from "@/lib/i18n/server";
import { lname } from "@/lib/i18n";
import { featuredListings } from "@/lib/services/listings";
import { getActiveCatalog, listServices } from "@/lib/services/admin";
import { CreditedPhoto, ListingCard } from "@/components/listing";
import { EmptyState, Pill, StatusPill } from "@/components/ui";
import { PHOTOS } from "@/lib/photos";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const [featured, catalog, services] = await Promise.all([featuredListings(6), getActiveCatalog(), listServices()]);
  const whyItems = t.raw<{ title: string; text: string }[]>("home.whyItems");
  const faq = t.raw<{ q: string; a: string }[]>("faq");
  const hero = PHOTOS.dcCern;

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <img src={hero.src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/90 to-navy-900/50" />
        <div className="grid-bg absolute inset-0 opacity-60" />
        <div className="container-page relative py-16 sm:py-24">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-400">
            {t("common.tagline")}
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight !text-white sm:text-5xl">{t("home.heroTitle")}</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">{t("home.heroText")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/marketplace" className="btn-primary px-6 py-3 text-base">
              {t("home.browse")}
            </Link>
            <Link href="/sell" className="btn border border-white/30 px-6 py-3 text-base text-white hover:bg-white/10">
              {t("home.sellCta")}
            </Link>
          </div>
          {/* Search */}
          <form action="/marketplace" method="get" className="mt-10 grid gap-2 rounded-2xl bg-white p-3 shadow-2xl sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]" role="search">
            <label className="sr-only" htmlFor="hq">{t("home.searchKeyword")}</label>
            <input id="hq" name="q" className="input" placeholder={t("home.searchKeyword")} />
            <label className="sr-only" htmlFor="hc">{t("home.searchCategory")}</label>
            <select id="hc" name="category" className="input" defaultValue="">
              <option value="">{t("home.searchCategory")}</option>
              {catalog.categories.map((c) => (
                <option key={c.id} value={c.slug}>{lname(c, locale)}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="hm">{t("home.searchModel")}</label>
            <select id="hm" name="model" className="input" defaultValue="">
              <option value="">{t("home.searchModel")}</option>
              {catalog.models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="hl">{t("home.searchLocation")}</label>
            <select id="hl" name="location" className="input" defaultValue="">
              <option value="">{t("home.searchLocation")}</option>
              {catalog.locations.map((l) => (
                <option key={l.id} value={l.code}>{lname(l, locale)}</option>
              ))}
            </select>
            <button className="btn-primary">{t("common.search")}</button>
          </form>
          <p className="mt-2 text-[11px] text-slate-400">
            {t("common.photoCredit", { author: hero.author, license: hero.license })}
          </p>
        </div>
      </section>

      {/* ── What ── */}
      <section className="container-page grid items-center gap-10 py-16 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold">{t("home.whatTitle")}</h2>
          <p className="mt-4 text-slate-700">{t("home.whatText")}</p>
          <ul className="mt-6 space-y-3">
            {t.list("home.whatPoints").map((p) => (
              <li key={p} className="flex gap-3 text-slate-800">
                <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-6 rounded-lg border border-electric-400/30 bg-electric-100/50 p-3 text-sm text-navy-800">{t("listing.brokerNotice")}</p>
        </div>
        <CreditedPhoto k="h100Lineup" locale={locale} t={t} imgClass="h-72 sm:h-96" />
      </section>

      {/* ── Why ── */}
      <section className="bg-navy-900 py-16 text-white">
        <div className="container-page">
          <h2 className="text-3xl font-bold !text-white">{t("home.whyTitle")}</h2>
          <p className="mt-3 max-w-3xl text-lg text-slate-300">{t("home.whyLead")}</p>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {whyItems.map((w, i) => (
              <div key={w.title} className="rounded-xl border border-navy-700 bg-navy-800/60 p-5">
                <p className="text-sm font-semibold text-teal-400">0{i + 1}</p>
                <h3 className="mt-1 text-lg font-semibold !text-white">{w.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{w.text}</p>
              </div>
            ))}
            <div className="overflow-hidden rounded-xl border border-navy-700">
              <img src={PHOTOS.dcRacks.src} alt={locale === "en" ? PHOTOS.dcRacks.altEn : PHOTOS.dcRacks.altVi} className="h-40 w-full object-cover" loading="lazy" />
              <p className="bg-navy-800 p-2 text-[11px] text-slate-400">{t("common.photoCredit", { author: PHOTOS.dcRacks.author, license: PHOTOS.dcRacks.license })}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link href="/why" className="btn border border-white/30 text-white hover:bg-white/10">{t("common.learnMore")}</Link>
            <p className="text-xs text-slate-400">{t("home.whyNote")}</p>
          </div>
        </div>
      </section>

      {/* ── New data-centre GPU market ── */}
      <section className="container-page pt-16">
        <div className="card grid items-center gap-6 overflow-hidden p-6 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600">{t("nav.newMarket")}</p>
            <h2 className="mt-1 text-2xl font-bold">{t("newMarket.title")}</h2>
            <p className="mt-2 max-w-3xl text-slate-700">{t("newMarket.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/new-gpus" className="btn-primary">{t("common.learnMore")}</Link>
            <Link href="/requests?condition=NEW_OR_UNUSED#new" className="btn-secondary">{t("newMarket.cta")}</Link>
          </div>
        </div>
      </section>

      {/* ── Featured ── */}
      <section className="container-page py-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold">{t("home.featured")}</h2>
          <Link href="/marketplace" className="text-sm font-semibold text-electric-600 hover:underline">{t("common.viewAll")} →</Link>
        </div>
        {featured.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((l) => (
              <ListingCard key={l.id} l={l} t={t} locale={locale} />
            ))}
          </div>
        ) : (
          <EmptyState title={t("home.featuredEmpty")} />
        )}
      </section>

      {/* ── How it works ── */}
      <section className="bg-white py-16">
        <div className="container-page">
          <h2 className="text-2xl font-bold">{t("home.howTitle")}</h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            {(["seller", "buyer"] as const).map((who) => (
              <div key={who}>
                <h3 className="mb-4 font-semibold text-teal-600">{who === "seller" ? t("home.howSeller") : t("home.howBuyer")}</h3>
                <ol className="space-y-3">
                  {t.list(`how.${who}Steps`).map((s, i) => (
                    <li key={s} className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">{i + 1}</span>
                      <span className="text-slate-800">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-600">{t("how.disclaimer")}</p>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="container-page grid gap-6 py-16 md:grid-cols-2">
        {(["seller", "buyer"] as const).map((who) => (
          <div key={who} className="card p-6">
            <h2 className="text-xl font-bold">{t(`home.${who}BenefitsTitle`)}</h2>
            <ul className="mt-4 space-y-2">
              {t.list(`home.${who}Benefits`).map((b) => (
                <li key={b} className="flex gap-2 text-sm text-slate-700">
                  <span aria-hidden="true" className="text-teal-600">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* ── Categories ── */}
      <section className="container-page pb-16">
        <h2 className="mb-6 text-2xl font-bold">{t("home.categoriesTitle")}</h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {catalog.categories.map((c) => (
            <li key={c.id}>
              <Link href={`/marketplace?category=${c.slug}`} className="card flex h-full items-center gap-3 p-4 text-sm font-semibold text-navy-900 hover:border-electric-500">
                <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg bg-electric-100 text-electric-600">▣</span>
                {lname(c, locale)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Trust / swap / services ── */}
      <section className="bg-slate-100 py-16">
        <div className="container-page grid gap-6 lg:grid-cols-3">
          <div className="card p-6">
            <h2 className="text-xl font-bold">{t("home.trustTitle")}</h2>
            <p className="mt-3 text-sm text-slate-700">{t("home.trustText")}</p>
            <Link href="/trust" className="mt-4 inline-block text-sm font-semibold text-electric-600 hover:underline">{t("common.learnMore")} →</Link>
          </div>
          <div className="card p-6">
            <h2 className="text-xl font-bold">{t("home.swapTitle")}</h2>
            <p className="mt-3 text-sm text-slate-700">{t("home.swapText")}</p>
            <Link href="/swap" className="mt-4 inline-block text-sm font-semibold text-electric-600 hover:underline">{t("common.learnMore")} →</Link>
          </div>
          <div className="card p-6">
            <h2 className="text-xl font-bold">{t("home.servicesTitle")}</h2>
            <p className="mt-3 text-sm text-slate-700">{t("home.servicesText")}</p>
            <ul className="mt-3 space-y-1">
              {services.slice(0, 4).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{locale === "en" ? s.nameEn : s.nameVi}</span>
                  <StatusPill status={s.status} label={t(`enums.ServiceStatus.${s.status}`)} />
                </li>
              ))}
              {services.filter((s) => s.isFuture).slice(0, 1).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{locale === "en" ? s.nameEn : s.nameVi}</span>
                  <Pill tone="amber">{t("common.comingSoon")}</Pill>
                </li>
              ))}
            </ul>
            <Link href="/services" className="mt-4 inline-block text-sm font-semibold text-electric-600 hover:underline">{t("common.learnMore")} →</Link>
          </div>
        </div>
      </section>

      {/* ── Partner CTA ── */}
      <section className="container-page py-16">
        <div className="grid items-center gap-8 overflow-hidden rounded-2xl bg-gradient-to-r from-navy-900 to-navy-700 p-8 text-white md:grid-cols-[1fr_320px]">
          <div>
            <h2 className="text-2xl font-bold !text-white">{t("home.partnerTitle")}</h2>
            <p className="mt-2 text-slate-300">{t("home.partnerText")}</p>
            <Link href="/about#partner" className="btn-teal mt-6">{t("home.partnerCta")}</Link>
          </div>
          <CreditedPhoto k="dcServerRoom" locale={locale} t={t} imgClass="h-44" className="[&_figcaption]:text-slate-400" />
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="container-page pb-16">
        <h2 className="mb-6 text-2xl font-bold">{t("home.faqTitle")}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {faq.map((f) => (
            <details key={f.q} className="card p-4">
              <summary className="cursor-pointer font-semibold text-navy-900">{f.q}</summary>
              <p className="mt-2 text-sm text-slate-700">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-electric-600 py-14 text-white">
        <div className="container-page flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold !text-white">{t("home.finalTitle")}</h2>
            <p className="mt-1 text-electric-100">{t("home.finalText")}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/sell" className="btn bg-white px-6 py-3 text-electric-600 hover:bg-electric-100">{t("home.sellCta")}</Link>
            <Link href="/marketplace" className="btn border border-white/50 px-6 py-3 text-white hover:bg-white/10">{t("home.browse")}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
