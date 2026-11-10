import Link from "next/link";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { listInbox } from "@/lib/services/marketplace";
import { formatDateTime } from "@/lib/format";
import { EmptyState, Pill, StatusPill } from "@/components/ui";
import { StatusForm, PageTitle } from "../inbox-pages";
import { contactStatusAction } from "@/app/actions/admin";

export default async function AdminInbox() {
  const actor = (await getActor())!;
  const [t, locale, rows] = await Promise.all([getT(), getLocale(), listInbox(actor)]);
  return (
    <div className="space-y-4">
      <PageTitle>{t("admin.inbox")}</PageTitle>
      {rows.length === 0 ? <EmptyState title={t("common.emptyTitle")} /> : (
        <ul className="space-y-3">
          {rows.map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <Pill tone={c.type === "REPORT_LISTING" ? "red" : "blue"}>{t(`enums.ContactType.${c.type}`)}</Pill>
                    {c.subject ?? "—"}
                  </p>
                  <p className="text-xs text-slate-500">{c.name} &lt;{c.email}&gt; {c.organization && `· ${c.organization}`} · {formatDateTime(c.createdAt, locale)}</p>
                  {c.listing && <Link href={`/admin/listings/${c.listing.id}`} className="text-xs text-electric-600">{c.listing.title}</Link>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={c.status} label={t(`enums.InboxStatus.${c.status}`)} />
                  <StatusForm action={contactStatusAction as never} id={c.id} statuses={["NEW", "IN_PROGRESS", "RESOLVED", "CLOSED"]} enumKey="InboxStatus" current={c.status} notes={c.adminNotes} t={t} />
                </div>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm">{c.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
