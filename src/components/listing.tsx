/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { T, Locale } from "@/lib/i18n";
import { lname } from "@/lib/i18n";
import type { PublicListing } from "@/lib/services/listings";
import { formatDate, formatUsd, formatVnd } from "@/lib/format";
import { fxInfo } from "@/lib/settings";
import { getSettingsCached } from "@/lib/settings-server";
import { PHOTOS, type PhotoKey } from "@/lib/photos";
import { GpuPlaceholder, Pill } from "./ui";

/**
 * Price display: Vietnamese → VND. English → USD converted from VND, but ONLY when an exchange
 * rate, rate date and source are configured (Admin › Content); otherwise English falls back to VND.
 * The VND amount and the rate date are always shown alongside a converted USD figure.
 */
export async function PriceTag({ l, t, locale, large = false }: { l: Pick<PublicListing, "priceVnd" | "priceOnRequest" | "priceIllustrative">; t: T; locale: Locale; large?: boolean }) {
  const onRequest = l.priceOnRequest || l.priceVnd === null;
  const fx = locale === "en" && !onRequest ? fxInfo(await getSettingsCached()) : null;
  const main = onRequest ? t("common.priceOnRequest") : fx ? formatUsd(Math.round(l.priceVnd! / fx.rate / 100) * 100, "en") : formatVnd(l.priceVnd, locale);
  return (
    <div>
      <p className={`font-bold text-navy-900 ${large ? "text-3xl" : "text-lg"}`}>{main}</p>
      {fx && <p className={`${large ? "text-sm" : "text-[11px]"} text-slate-500`}>≈ {formatVnd(l.priceVnd, "en")} · {t("listing.fxNote", { rate: fx.rate.toLocaleString("en-US"), date: fx.date })}</p>}
      {l.priceIllustrative && !onRequest && <p className="text-xs font-medium text-amber-700">{t("common.illustrativePrice")}</p>}
    </div>
  );
}

export function BadgeChips({ l, t, max = 3 }: { l: PublicListing; t: T; max?: number }) {
  if (!l.badges.length) return null;
  const shown = l.badges.slice(0, max);
  return (
    <ul className="flex flex-wrap gap-1" aria-label={t("listing.checksTitle")}>
      {shown.map((b) => (
        <li key={b.checkType}>
          <Pill tone="teal">
            <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
            {t(`enums.CheckType.${b.checkType}`)}
          </Pill>
        </li>
      ))}
      {l.badges.length > max && (
        <li>
          <Pill tone="slate">+{l.badges.length - max}</Pill>
        </li>
      )}
    </ul>
  );
}

export function ListingCard({ l, t, locale, view = "grid" }: { l: PublicListing; t: T; locale: Locale; view?: "grid" | "list" }) {
  const img = l.images[0];
  const imgBox = img ? (
    <div className="relative">
      <img src={`/api/files/image/${img.id}`} alt={img.altText} className={`w-full object-cover ${view === "grid" ? "h-44" : "h-full min-h-36"}`} loading="lazy" />
      {img.isIllustrative && <span className="absolute bottom-1 left-1 rounded bg-navy-950/80 px-1.5 py-0.5 text-[10px] text-white">{t("common.illustrativeImage")}</span>}
    </div>
  ) : (
    <GpuPlaceholder label={t("listing.noImage")} className={view === "grid" ? "h-44" : "h-full min-h-36"} />
  );
  return (
    <article className={`card overflow-hidden transition-shadow hover:shadow-md ${view === "list" ? "grid grid-cols-1 sm:grid-cols-[220px_1fr]" : "flex flex-col"}`}>
      {imgBox}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1">
          {l.isDemo && <Pill tone="amber">{t("common.demoListing")}</Pill>}
          {l.transactionType && <Pill tone="blue">{t(`enums.TransactionType.${l.transactionType}`)}</Pill>}
          {l.condition && <Pill>{t(`enums.Condition.${l.condition}`)}</Pill>}
        </div>
        <h3 className="text-base font-semibold leading-snug">
          <Link href={`/listings/${l.id}`} className="hover:text-electric-600 after:absolute after:inset-0 relative">
            {l.title}
          </Link>
        </h3>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
          {l.gpuModelName && (
            <>
              <dt className="sr-only">{t("listing.gpuModel")}</dt>
              <dd className="font-medium text-slate-800">{l.gpuModelName}</dd>
            </>
          )}
          {l.gpuQuantity > 0 && (
            <>
              <dt className="sr-only">{t("listing.gpuQuantity")}</dt>
              <dd>{t("listing.gpus", { count: l.gpuQuantity })}</dd>
            </>
          )}
          <dt className="sr-only">{t("listing.location")}</dt>
          <dd>📍 {lname(l.location, locale)}</dd>
          <dt className="sr-only">{t("listing.listed")}</dt>
          <dd>{formatDate(l.publishedAt, locale)}</dd>
        </dl>
        <BadgeChips l={l} t={t} />
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <PriceTag l={l} t={t} locale={locale} />
          <span className="text-xs text-slate-500">{l.sellerAlias}</span>
        </div>
      </div>
    </article>
  );
}

export function CreditedPhoto({ k, locale, t, className = "", imgClass = "h-64" }: { k: PhotoKey; locale: Locale; t: T; className?: string; imgClass?: string }) {
  const p = PHOTOS[k];
  return (
    <figure className={className}>
      <img src={p.src} alt={locale === "en" ? p.altEn : p.altVi} className={`w-full rounded-xl object-cover ${imgClass}`} loading="lazy" />
      <figcaption className="mt-1 text-[11px] text-slate-500">
        {t("home.photoCaption")}{" "}
        <a href={p.sourceUrl} className="underline hover:text-electric-600" rel="noopener noreferrer" target="_blank">
          {t("common.photoCredit", { author: p.author, license: p.license })}
        </a>
      </figcaption>
    </figure>
  );
}
