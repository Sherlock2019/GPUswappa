import Link from "next/link";
import type { CompanyVerification } from "@prisma/client";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { lname } from "@/lib/i18n";
import { listCompanies } from "@/lib/services/companies";
import { formatDate } from "@/lib/format";
import { EmptyState, Pill, StatusPill } from "@/components/ui";
import { ActionForm, F } from "@/components/forms";
import { companyVerificationAction } from "@/app/actions/admin";

const ST: CompanyVerification[] = ["PENDING", "NEEDS_INFO", "VERIFIED", "REJECTED"];

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const actor = (await getActor())!;
  const { status } = await searchParams;
  const filter = (ST as string[]).includes(status ?? "") ? (status as CompanyVerification) : undefined;
  const [t, locale, rows] = await Promise.all([getT(), getLocale(), listCompanies(actor, filter)]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("admin.companies")}</h1>
      <nav className="flex flex-wrap gap-1">
        <Link href="/admin/companies" className={`btn btn-sm ${!filter ? "bg-navy-900 text-white" : "btn-ghost"}`}>{t("common.all")}</Link>
        {ST.map((s) => <Link key={s} href={`?status=${s}`} className={`btn btn-sm ${filter === s ? "bg-navy-900 text-white" : "btn-ghost"}`}>{t(`enums.CompanyVerification.${s}`)}</Link>)}
      </nav>
      {rows.length === 0 ? <EmptyState title={t("common.emptyTitle")} /> : (
        <ul className="space-y-3">
          {rows.map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{c.legalName} <span className="font-mono text-xs text-slate-500">{c.alias}</span> {c.isDemo && <Pill tone="amber">Demo</Pill>} {c.foreignInvested && <Pill>{t("dash.foreignInvested")}</Pill>}</p>
                  <p className="text-sm text-slate-600">{c.registrationNumber} · {t(`enums.CompanyType.${c.companyType}`)} · {c.address} · {lname(c.location, locale)}</p>
                  <p className="text-xs text-slate-500">{c.memberships.map((m) => `${m.user.name} <${m.user.email}> (${t(`enums.MembershipAuth.${m.authorizationStatus}`)})`).join("; ")} · {c._count.listings} listings · {formatDate(c.createdAt, locale)}</p>
                  {c.documents.length > 0 && <p className="mt-1 text-xs">{c.documents.map((d) => <a key={d.id} href={`/api/files/doc/${d.id}`} className="mr-2 text-electric-600 underline">{d.originalFilename}</a>)}</p>}
                </div>
                <StatusPill status={c.verificationStatus} label={t(`enums.CompanyVerification.${c.verificationStatus}`)} />
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-electric-600">{t("admin.verify")}</summary>
                <ActionForm action={companyVerificationAction} submitLabel={t("admin.update")} submitClass="btn-primary btn-sm" hidden={{ id: c.id }} className="mt-2 max-w-lg">
                  <F name="status" type="select" label={t("common.status")} options={ST.map((s) => [s, t(`enums.CompanyVerification.${s}`)])} defaultValue={c.verificationStatus} required />
                  <F name="note" type="textarea" label={t("admin.note")} defaultValue={c.verificationNote} rows={2} />
                  <F name="authorizeMembers" type="checkbox" label={t("admin.authorizeMembers")} defaultChecked />
                </ActionForm>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
