import Link from "next/link";
import { getActor } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { adminOverview } from "@/lib/services/admin";
import { Alert } from "@/components/ui";
import { refreshBrokerageStates } from "@/lib/services/brokerage";

const LINKS: Record<string, string> = {
  newCases: "/admin/cases?status=NEW",
  enquiries: "/admin/cases",
  introsPending: "/admin/introductions?status=PENDING_REVIEW",
  upcomingInspections: "/admin/inspections",
  commissionsDue: "/admin/transactions?commission=DUE",
  disputes: "/admin/transactions?status=DISPUTED",
  feesDue: "/admin/fees?status=DUE",
  feesOverdue: "/admin/fees?status=OVERDUE",
  pendingCompanies: "/admin/companies?status=PENDING",
  underReview: "/admin/listings?status=UNDER_REVIEW",
  needsInfo: "/admin/listings?status=NEEDS_INFO",
  onHold: "/admin/listings?status=ON_HOLD",
  published: "/admin/listings?status=PUBLISHED",
  escalated: "/admin/listings",
  swaps: "/admin/swaps",
  requests: "/admin/requests",
  reports: "/admin/inbox",
  contacts: "/admin/inbox",
  partners: "/admin/partners",
  pendingDocs: "/admin/documents",
};

export default async function AdminHome() {
  const actor = (await getActor())!;
  await refreshBrokerageStates();
  const [t, counts] = await Promise.all([getT(), adminOverview(actor)]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("admin.overview")}</h1>
      {actor.role !== "ADMIN" && <Alert>{t("admin.reviewerScope")}</Alert>}
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        {Object.entries(counts).map(([k, v]) => (
          <li key={k}>
            <Link href={LINKS[k] ?? "/admin"} className={`card block p-4 hover:border-electric-500 ${v > 0 && ["feesOverdue", "disputes", "escalated", "introsPending", "reports"].includes(k) ? "border-amber-300 bg-amber-50" : ""}`}>
              <p className="text-3xl font-bold text-navy-900">{v}</p>
              <p className="text-xs text-slate-600">{t(`admin.counts.${k}`)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
