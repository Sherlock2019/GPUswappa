import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLocale, getT } from "@/lib/i18n/server";
import { getContentPage, listContentPages } from "@/lib/services/admin";
import { formatDate } from "@/lib/format";
import { Alert } from "@/components/ui";
import { SimpleText } from "@/components/simple-text";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const page = await getContentPage((await params).slug);
  return { title: page?.titleEn ?? "Legal" };
}

export default async function LegalPage({ params }: P) {
  const { slug } = await params;
  const [page, pages, t, locale] = await Promise.all([getContentPage(slug), listContentPages(), getT(), getLocale()]);
  if (!page) notFound();
  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-[240px_1fr]">
      <nav aria-label={t("legal.pages")} className="text-sm">
        <p className="mb-2 font-semibold text-slate-600">{t("legal.pages")}</p>
        <ul className="space-y-1">
          {pages.map((p) => (
            <li key={p.slug}>
              <Link href={`/legal/${p.slug}`} aria-current={p.slug === slug ? "page" : undefined} className={`block rounded px-2 py-1 ${p.slug === slug ? "bg-electric-100 font-semibold text-electric-600" : "hover:bg-slate-100"}`}>
                {locale === "en" ? p.titleEn : p.titleVi}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <article className="card p-6 sm:p-8">
        <h1 className="text-2xl font-bold">{locale === "en" ? page.titleEn : page.titleVi}</h1>
        <p className="mt-1 text-xs text-slate-500">{t("legal.lastUpdated", { date: formatDate(page.updatedAt, locale) })}</p>
        {page.isLegalDraft && <div className="my-4"><Alert tone="warn">{t("legal.draftBanner")}</Alert></div>}
        <SimpleText text={locale === "en" ? page.bodyEn : page.bodyVi} lang={locale} />
        {locale === "en" && <p className="mt-6 text-xs italic text-slate-500">{t("common.translationNote")}</p>}
      </article>
    </div>
  );
}
