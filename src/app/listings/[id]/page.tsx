/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { lname } from "@/lib/i18n";
import { getListingForPage, isSaved, similarListings } from "@/lib/services/listings";
import { listBadgeDefinitions } from "@/lib/services/admin";
import { getMyCompany } from "@/lib/services/companies";
import { fxInfo, getSettings } from "@/lib/settings";
import { formatDate, formatUsd } from "@/lib/format";
import { prisma } from "@/lib/db";
import { isStaff } from "@/lib/rbac";
import { Alert, DefList, GpuPlaceholder, Pill, Section } from "@/components/ui";
import { ListingCard, PriceTag } from "@/components/listing";
import { ActionForm, F } from "@/components/forms";
import { createEnquiryAction } from "@/app/actions/cases";
import { toggleSaveAction } from "@/app/actions/listings";

type P = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { id } = await params;
  const r = await getListingForPage(null, id);
  // Title only — never seller identity in page metadata.
  return { title: r?.listing.title ?? "Listing" };
}

export default async function ListingPage({ params }: P) {
  const { id } = await params;
  const actor = await getActor();
  const res = await getListingForPage(actor, id);
  if (!res) notFound();
  const { listing: l, preview } = res;
  const [t, locale, settings, defs, saved, similar] = await Promise.all([getT(), getLocale(), getSettings(), listBadgeDefinitions(), isSaved(actor, id), similarListings(id)]);
  const fx = fxInfo(settings);
  const defMap = new Map(defs.map((d) => [d.checkType, d]));
  const company = actor ? await getMyCompany(actor) : null;
  const own = !!actor && !!(await prisma.listing.count({ where: { id, sellerCompany: { memberships: { some: { userId: actor.id } } } } }));
  const e = (k: string, v: string | null | undefined) => (v ? t(`enums.${k}.${v}`) : null);
  const swapOk = l.transactionType === "SWAP" || l.transactionType === "SALE_OR_SWAP";

  return (
    <div className="container-page py-8">
      {preview && <div className="mb-4"><Alert tone="warn">{t("common.preview")} ({t(`enums.PublicationStatus.${l.publicationStatus}`)})</Alert></div>}
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
        <Link href="/marketplace" className="hover:text-electric-600">{t("nav.marketplace")}</Link>
        {l.category && (
          <>
            {" / "}
            <Link href={`/marketplace?category=${l.category.slug}`} className="hover:text-electric-600">{lname(l.category, locale)}</Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Gallery */}
          <div className="card overflow-hidden">
            {l.images.length ? (
              <div>
                <div className="relative">
                  <img src={`/api/files/image/${l.images[0].id}`} alt={l.images[0].altText} className="h-80 w-full object-cover sm:h-[420px]" />
                  {l.images[0].isIllustrative && <span className="absolute bottom-2 left-2 rounded bg-navy-950/85 px-2 py-1 text-xs text-white">{t("common.illustrativeImage")}</span>}
                </div>
                {l.images[0].credit && <p className="px-3 py-1 text-[11px] text-slate-500">{l.images[0].credit}</p>}
                {l.images.length > 1 && (
                  <ul className="flex gap-2 overflow-x-auto p-3">
                    {l.images.slice(1).map((img) => (
                      <li key={img.id}>
                        <a href={`/api/files/image/${img.id}`} target="_blank" rel="noopener noreferrer">
                          <img src={`/api/files/image/${img.id}`} alt={img.altText} className="h-20 w-28 rounded object-cover" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <GpuPlaceholder label={t("listing.noImage")} className="h-72" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap gap-1">
              {l.isDemo && <Pill tone="amber">{t("common.demoListing")}</Pill>}
              {l.category && <Pill tone="blue">{lname(l.category, locale)}</Pill>}
              {l.condition && <Pill>{t(`enums.Condition.${l.condition}`)}</Pill>}
              {l.transactionType && <Pill tone="teal">{t(`enums.TransactionType.${l.transactionType}`)}</Pill>}
            </div>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl" lang={l.contentLanguage}>{l.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              📍 {lname(l.location, locale)} · {t("listing.listed")}: {formatDate(l.publishedAt, locale)}
            </p>
          </div>

          <Section title={t("listing.description")}>
            <p className="whitespace-pre-line text-slate-800" lang={l.contentLanguage}>{l.description}</p>
          </Section>

          <Section title={t("listing.specs")}>
            <DefList
              items={[
                [t("listing.manufacturer"), e("Manufacturer", l.manufacturer)],
                [t("listing.gpuModel"), l.gpuModelName],
                [t("listing.gpuQuantity"), l.gpuQuantity ? String(l.gpuQuantity) : null],
                [t("listing.gpuMemory"), l.gpuMemory],
                [t("listing.serverManufacturer"), l.serverManufacturer],
                [t("listing.serverModel"), l.serverModel],
                [t("listing.cpu"), l.cpu],
                [t("listing.systemRam"), l.systemRam],
                [t("listing.storage"), l.storage],
                [t("listing.networking"), l.networking],
                [t("listing.powerRequirements"), l.powerRequirements],
                [t("listing.coolingRequirements"), l.coolingRequirements],
              ]}
            />
          </Section>

          <Section title={t("listing.conditionSection")}>
            <DefList
              items={[
                [t("listing.condition"), e("Condition", l.condition)],
                [t("listing.hasKnownFaults"), e("TriState", l.hasKnownFaults)],
                [t("listing.knownDefects"), l.knownDefects],
                [t("listing.usageDetails"), l.usageDetails],
                [t("listing.equipmentAge"), l.equipmentAge],
                [t("listing.warrantyStatus"), e("WarrantyStatus", l.warrantyStatus)],
                [t("listing.warrantyDetails"), l.warrantyDetails],
              ]}
            />
          </Section>

          <Section title={t("listing.deliverySection")}>
            <DefList items={[[t("listing.deliveryOptions"), l.deliveryOptions], [t("listing.installationOptions"), l.installationOptions], [t("listing.location"), lname(l.location, locale)]]} />
          </Section>

          {/* Review checks */}
          <Section title={t("listing.checksTitle")} id="checks">
            {l.badges.length ? (
              <ul className="space-y-3">
                {l.badges.map((b) => {
                  const d = defMap.get(b.checkType);
                  return (
                    <li key={b.checkType} className="rounded-lg border border-teal-400/40 bg-teal-100/40 p-3">
                      <p className="flex items-center gap-2 font-semibold text-navy-900">
                        <span aria-hidden="true" className="text-teal-600">✓</span>
                        {d ? (locale === "en" ? d.nameEn : d.nameVi) : t(`enums.CheckType.${b.checkType}`)}
                        <span className="text-xs font-normal text-slate-600">— {t("listing.badgeReviewed", { date: formatDate(b.reviewedAt, locale) })}</span>
                      </p>
                      {d && (
                        <dl className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
                          <div><dt className="text-xs font-semibold uppercase text-slate-500">{t("listing.badgeCovers")}</dt><dd>{locale === "en" ? d.meaningEn : d.meaningVi}</dd></div>
                          <div><dt className="text-xs font-semibold uppercase text-slate-500">{t("listing.badgeNot")}</dt><dd>{locale === "en" ? d.notMeaningEn : d.notMeaningVi}</dd></div>
                        </dl>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-slate-600">{t("listing.checksEmpty")}</p>
            )}
            {l.lastVerifiedAt && <p className="mt-3 text-xs text-slate-500">{t("listing.lastVerified")}: {formatDate(l.lastVerifiedAt, locale)}</p>}
            <p className="mt-2 text-xs text-slate-500">{t("listing.checksNote")}</p>
          </Section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            <PriceTag l={l} t={t} locale={locale} large />
            {fx && l.priceVnd && !l.priceOnRequest && (
              <p className="mt-1 text-xs text-slate-500">{t("listing.usd", { usd: formatUsd(l.priceVnd / fx.rate, locale), rate: fx.rate.toLocaleString(), date: fx.date, source: fx.source })}</p>
            )}
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-slate-500">{t("listing.sellerAlias")}</dt><dd className="font-semibold">{l.sellerAlias}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">{t("listing.platformRole")}</dt><dd className="text-right">{t(`enums.PlatformRole.${l.platformRole}`)}</dd></div>
            </dl>
            {l.sellerPublicInfo.length > 0 && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">{t("listing.sellerPublicInfo")}</p>
                <dl className="mt-1 space-y-1 text-sm">
                  {l.sellerPublicInfo.map((i) => (
                    <div key={i.field} className="flex justify-between gap-2">
                      <dt className="text-slate-500">{t(`enums.DisclosableField.${i.field}`)}</dt>
                      <dd className="text-right">{i.field === "companyType" ? t(`enums.CompanyType.${i.value}`) : locale === "en" && i.valueEn ? i.valueEn : i.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500">{t("listing.anonNote")}</p>
            {actor && !preview && (
              <ActionForm action={toggleSaveAction} compact hidden={{ listingId: l.id }} className="mt-3">
                <button className="btn-secondary btn-sm" aria-pressed={saved}>{saved ? `★ ${t("common.savedListing")}` : `☆ ${t("common.saveListing")}`}</button>
              </ActionForm>
            )}
          </div>

          {/* Broker enquiry */}
          <div className="card border-electric-400/40 p-5" id="enquiry">
            <h2 className="text-lg font-semibold">{t("listing.enquiryTitle")}</h2>
            <p className="mt-1 text-sm text-slate-600">{t("listing.brokerNotice")}</p>
            <div className="mt-4">
              {preview ? null : !actor ? (
                <div className="space-y-2">
                  <p className="text-sm">{t("listing.enquirySignIn")}</p>
                  <div className="flex gap-2">
                    <Link href={`/auth/login?next=/listings/${l.id}%23enquiry`} className="btn-primary">{t("common.signIn")}</Link>
                    <Link href={`/auth/register?next=/listings/${l.id}%23enquiry`} className="btn-secondary">{t("common.register")}</Link>
                  </div>
                </div>
              ) : own ? (
                <Alert>{t("listing.enquiryOwn")}</Alert>
              ) : isStaff(actor) ? null : (
                <ActionForm action={createEnquiryAction} hidden={{ listingId: l.id }} submitLabel={t("listing.enquirySend")}>
                  {!company && <Alert tone="warn">{t("listing.enquiryNoCompany")}</Alert>}
                  <F name="message" label={t("listing.enquiryMessage")} type="textarea" placeholder={t("listing.enquiryPlaceholder")} required />
                  <F name="representative" label={t("listing.enquiryRepresentative")} defaultValue={actor.name} required />
                  <F name="acceptTerms" type="checkbox" label={t("listing.enquiryTerms", { version: settings["terms.buyerIntroVersion"] })} />
                  <p className="text-xs"><Link href="/legal/buyer-intro-terms" className="text-electric-600 underline">{t("footer.buyerTerms")}</Link></p>
                </ActionForm>
              )}
            </div>
          </div>

          {swapOk && !preview && (
            <div className="card p-5">
              <p className="font-semibold">{t("listing.swapEligible")}</p>
              <Link href={`/swap?listing=${l.id}#form`} className="btn-teal mt-3">{t("listing.proposeSwap")}</Link>
            </div>
          )}

          <div className="space-y-2 text-xs text-slate-500">
            <p>{t("listing.governed")}</p>
            <p>{t("common.noPayments")}</p>
            <p>{t("listing.privacyNote")}</p>
            <Link href={`/contact?type=REPORT_LISTING&listing=${l.id}`} className="inline-block text-red-700 underline">⚑ {t("listing.report")}</Link>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold">{t("listing.similar")}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((s) => (
              <ListingCard key={s.id} l={s} t={t} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
