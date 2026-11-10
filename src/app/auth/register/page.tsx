import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { ActionForm, F } from "@/components/forms";
import { registerAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Register" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; type?: string }> }) {
  const [{ next, type }, t] = await Promise.all([searchParams, getT()]);
  return (
    <div className="container-page max-w-xl py-12">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">{t("auth.registerTitle")}</h1>
        <ActionForm action={registerAction} submitLabel={t("common.register")} hidden={{ next: next ?? "" }} className="mt-6">
          <F name="name" label={t("auth.name")} required />
          <F name="email" type="email" label={t("auth.email")} required />
          <F name="password" type="password" label={t("auth.password")} help={t("auth.passwordHelp")} required />
          <F name="accountType" type="radio" label={t("auth.accountType")} defaultValue={type === "SELLER" ? "SELLER" : "BUYER"} options={[["BUYER", t("auth.buyer")], ["SELLER", t("auth.seller")]]} required />
          <F name="acceptTerms" type="checkbox" label={t("auth.acceptTerms")} />
          <p className="text-xs">
            <Link href="/legal/terms" className="text-electric-600 underline">{t("footer.terms")}</Link> · <Link href="/legal/privacy" className="text-electric-600 underline">{t("footer.privacy")}</Link>
          </p>
        </ActionForm>
        <p className="mt-4 text-sm">
          {t("auth.haveAccount")} <Link href={`/auth/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-electric-600 hover:underline">{t("common.signIn")}</Link>
        </p>
      </div>
    </div>
  );
}
