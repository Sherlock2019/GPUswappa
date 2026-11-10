/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { lname } from "@/lib/i18n";
import { getReviewCase } from "@/lib/services/review";
import { BADGE_CHECKS } from "@/lib/badges";
import { AppError } from "@/lib/errors";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatVnd } from "@/lib/format";
import { Alert, DefList, Pill, Section, StatusPill } from "@/components/ui";
import { ActionForm, F, SubmitButton } from "@/components/forms";
import * as A from "@/app/actions/admin";

const CHECK_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "NEEDS_INFO", "PASSED", "FAILED", "NOT_APPLICABLE"];

export default async function ReviewPanel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = (await getActor())!;
  let rc;
  try {
    rc = await getReviewCase(actor, id);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  const { listing: l, checks, blockers, reviewers, latestRecommendation } = rc;
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const isAdminUser = can(actor, "review:decide");
  const brokers = isAdminUser ? await prisma.user.findMany({ where: { role: { in: ["BROKER", "ADMIN"] }, status: "ACTIVE" }, select: { id: true, name: true } }) : [];
  const e = (k: string, v: string | null | undefined) => (v ? t(`enums.${k}.${v}`) : null);
  const outcomes = isAdminUser ? ["APPROVE", "RETURN_FOR_INFO", "HOLD", "REJECT", "ARCHIVE"] : ["RETURN_FOR_INFO", "HOLD"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-slate-500">{t("admin.listings")}</p>
          <h1 className="text-2xl font-bold">{l.title || "—"}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <StatusPill status={l.publicationStatus} label={t(`enums.PublicationStatus.${l.publicationStatus}`)} />
            {l.escalated && <Pill tone="red">{t("admin.escalatedTag")}</Pill>}
            {l.isDemo && <Pill tone="amber">{t("common.demoListing")}</Pill>}
            {l.exportReviewRequired && <Pill tone="purple">{t("enums.ReviewFlag.EXPORT_REVIEW")}</Pill>}
          </p>
        </div>
        <Link href={`/listings/${l.id}`} className="btn-secondary btn-sm">{t("admin.publicCheck")}</Link>
      </div>

      {l.escalated && l.escalationNote && <Alert tone="warn" title={t("admin.escalatedTag")}>{l.escalationNote}</Alert>}

      <div className="grid gap-6 2xl:grid-cols-[1fr_520px]">
        <div className="space-y-6">
          <Section title={t("admin.flags")}>
            {l.reviewFlags.length ? (
              <ul className="flex flex-wrap gap-1">{l.reviewFlags.map((f) => <li key={f}><Pill tone="amber">{t(`enums.ReviewFlag.${f}`)}</Pill></li>)}</ul>
            ) : <p className="text-sm text-slate-500">{t("admin.noFlags")}</p>}
            <p className="mt-2 text-xs text-slate-500">{t("sell.unknownNote")}</p>
          </Section>

          <Section title={t("listing.specs")}>
            <DefList
              items={[
                [t("listing.category"), lname(l.category, locale)],
                [t("listing.gpuModel"), l.gpuModel?.name ?? l.gpuModelOther],
                [t("listing.gpuQuantity"), String(l.gpuQuantity)],
                [t("listing.condition"), e("Condition", l.condition)],
                [t("listing.hasKnownFaults"), e("TriState", l.hasKnownFaults)],
                [t("listing.knownDefects"), l.knownDefects],
                [t("listing.location"), lname(l.location, locale)],
                [t("sell.qInVietnam"), e("TriState", l.inVietnam)],
                [t("sell.qOwnership"), e("OwnershipAnswer", l.ownership)],
                [t("sell.qEncumbrance"), e("Encumbrance", l.encumbrance)],
                [t("sell.qCustoms"), e("CustomsStatus", l.customsStatus)],
                [t("listing.price"), l.priceOnRequest ? t("common.priceOnRequest") : formatVnd(l.priceVnd, locale)],
                [t("listing.transactionType"), e("TransactionType", l.transactionType)],
                [t("listing.warrantyStatus"), e("WarrantyStatus", l.warrantyStatus)],
              ]}
            />
            <div className="mt-4 rounded-lg border border-purple-200 bg-violet-50 p-3">
              <p className="text-xs font-semibold uppercase text-violet-800">{t("admin.privateData")}</p>
              <DefList items={[[t("admin.serials"), l.serialNumbers], [t("admin.customsNotes"), l.customsNotes]]} />
            </div>
          </Section>

          <Section title={t("admin.seller")}>
            <p className="font-semibold">{l.sellerCompany.legalName} <span className="font-mono text-xs text-slate-500">({l.sellerCompany.alias})</span></p>
            <p className="text-sm text-slate-600">{l.sellerCompany.registrationNumber} · {t(`enums.CompanyType.${l.sellerCompany.companyType}`)} · {lname(l.sellerCompany.location, locale)} {l.sellerCompany.foreignInvested && `· ${t("dash.foreignInvested")}`}</p>
            <p className="mt-1 text-sm"><StatusPill status={l.sellerCompany.verificationStatus} label={t(`enums.CompanyVerification.${l.sellerCompany.verificationStatus}`)} /></p>
            <p className="mt-1 text-xs text-slate-500">{l.createdBy.name} · {l.createdBy.email}</p>
          </Section>

          <Section title={t("admin.documents")}>
            {[...l.documents, ...l.sellerCompany.documents].length === 0 ? <p className="text-sm text-slate-500">{t("common.none")}</p> : (
              <ul className="divide-y divide-slate-100 text-sm">
                {[...l.documents, ...l.sellerCompany.documents].map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span><a href={`/api/files/doc/${d.id}`} className="text-electric-600 underline">{d.originalFilename}</a> · {t(`enums.DocumentType.${d.type}`)} · {formatDate(d.uploadedAt, locale)}</span>
                    <ActionForm action={A.docReviewAction} compact hidden={{ id: d.id, listingId: l.id }}>
                      <StatusPill status={d.reviewStatus} label={t(`enums.DocReviewStatus.${d.reviewStatus}`)} />
                      <SubmitButton label={t("admin.approve")} className="btn-ghost btn-sm text-emerald-700" name="status" value="ACCEPTED" />
                      <SubmitButton label={t("admin.reject")} className="btn-ghost btn-sm text-red-700" name="status" value="REJECTED" />
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t("admin.images")}>
            {l.images.length === 0 ? <p className="text-sm text-slate-500">{t("common.none")}</p> : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {l.images.map((img) => (
                  <li key={img.id} className="card overflow-hidden">
                    <img src={`/api/files/image/${img.id}`} alt={img.altText} className="h-28 w-full object-cover" />
                    <ActionForm action={A.imageApprovalAction} compact hidden={{ id: img.id, listingId: l.id }} className="p-2">
                      <StatusPill status={img.approvalStatus} label={t(`enums.ImageApproval.${img.approvalStatus}`)} />
                      <SubmitButton label="✓" className="btn-ghost btn-sm text-emerald-700" name="status" value="APPROVED" />
                      <SubmitButton label="✕" className="btn-ghost btn-sm text-red-700" name="status" value="REJECTED" />
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t("sell.reviewMessages")}>
            <ul className="space-y-2">
              {l.messages.map((m) => (
                <li key={m.id} className={`rounded-lg p-3 text-sm ${m.fromStaff ? "bg-electric-100/60" : "bg-slate-100"}`}>
                  <p className="text-xs text-slate-500">{m.author.name} · {formatDateTime(m.createdAt, locale)}</p>
                  <p className="whitespace-pre-line">{m.body}</p>
                </li>
              ))}
            </ul>
            <ActionForm action={A.staffMessageAction} submitLabel={t("broker.send")} hidden={{ listingId: l.id }} resetOnSuccess className="mt-3">
              <F name="body" type="textarea" label={t("admin.messageToSeller")} rows={2} />
            </ActionForm>
          </Section>
        </div>

        <div className="space-y-6">
          {isAdminUser && (
            <Section title={t("admin.assign")}>
              <ActionForm action={A.assignReviewerAction} compact hidden={{ listingId: l.id }}>
                <label className="sr-only" htmlFor="rev">{t("admin.assigned")}</label>
                <select id="rev" name="reviewerId" defaultValue={l.assignedReviewer?.id ?? ""} className="input max-w-56">
                  <option value="">{t("admin.unassigned")}</option>
                  {reviewers.map((r) => <option key={r.id} value={r.id}>{r.name} ({t(`enums.Role.${r.role}`)})</option>)}
                </select>
                <SubmitButton label={t("admin.update")} className="btn-secondary btn-sm" />
              </ActionForm>
              <ActionForm action={A.assignListingBrokerAction} compact hidden={{ listingId: l.id }} className="mt-2">
                <label className="text-xs text-slate-600" htmlFor="brk">{t("broker.assignBroker")}</label>
                <select id="brk" name="brokerId" defaultValue={l.brokerId ?? ""} className="input max-w-56">
                  <option value="">{t("admin.unassigned")}</option>
                  {brokers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <SubmitButton label={t("admin.update")} className="btn-secondary btn-sm" />
              </ActionForm>
              <ActionForm action={A.platformRoleAction} compact hidden={{ listingId: l.id }} className="mt-2">
                <label className="text-xs text-slate-600" htmlFor="pr">{t("admin.platformRole")}</label>
                <select id="pr" name="platformRole" defaultValue={l.platformRole} className="input max-w-56">
                  {["INTERMEDIARY", "SELLER"].map((r) => <option key={r} value={r}>{t(`enums.PlatformRole.${r}`)}</option>)}
                </select>
                <SubmitButton label={t("admin.update")} className="btn-secondary btn-sm" />
              </ActionForm>
            </Section>
          )}

          <Section title={t("admin.checks")}>
            <ul className="space-y-3">
              {checks.map((c) => (
                <li key={c.checkType}>
                  <details className="rounded-lg border border-slate-200 p-3" open={c.status === "NOT_STARTED" ? false : undefined}>
                    <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold">
                      <span>{t(`enums.CheckType.${c.checkType}`)} {c.publicBadge && c.status === "PASSED" && <span title="Public badge" className="text-teal-600">●</span>}</span>
                      <StatusPill status={c.status} label={t(`enums.CheckStatus.${c.status}`)} />
                    </summary>
                    {c.reviewer && c.reviewedAt && <p className="mt-1 text-xs text-slate-500">{t("admin.lastBy", { name: c.reviewer.name, date: formatDateTime(c.reviewedAt, locale) })}</p>}
                    <ActionForm action={A.recordCheckAction} submitLabel={t("admin.recordCheck")} submitClass="btn-primary btn-sm" hidden={{ listingId: l.id, checkType: c.checkType }} className="mt-3">
                      <F name="status" type="select" label={t("common.status")} options={CHECK_STATUSES.map((s) => [s, t(`enums.CheckStatus.${s}`)])} defaultValue={c.status} required />
                      <F name="evidenceRef" label={t("admin.evidenceRef")} defaultValue={c.evidenceRef} />
                      <F name="internalNotes" type="textarea" label={t("admin.internalNotes")} defaultValue={c.internalNotes} rows={2} />
                      {BADGE_CHECKS.includes(c.checkType) && <F name="publicBadge" type="checkbox" label={t("admin.publicBadge")} defaultChecked={c.publicBadge} />}
                      <F name="nextReviewAt" type="date" label={t("admin.nextReviewAt")} defaultValue={c.nextReviewAt ? c.nextReviewAt.toISOString().slice(0, 10) : ""} />
                    </ActionForm>
                  </details>
                </li>
              ))}
            </ul>
          </Section>

          <Section title={t("admin.decision")}>
            {blockers.length ? (
              <Alert tone="warn" title={t("admin.blockers")}>
                <ul className="list-disc pl-5">
                  {blockers.map((b) => {
                    const [, type, status] = b.split(":");
                    return <li key={b}>{t(`enums.CheckType.${type}`)} — {t(`enums.CheckStatus.${status}`)}</li>;
                  })}
                </ul>
              </Alert>
            ) : <Alert tone="success">{t("admin.noBlockers")}</Alert>}
            {latestRecommendation && (
              <p className="mt-3 text-sm">{t("admin.recommendation")}: <strong>{t(`enums.ReviewOutcome.${latestRecommendation.outcome}`)}</strong> — {latestRecommendation.actor.name}: {latestRecommendation.reason}</p>
            )}
            <ActionForm action={A.decideAction} submitLabel={t("admin.decision")} hidden={{ listingId: l.id }} className="mt-4">
              <F name="outcome" type="select" label={t("admin.outcome")} options={outcomes.map((o) => [o, t(`enums.ReviewOutcome.${o}`)])} required />
              <F name="reason" type="textarea" label={t("admin.reason")} rows={2} />
              <F name="messageToSeller" type="textarea" label={t("admin.messageToSeller")} rows={2} />
              {isAdminUser && <F name="confirmOverride" type="checkbox" label={t("admin.confirmOverride")} />}
            </ActionForm>
          </Section>

          <Section title={t("admin.recommend")}>
            <ActionForm action={A.recommendAction} submitLabel={t("admin.recommend")} submitClass="btn-secondary" hidden={{ listingId: l.id }} resetOnSuccess>
              <F name="outcome" type="select" label={t("admin.outcome")} options={["APPROVE", "REJECT"].map((o) => [o, t(`enums.ReviewOutcome.${o}`)])} required />
              <F name="reason" type="textarea" label={t("admin.reason")} rows={2} required />
            </ActionForm>
            {!isAdminUser && (
              <ActionForm action={A.escalateAction} submitLabel={t("admin.escalate")} submitClass="btn-danger btn-sm" hidden={{ listingId: l.id }} resetOnSuccess className="mt-4 border-t border-slate-200 pt-4">
                <F name="note" type="textarea" label={t("admin.escalationNote")} rows={2} required />
              </ActionForm>
            )}
          </Section>

          <Section title={t("admin.decisions")}>
            {l.decisions.length === 0 ? <p className="text-sm text-slate-500">{t("common.none")}</p> : (
              <ul className="space-y-2 text-sm">
                {l.decisions.map((d) => (
                  <li key={d.id} className="border-b border-slate-100 pb-2">
                    <p><strong>{t(`enums.ReviewOutcome.${d.outcome}`)}</strong> {d.kind === "RECOMMENDATION" && <Pill>{t("admin.recommend")}</Pill>} {d.override && <Pill tone="red">{t("admin.override")}</Pill>}</p>
                    <p className="text-xs text-slate-500">{d.actor.name} · {formatDateTime(d.createdAt, locale)}</p>
                    {d.reason && <p className="text-xs">{d.reason}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
