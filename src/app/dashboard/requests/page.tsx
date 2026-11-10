import Link from "next/link";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { lname } from "@/lib/i18n";
import { listMyRequests } from "@/lib/services/marketplace";
import { formatDate, formatVnd } from "@/lib/format";
import { EmptyState, StatusPill } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { closeMyRequestAction } from "@/app/actions/market";

export default async function MyRequests() {
  const actor = (await getActor())!;
  const [t, locale, rows] = await Promise.all([getT(), getLocale(), listMyRequests(actor)]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("dash.requests")}</h1>
        <Link href="/requests#new" className="btn-primary btn-sm">+ {t("requests.newTitle")}</Link>
      </div>
      {rows.length === 0 ? <EmptyState title={t("dash.noRequests")} /> : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="card flex flex-wrap items-start justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">{r.desiredEquipment}</p>
                <p className="text-sm text-slate-600">
                  {t("listing.gpus", { count: r.quantity })} · {r.gpuModel?.name ?? "—"} · 📍 {lname(r.location, locale)} · {formatVnd(r.budgetMinVnd, locale)} – {formatVnd(r.budgetMaxVnd, locale)}
                </p>
                <p className="text-xs text-slate-500">{t(`enums.Visibility.${r.visibility}`)} · {formatDate(r.createdAt, locale)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={r.status} label={t(`enums.RequestStatus.${r.status}`)} />
                {r.status !== "CLOSED" && (
                  <ActionForm action={closeMyRequestAction} compact hidden={{ id: r.id }}>
                    <button className="btn-ghost btn-sm">{t("dash.closeRequest")}</button>
                  </ActionForm>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
