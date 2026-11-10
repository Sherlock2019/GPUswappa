import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { lname } from "@/lib/i18n";
import { listAllRequests } from "@/lib/services/marketplace";
import { formatDate, formatVnd } from "@/lib/format";
import { EmptyState, StatusPill } from "@/components/ui";
import { StatusForm, PageTitle } from "../inbox-pages";
import { requestStatusAction } from "@/app/actions/admin";

export default async function AdminRequests() {
  const actor = (await getActor())!;
  const [t, locale, rows] = await Promise.all([getT(), getLocale(), listAllRequests(actor)]);
  return (
    <div className="space-y-4">
      <PageTitle>{t("admin.requests")}</PageTitle>
      {rows.length === 0 ? <EmptyState title={t("common.emptyTitle")} /> : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[900px]">
            <thead><tr><th>{t("requests.desiredEquipment")}</th><th>{t("broker.buyerParty")}</th><th>{t("admin.budget")}</th><th>{t("requests.visibility")}</th><th>{t("common.status")}</th><th>{t("common.created")}</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><p className="font-medium">{r.desiredEquipment}</p><p className="text-xs text-slate-500">{t("listing.gpus", { count: r.quantity })} · {r.gpuModel?.name ?? "—"} · {lname(r.location, locale)} · {t(`enums.ConditionPref.${r.conditionPreference}`)}</p>{r.requirements && <p className="text-xs">{r.requirements}</p>}</td>
                  <td className="text-xs">{r.buyer.name} &lt;{r.buyer.email}&gt;<br />{r.buyerCompany?.displayName}<br />{t(`enums.ContactPref.${r.contactPreference}`)}</td>
                  <td className="text-xs">{formatVnd(r.budgetMinVnd, locale)} – {formatVnd(r.budgetMaxVnd, locale)}{r.hideBudget && <><br />({t("requests.budgetHidden")})</>}</td>
                  <td className="text-xs">{t(`enums.Visibility.${r.visibility}`)}</td>
                  <td><StatusPill status={r.status} label={t(`enums.RequestStatus.${r.status}`)} /></td>
                  <td className="text-xs">{formatDate(r.createdAt, locale)}</td>
                  <td><StatusForm action={requestStatusAction as never} id={r.id} statuses={["OPEN", "UNDER_REVIEW", "MATCHED", "CLOSED"]} enumKey="RequestStatus" current={r.status} notes={r.adminNotes} t={t} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
