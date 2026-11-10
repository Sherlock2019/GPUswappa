import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { listNotifications } from "@/lib/services/notifications";
import { formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { NotificationText } from "@/components/notification-text";
import { markAllReadAction } from "@/app/actions/account";

export default async function NotificationsPage() {
  const actor = (await getActor())!;
  const [t, locale, rows] = await Promise.all([getT(), getLocale(), listNotifications(actor)]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("dash.notifications")}</h1>
        {rows.some((r) => !r.readAt) && <ActionForm action={markAllReadAction} compact submitLabel={t("dash.markAllRead")} submitClass="btn-secondary" />}
      </div>
      {rows.length === 0 ? <EmptyState title={t("dash.noNotifications")} /> : (
        <ul className="card divide-y divide-slate-100">
          {rows.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-3 p-3 text-sm">
              <NotificationText t={t} n={n} />
              <span className="shrink-0 text-xs text-slate-400">{formatDateTime(n.createdAt, locale)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
