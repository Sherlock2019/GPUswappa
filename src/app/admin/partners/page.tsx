import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { listPartners } from "@/lib/services/marketplace";
import { formatDateTime } from "@/lib/format";
import { EmptyState, Pill, StatusPill } from "@/components/ui";
import { StatusForm, PageTitle } from "../inbox-pages";
import { partnerStatusAction } from "@/app/actions/admin";

export default async function AdminPartners() {
  const actor = (await getActor())!;
  const [t, locale, rows] = await Promise.all([getT(), getLocale(), listPartners(actor)]);
  return (
    <div className="space-y-4">
      <PageTitle>{t("admin.partners")}</PageTitle>
      <p className="text-sm text-slate-600">{t("about.partnersNote")}</p>
      {rows.length === 0 ? <EmptyState title={t("common.emptyTitle")} /> : (
        <ul className="space-y-3">
          {rows.map((p) => (
            <li key={p.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{p.organization} <Pill tone="teal">{t(`enums.PartnerCategory.${p.partnerCategory}`)}</Pill></p>
                  <p className="text-xs text-slate-500">{p.contactName} &lt;{p.email}&gt; {p.phone && `· ${p.phone}`} · {formatDateTime(p.createdAt, locale)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={p.status} label={t(`enums.InboxStatus.${p.status}`)} />
                  <StatusForm action={partnerStatusAction as never} id={p.id} statuses={["NEW", "IN_PROGRESS", "RESOLVED", "CLOSED"]} enumKey="InboxStatus" current={p.status} notes={p.adminNotes} t={t} />
                </div>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm">{p.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
