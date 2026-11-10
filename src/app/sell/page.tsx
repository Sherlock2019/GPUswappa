import Link from "next/link";
import type { Metadata } from "next";
import { getActor } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getMyCompany } from "@/lib/services/companies";
import { Alert, PageHeader } from "@/components/ui";
import { CreditedPhoto } from "@/components/listing";
import { ActionForm } from "@/components/forms";
import { createDraftAction } from "@/app/actions/listings";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Sell your GPU" };

export default async function SellPage() {
  const [t, locale, actor] = await Promise.all([getT(), getLocale(), getActor()]);
  const company = actor ? await getMyCompany(actor) : null;
  return (
    <>
      <PageHeader title={t("sell.title")} subtitle={t("sell.intro")} />
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <div className="card p-6">
            <ol className="grid gap-2 sm:grid-cols-2">
              {t.list("sell.steps").map((s, i) => (
                <li key={s} className="flex items-center gap-3 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-electric-100 text-xs font-bold text-electric-600">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
          <div className="card space-y-3 p-6">
            {!actor ? (
              <>
                <p>{t("sell.needAccount")}</p>
                <div className="flex gap-2">
                  <Link href="/auth/register?type=SELLER&next=/sell" className="btn-primary">{t("common.register")}</Link>
                  <Link href="/auth/login?next=/sell" className="btn-secondary">{t("common.signIn")}</Link>
                </div>
              </>
            ) : actor.role !== "SELLER" ? (
              <Alert tone="warn">{t("sell.needSellerRole")}</Alert>
            ) : !company ? (
              <>
                <p>{t("sell.needCompany")}</p>
                <Link href="/dashboard/company?next=/sell" className="btn-primary">{t("dash.createCompany")}</Link>
              </>
            ) : (
              <ActionForm action={createDraftAction} submitLabel={t("sell.start")} />
            )}
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <p>{t("sell.unknownNote")}</p>
            <p>{t("sell.invoiceNote")}</p>
            <p>{t("fees.standard")}</p>
            <p>{t("agreements.summaryCommission", { pct: "5" })}</p>
          </div>
        </div>
        <CreditedPhoto k="dcRackRear" locale={locale} t={t} imgClass="h-96" />
      </div>
    </>
  );
}
