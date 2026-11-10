import Link from "next/link";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { listDocumentsForReview } from "@/lib/services/files";
import { formatDateTime } from "@/lib/format";
import { EmptyState, StatusPill } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { docReviewAction } from "@/app/actions/admin";

export default async function DocumentsPage() {
  const actor = (await getActor())!;
  const [t, locale, rows] = await Promise.all([getT(), getLocale(), listDocumentsForReview(actor)]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("admin.documents")}</h1>
      <p className="text-sm text-slate-600">{t("listing.privacyNote")}</p>
      {rows.length === 0 ? <EmptyState title={t("common.emptyTitle")} /> : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[860px]">
            <thead><tr><th>{t("sell.file")}</th><th>{t("sell.docType")}</th><th>{t("listing.title")} / {t("admin.companies")}</th><th>{t("common.created")}</th><th>{t("common.status")}</th><th /></tr></thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td><a href={`/api/files/doc/${d.id}`} className="text-electric-600 underline">{d.originalFilename}</a><p className="text-xs text-slate-500">{Math.round(d.size / 1024)} KB · {d.contentType}</p></td>
                  <td className="text-xs">{t(`enums.DocumentType.${d.type}`)}</td>
                  <td className="text-xs">{d.listing ? <Link href={`/admin/listings/${d.listing.id}`} className="text-electric-600">{d.listing.title}</Link> : d.company?.displayName}</td>
                  <td className="text-xs">{d.uploadedBy.name} · {formatDateTime(d.uploadedAt, locale)}</td>
                  <td><StatusPill status={d.reviewStatus} label={t(`enums.DocReviewStatus.${d.reviewStatus}`)} /></td>
                  <td>
                    <ActionForm action={docReviewAction} compact hidden={{ id: d.id, listingId: d.listing?.id ?? "" }}>
                      <SubmitButton label={t("admin.approve")} className="btn-ghost btn-sm text-emerald-700" name="status" value="ACCEPTED" />
                      <SubmitButton label={t("admin.reject")} className="btn-ghost btn-sm text-red-700" name="status" value="REJECTED" />
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
