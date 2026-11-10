import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { listUsers } from "@/lib/services/users";
import { formatDate } from "@/lib/format";
import { StatusPill } from "@/components/ui";
import { ActionForm, F } from "@/components/forms";
import { userRoleAction } from "@/app/actions/admin";

const ROLES = ["BUYER", "SELLER", "REVIEWER", "BROKER", "ADMIN"];

export default async function UsersPage() {
  const actor = (await getActor())!;
  const [t, locale, users] = await Promise.all([getT(), getLocale(), listUsers(actor)]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("admin.users")}</h1>
      <div className="card overflow-x-auto">
        <table className="table min-w-[900px]">
          <thead><tr><th>{t("auth.name")}</th><th>{t("auth.email")}</th><th>{t("admin.companies")}</th><th>{t("admin.role")}</th><th>{t("common.status")}</th><th>{t("common.created")}</th><th /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td className="text-xs">{u.email}</td>
                <td className="text-xs">{u.memberships.map((m) => m.company.displayName).join(", ") || "—"}</td>
                <td>{t(`enums.Role.${u.role}`)}</td>
                <td><StatusPill status={u.status} label={t(`enums.UserStatus.${u.status}`)} /></td>
                <td className="text-xs">{formatDate(u.createdAt, locale)}</td>
                <td>
                  {u.id !== actor.id && (
                    <details>
                      <summary className="cursor-pointer text-xs text-electric-600">{t("common.edit")}</summary>
                      <ActionForm action={userRoleAction} submitLabel={t("admin.update")} submitClass="btn-primary btn-sm" hidden={{ id: u.id }} className="mt-2 w-64">
                        <F name="role" type="select" label={t("admin.role")} options={ROLES.map((r) => [r, t(`enums.Role.${r}`)])} defaultValue={u.role} required />
                        <F name="status" type="select" label={t("common.status")} options={["ACTIVE", "SUSPENDED"].map((s) => [s, t(`enums.UserStatus.${s}`)])} defaultValue={u.status} required />
                        <F name="reason" type="textarea" label={t("admin.reason")} rows={2} required />
                      </ActionForm>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
