import Link from "next/link";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { listInspections } from "@/lib/services/brokerage";
import { formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/ui";

export default async function InspectionsPage() {
  const actor = (await getActor())!;
  const [t, locale, rows] = await Promise.all([getT(), getLocale(), listInspections(actor)]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("admin.inspections")}</h1>
      <p className="text-sm text-slate-600">{t("broker.inspectionNote")}</p>
      {rows.length === 0 ? <EmptyState title={t("broker.noInspections")} /> : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[760px]">
            <thead><tr><th>{t("broker.when")}</th><th>{t("broker.inspectionType")}</th><th>{t("broker.reference")}</th><th>{t("listing.title")}</th><th>{t("broker.location")}</th><th>{t("broker.outcome")}</th><th>{t("broker.yourBroker")}</th></tr></thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id}>
                  <td>{formatDateTime(i.scheduledAt, locale)}</td>
                  <td>{t(`enums.InspectionType.${i.type}`)}</td>
                  <td><Link href={`/admin/cases/${i.enquiry.id}`} className="font-mono text-electric-600">{i.enquiry.reference}</Link></td>
                  <td className="max-w-48 truncate">{i.listing.title}</td>
                  <td className="text-xs">{i.location ?? "—"} {i.shareLocation ? "· ✓" : ""}</td>
                  <td>{t(`enums.InspectionOutcome.${i.outcome}`)}</td>
                  <td className="text-xs">{i.broker.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
