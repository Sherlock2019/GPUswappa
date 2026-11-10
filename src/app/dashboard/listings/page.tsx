import Link from "next/link";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { listMyListings } from "@/lib/services/listings";
import { formatDate, formatVnd } from "@/lib/format";
import { EmptyState, StatusPill } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { createDraftAction } from "@/app/actions/listings";

export default async function MyListings() {
  const actor = (await getActor())!;
  const [t, locale, rows] = await Promise.all([getT(), getLocale(), listMyListings(actor)]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("dash.listings")}</h1>
        <ActionForm action={createDraftAction} submitLabel={`+ ${t("dash.newListing")}`} compact />
      </div>
      {rows.length === 0 ? (
        <EmptyState title={t("dash.noListings")} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[640px]">
            <thead>
              <tr>
                <th>{t("listing.title")}</th>
                <th>{t("common.status")}</th>
                <th>{t("listing.price")}</th>
                <th>{t("broker.cases")}</th>
                <th>{t("common.updated")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td>
                    <Link href={`/dashboard/listings/${l.id}`} className="font-medium text-electric-600 hover:underline">{l.title || "—"}</Link>
                    <p className="text-xs text-slate-500">{l.gpuModel?.name}</p>
                  </td>
                  <td><StatusPill status={l.publicationStatus} label={t(`enums.PublicationStatus.${l.publicationStatus}`)} /></td>
                  <td>{l.priceOnRequest ? t("common.priceOnRequest") : formatVnd(l.priceVnd, locale)}</td>
                  <td>{l._count.enquiries}</td>
                  <td>{formatDate(l.updatedAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
