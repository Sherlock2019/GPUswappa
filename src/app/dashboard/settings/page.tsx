import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { Section } from "@/components/ui";
import { ActionForm, F } from "@/components/forms";
import { changePasswordAction, updateProfileAction } from "@/app/actions/account";

export default async function SettingsPage() {
  const actor = (await getActor())!;
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("dash.settings")}</h1>
      <Section title={t("dash.profile")}>
        <p className="mb-3 text-sm text-slate-600">{actor.email} · {t(`enums.Role.${actor.role}`)}</p>
        <ActionForm action={updateProfileAction} submitLabel={t("common.save")}>
          <F name="name" label={t("auth.name")} defaultValue={actor.name} required />
          <F name="locale" type="select" label={t("dash.preferredLanguage")} options={[["vi", "Tiếng Việt"], ["en", "English"]]} defaultValue={locale} required />
        </ActionForm>
      </Section>
      <Section title={t("dash.changePassword")}>
        <ActionForm action={changePasswordAction} submitLabel={t("common.save")} resetOnSuccess>
          <F name="current" type="password" label={t("dash.currentPassword")} required />
          <F name="password" type="password" label={t("auth.newPassword")} help={t("auth.passwordHelp")} required />
        </ActionForm>
      </Section>
    </div>
  );
}
