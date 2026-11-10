import Link from "next/link";
import type { Metadata } from "next";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { lname } from "@/lib/i18n";
import { getActiveCatalog } from "@/lib/services/admin";
import { prisma } from "@/lib/db";
import { isStaff } from "@/lib/rbac";
import { Alert, PageHeader } from "@/components/ui";
import { CreditedPhoto } from "@/components/listing";
import { ActionForm, F } from "@/components/forms";
import { createSwapAction } from "@/app/actions/market";

export const metadata: Metadata = { title: "Swap & trade-in" };

export default async function SwapPage({ searchParams }: { searchParams: Promise<{ listing?: string }> }) {
  const [{ listing: listingId }, t, locale, actor, catalog] = await Promise.all([searchParams, getT(), getLocale(), getActor(), getActiveCatalog()]);
  const listing = listingId ? await prisma.listing.findFirst({ where: { id: listingId, publicationStatus: "PUBLISHED", transactionType: { in: ["SWAP", "SALE_OR_SWAP"] } }, select: { id: true, title: true } }) : null;
  const types = t.raw<{ title: string; text: string }[]>("swap.types");
  const opt = (k: string, vals: string[]) => vals.map((v) => [v, t(`enums.${k}.${v}`)] as [string, string]);
  return (
    <>
      <PageHeader title={t("swap.title")} subtitle={t("swap.subtitle")} />
      <div className="container-page space-y-10 py-10">
        <div className="grid gap-4 md:grid-cols-3">
          {types.map((x) => (
            <div key={x.title} className="card p-5">
              <h2 className="font-semibold">{x.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{x.text}</p>
            </div>
          ))}
        </div>
        <Alert tone="warn">
          <p>{t("swap.checksNote")}</p>
          <p className="mt-1">{t("swap.taxNote")}</p>
        </Alert>
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <section id="form" className="card p-6">
            <h2 className="text-xl font-bold">{t("swap.formTitle")}</h2>
            {!actor ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm">{t("swap.signIn")}</p>
                <Link href={`/auth/login?next=${encodeURIComponent(`/swap${listing ? `?listing=${listing.id}` : ""}`)}`} className="btn-primary">{t("common.signIn")}</Link>
              </div>
            ) : isStaff(actor) ? null : (
              <ActionForm action={createSwapAction} submitLabel={t("common.submit")} resetOnSuccess hidden={{ listingId: listing?.id ?? "" }} className="mt-4">
                {listing && <Alert>{t("swap.forListing")} <strong>{listing.title}</strong></Alert>}
                <F name="offeredEquipment" label={t("swap.offered")} required />
                <F name="offeredCondition" type="select" label={t("swap.offeredCondition")} options={opt("Condition", ["NEW", "UNUSED", "USED", "REFURBISHED"])} required />
                <F name="offeredDetails" type="textarea" label={t("swap.offeredDetails")} required />
                <F name="offeredEstimatedValue" label={t("swap.offeredValue")} />
                <F name="requestedEquipment" label={t("swap.requested")} defaultValue={listing?.title} required />
                <F name="requestedEstimatedValue" label={t("swap.requestedValue")} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <F name="cashDirection" type="select" label={t("swap.cashDirection")} options={opt("CashDirection", ["NONE", "PROPOSER_PAYS", "PROPOSER_RECEIVES"])} defaultValue="NONE" required />
                  <F name="cashAdjustment" label={t("swap.cashAdjustment")} />
                  <F name="preferredLocationId" type="select" label={t("swap.location")} options={catalog.locations.map((l) => [l.id, lname(l, locale)])} />
                  <F name="proposedTiming" label={t("swap.timing")} />
                </div>
                <F name="acknowledgeChecks" type="checkbox" label={t("swap.acknowledge")} />
              </ActionForm>
            )}
          </section>
          <CreditedPhoto k="dcRacks" locale={locale} t={t} imgClass="h-80" />
        </div>
      </div>
    </>
  );
}
