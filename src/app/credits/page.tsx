/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { getLocale, getT } from "@/lib/i18n/server";
import { PHOTOS } from "@/lib/photos";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Image credits" };

export default async function CreditsPage() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return (
    <>
      <PageHeader title={t("footer.credits")} subtitle={t("footer.trademarks")} />
      <div className="container-page grid gap-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {Object.values(PHOTOS).map((p) => (
          <figure key={p.src} className="card overflow-hidden">
            <img src={p.src} alt={locale === "en" ? p.altEn : p.altVi} className="h-44 w-full object-cover" loading="lazy" />
            <figcaption className="p-3 text-sm">
              <p className="font-medium">{locale === "en" ? p.altEn : p.altVi}</p>
              <p className="text-slate-600">{p.author} · <a href={p.licenseUrl} className="underline" target="_blank" rel="noopener noreferrer">{p.license}</a></p>
              <a href={p.sourceUrl} className="text-xs text-electric-600 underline" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>
              <p className="mt-1 text-xs text-slate-500">{t("home.photoCaption")}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}
