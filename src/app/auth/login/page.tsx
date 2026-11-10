import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { ActionForm, F } from "@/components/forms";
import { loginAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, t] = await Promise.all([searchParams, getT()]);
  const demo = process.env.DEMO_MODE === "true" && process.env.NODE_ENV !== "production";
  return (
    <div className="container-page grid max-w-5xl gap-8 py-12 md:grid-cols-2">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">{t("auth.loginTitle")}</h1>
        <ActionForm action={loginAction} submitLabel={t("common.signIn")} hidden={{ next: next ?? "" }} className="mt-6">
          <F name="email" type="email" label={t("auth.email")} required />
          <F name="password" type="password" label={t("auth.password")} required />
        </ActionForm>
        <div className="mt-4 flex justify-between text-sm">
          <Link href="/auth/reset" className="text-electric-600 hover:underline">{t("auth.forgot")}</Link>
          <span>
            {t("auth.noAccount")} <Link href={`/auth/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-electric-600 hover:underline">{t("common.register")}</Link>
          </span>
        </div>
      </div>
      {demo && (
        <div className="card border-amber-300 bg-amber-50 p-6">
          <h2 className="font-semibold">{t("auth.demoTitle")}</h2>
          <p className="mt-1 text-sm">{t("auth.demoText")}</p>
          <ul className="mt-3 space-y-1 font-mono text-sm">
            <li>admin@example.com — {t("enums.Role.ADMIN")}</li>
            <li>reviewer@example.com — {t("enums.Role.REVIEWER")}</li>
            <li>broker@example.com — {t("enums.Role.BROKER")}</li>
            <li>broker2@example.com — {t("enums.Role.BROKER")}</li>
            <li>seller@ · seller2@ · seller3@ · seller4@ · seller5@example.com — {t("enums.Role.SELLER")}</li>
            <li>buyer@ · buyer2@ · buyer3@ · buyer4@ · buyer5@example.com — {t("enums.Role.BUYER")}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
