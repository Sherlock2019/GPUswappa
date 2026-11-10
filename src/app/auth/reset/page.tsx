import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { emailConfigured } from "@/lib/mail";
import { Alert } from "@/components/ui";
import { ActionForm, F } from "@/components/forms";
import { requestResetAction, resetPasswordAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [{ token }, t] = await Promise.all([searchParams, getT()]);
  const configured = emailConfigured();
  return (
    <div className="container-page max-w-xl py-12">
      <div className="card space-y-4 p-6">
        <h1 className="text-2xl font-bold">{t("auth.resetTitle")}</h1>
        {!configured ? (
          <Alert tone="warn">{t("auth.resetUnavailable")}</Alert>
        ) : token ? (
          <ActionForm action={resetPasswordAction} submitLabel={t("common.save")} hidden={{ token }}>
            <F name="password" type="password" label={t("auth.newPassword")} help={t("auth.passwordHelp")} required />
          </ActionForm>
        ) : (
          <>
            {process.env.EMAIL_DRIVER === "console" && <Alert>{t("auth.resetDevNote")}</Alert>}
            <ActionForm action={requestResetAction} submitLabel={t("auth.resetRequest")} resetOnSuccess>
              <F name="email" type="email" label={t("auth.email")} required />
            </ActionForm>
          </>
        )}
      </div>
    </div>
  );
}
