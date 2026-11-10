import Link from "next/link";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { listAudit } from "@/lib/services/admin";
import { formatDateTime } from "@/lib/format";

const TYPES = ["Listing", "Enquiry", "Introduction", "Disclosure", "Transaction", "ListingFee", "BrokerageAgreement", "Document", "Company", "User", "SiteSetting"];

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const actor = (await getActor())!;
  const { type } = await searchParams;
  const [t, locale, rows] = await Promise.all([getT(), getLocale(), listAudit(actor, { resourceType: TYPES.includes(type ?? "") ? type : undefined, take: 300 })]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("admin.audit")}</h1>
      <nav className="flex flex-wrap gap-1">
        <Link href="/admin/audit" className={`btn btn-sm ${!type ? "bg-navy-900 text-white" : "btn-ghost"}`}>{t("common.all")}</Link>
        {TYPES.map((x) => <Link key={x} href={`?type=${x}`} className={`btn btn-sm ${type === x ? "bg-navy-900 text-white" : "btn-ghost"}`}>{x}</Link>)}
      </nav>
      <div className="card overflow-x-auto">
        <table className="table min-w-[900px]">
          <thead><tr><th>{t("admin.when")}</th><th>{t("admin.actor")}</th><th>{t("admin.action")}</th><th>{t("admin.resource")}</th><th>{t("admin.reason")}</th><th>{t("admin.details")}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.action.includes("OVERRIDE") || r.action === "IDENTITY_DISCLOSED" ? "bg-amber-50" : ""}>
                <td className="whitespace-nowrap text-xs">{formatDateTime(r.createdAt, locale)}</td>
                <td className="text-xs">{r.actor ? `${r.actor.name} (${t(`enums.Role.${r.actor.role}`)})` : "—"}</td>
                <td className="font-mono text-xs">{r.action}</td>
                <td className="font-mono text-xs">{r.resourceType}{r.resourceId ? ` · ${r.resourceId.slice(-8)}` : ""}</td>
                <td className="max-w-56 text-xs">{r.reason}</td>
                <td className="max-w-80 truncate font-mono text-[11px] text-slate-500" title={JSON.stringify(r.metadata)}>{r.metadata ? JSON.stringify(r.metadata) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
