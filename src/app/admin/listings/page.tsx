import Link from "next/link";
import type { PublicationStatus } from "@prisma/client";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { reviewQueue } from "@/lib/services/review";
import { formatDate } from "@/lib/format";
import { EmptyState, Pill, StatusPill } from "@/components/ui";

const STATUSES: PublicationStatus[] = ["UNDER_REVIEW", "ON_HOLD", "NEEDS_INFO", "PUBLISHED", "REJECTED", "ARCHIVED"];

export default async function ReviewQueue({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const actor = (await getActor())!;
  const { status } = await searchParams;
  const filter = (STATUSES as string[]).includes(status ?? "") ? (status as PublicationStatus) : "ALL";
  const [t, locale, rows] = await Promise.all([getT(), getLocale(), reviewQueue(actor, filter)]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("admin.listings")}</h1>
      <nav className="flex flex-wrap gap-1" aria-label={t("admin.filter")}>
        {(["ALL", ...STATUSES] as const).map((s) => (
          <Link key={s} href={s === "ALL" ? "/admin/listings" : `/admin/listings?status=${s}`} aria-current={filter === s} className={`btn-sm btn ${filter === s ? "bg-navy-900 text-white" : "btn-ghost"}`}>
            {s === "ALL" ? t("common.all") : t(`enums.PublicationStatus.${s}`)}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? <EmptyState title={t("common.emptyTitle")} /> : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[860px]">
            <thead>
              <tr><th>{t("listing.title")}</th><th>{t("admin.seller")}</th><th>{t("common.status")}</th><th>{t("admin.flags")}</th><th>{t("admin.checks")}</th><th>{t("admin.assigned")}</th><th>{t("admin.submitted")}</th></tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const done = l.checks.filter((c) => ["PASSED", "NOT_APPLICABLE", "FAILED"].includes(c.status)).length;
                return (
                  <tr key={l.id}>
                    <td>
                      <Link href={`/admin/listings/${l.id}`} className="font-medium text-electric-600 hover:underline">{l.title || "—"}</Link>
                      <div className="mt-0.5 flex gap-1">
                        {l.escalated && <Pill tone="red">{t("admin.escalatedTag")}</Pill>}
                        {l.isDemo && <Pill tone="amber">Demo</Pill>}
                      </div>
                    </td>
                    <td className="text-xs">{l.sellerCompany.displayName}<br /><StatusPill status={l.sellerCompany.verificationStatus} label={t(`enums.CompanyVerification.${l.sellerCompany.verificationStatus}`)} /></td>
                    <td><StatusPill status={l.publicationStatus} label={t(`enums.PublicationStatus.${l.publicationStatus}`)} /></td>
                    <td className="text-xs">{l.reviewFlags.length ? l.reviewFlags.map((f) => t(`enums.ReviewFlag.${f}`)).join("; ") : "—"}</td>
                    <td className="text-xs">{t("admin.checkProgress", { done, total: l.checks.length })}</td>
                    <td className="text-xs">{l.assignedReviewer?.name ?? t("admin.unassigned")}</td>
                    <td className="text-xs">{formatDate(l.submittedAt, locale)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
