import Link from "next/link";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { listMyCases } from "@/lib/services/brokerage";
import { formatDate } from "@/lib/format";
import { EmptyState, StatusPill } from "@/components/ui";

export default async function MyCases() {
  const actor = (await getActor())!;
  const [t, locale, cases] = await Promise.all([getT(), getLocale(), listMyCases(actor)]);
  const table = (rows: typeof cases.asBuyer) =>
    rows.length === 0 ? (
      <EmptyState title={t("broker.casesEmpty")} />
    ) : (
      <div className="card overflow-x-auto">
        <table className="table min-w-[560px]">
          <thead>
            <tr><th>{t("broker.reference")}</th><th>{t("listing.title")}</th><th>{t("broker.counterparty")}</th><th>{t("common.status")}</th><th>{t("common.updated")}</th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/dashboard/cases/${c.id}`} className="font-mono text-electric-600 hover:underline">{c.reference}</Link></td>
                <td>{c.listing.title}</td>
                <td className="font-mono text-xs">{c.counterpartyAlias}</td>
                <td><StatusPill status={c.status} label={t(`enums.EnquiryStatus.${c.status}`)} /></td>
                <td>{formatDate(c.updatedAt, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("broker.cases")}</h1>
      <p className="text-sm text-slate-600">{t("listing.brokerNotice")}</p>
      <section className="space-y-2"><h2 className="font-semibold">{t("broker.asBuyer")}</h2>{table(cases.asBuyer)}</section>
      {actor.role === "SELLER" && <section className="space-y-2"><h2 className="font-semibold">{t("broker.asSeller")}</h2>{table(cases.asSeller)}</section>}
    </div>
  );
}
