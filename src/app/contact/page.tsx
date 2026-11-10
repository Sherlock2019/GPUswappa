import Link from "next/link";
import type { Metadata } from "next";
import { getActor } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { ActionForm, F } from "@/components/forms";
import { contactAction } from "@/app/actions/market";

export const metadata: Metadata = { title: "Contact" };
const TYPES = ["GENERAL", "REPORT_LISTING", "SELLER_SUPPORT", "BUYER_SUPPORT"];

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ type?: string; listing?: string }> }) {
  const [{ type, listing }, t, actor] = await Promise.all([searchParams, getT(), getActor()]);
  return (
    <>
      <PageHeader title={t("contact.title")} subtitle={t("contact.subtitle")} actions={<Link href="/about#partner" className="btn-secondary">{t("contact.partnerLink")}</Link>} />
      <div className="container-page max-w-2xl py-10">
        <div className="card p-6">
          <ActionForm action={contactAction} submitLabel={t("common.submit")} resetOnSuccess>
            <F name="type" type="select" label={t("contact.type")} options={TYPES.map((x) => [x, t(`enums.ContactType.${x}`)])} defaultValue={TYPES.includes(type ?? "") ? type : "GENERAL"} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <F name="name" label={t("contact.name")} defaultValue={actor?.name} required />
              <F name="email" type="email" label={t("contact.email")} defaultValue={actor?.email} required />
              <F name="organization" label={t("contact.organization")} />
              <F name="listingId" label={t("contact.listingId")} defaultValue={listing} />
            </div>
            <F name="subject" label={t("contact.subject")} />
            <F name="message" type="textarea" label={t("contact.message")} required rows={6} />
            <div className="hidden" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>
          </ActionForm>
        </div>
      </div>
    </>
  );
}
