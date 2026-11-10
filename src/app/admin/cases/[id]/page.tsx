import Link from "next/link";
import { notFound } from "next/navigation";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { lname } from "@/lib/i18n";
import { DISCLOSABLE_FIELDS, getCase } from "@/lib/services/brokerage";
import { AppError } from "@/lib/errors";
import { can } from "@/lib/rbac";
import { formatDate, formatDateTime, formatUsd, formatVnd } from "@/lib/format";
import { Alert, Pill, Section, StatusPill } from "@/components/ui";
import { ActionForm, CheckGroup, F, SubmitButton } from "@/components/forms";
import { MessageList } from "@/components/messages";
import * as C from "@/app/actions/cases";

const SETTABLE = ["NEW", "BUYER_VERIFICATION_REQUIRED", "UNDER_BROKER_REVIEW", "QUESTIONS_RELAYED", "OFFER_RECEIVED", "NEGOTIATING", "INSPECTION_REQUESTED", "CLOSED", "CANCELLED"];

export default async function BrokerCase({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = (await getActor())!;
  let v;
  try {
    v = await getCase(actor, id);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  if (!v.broker) notFound();
  const b = v.broker;
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const money = (amount: number, currency: string) => (currency === "USD" ? formatUsd(amount, locale) : formatVnd(amount, locale));
  const byChannel = (c: string) => v.messages.filter((m) => m.channel === c);
  const openIntro = b.introductions.find((i) => ["PENDING_REVIEW", "MORE_INFO_REQUIRED", "APPROVED"].includes(i.status));
  const fieldOpts = DISCLOSABLE_FIELDS.map((f) => [f, t(`enums.DisclosableField.${f}`)] as [string, string]);
  const company = (c: typeof b.sellerCompany, label: string) =>
    c ? (
      <div className="rounded-lg border border-slate-200 p-3 text-sm">
        <p className="text-xs font-semibold uppercase text-slate-500">{label} · <span className="font-mono">{c.alias}</span></p>
        <p className="font-semibold">{c.legalName}</p>
        <p className="text-slate-600">{c.registrationNumber} · {t(`enums.CompanyType.${c.companyType}`)} · {lname(c.location, locale)}</p>
        <p className="text-slate-600">{c.contactName} · {c.contactEmail} · {c.contactPhone}</p>
        <p className="mt-1"><StatusPill status={c.verificationStatus} label={t(`enums.CompanyVerification.${c.verificationStatus}`)} /> {c.foreignInvested && <Pill>{t("dash.foreignInvested")}</Pill>}</p>
      </div>
    ) : (
      <div className="rounded-lg border border-dashed border-amber-300 p-3 text-sm text-amber-800">{label}: {t("dash.noCompany")}</div>
    );

  const channelBox = (channel: "BUYER_BROKER" | "SELLER_BROKER", title: string, relayTarget: string) => (
    <Section title={title}>
      <MessageList messages={byChannel(channel)} t={t} locale={locale} staffView />
      <ActionForm action={C.postMessageAction} submitLabel={t("broker.send")} hidden={{ enquiryId: v.id, channel }} resetOnSuccess className="mt-3">
        <F name="body" type="textarea" label={title} rows={2} />
      </ActionForm>
      {byChannel(channel).filter((m) => !m.mine && !m.fromBroker).slice(-1).map((m) => (
        <details key={m.id} className="mt-3 rounded-lg border border-electric-400/40 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-electric-600">{t("broker.relayTo", { side: relayTarget })}</summary>
          <p className="mt-2 text-xs text-slate-500">{t("broker.original")}: “{m.body.slice(0, 200)}”</p>
          <ActionForm action={C.relayMessageAction} submitLabel={t("broker.relay")} hidden={{ enquiryId: v.id, sourceMessageId: m.id }} resetOnSuccess className="mt-2">
            <F name="body" type="textarea" label={t("broker.relayTo", { side: relayTarget })} defaultValue={m.body} rows={3} />
            <F name="confirmFlagged" type="checkbox" label={t("broker.relayConfirm")} />
          </ActionForm>
        </details>
      ))}
    </Section>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-slate-500">{v.reference}</p>
          <h1 className="text-2xl font-bold"><Link href={`/admin/listings/${v.listing.id}`} className="hover:text-electric-600">{v.listing.title}</Link></h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <StatusPill status={v.status} label={t(`enums.EnquiryStatus.${v.status}`)} />
            <span>{t("broker.yourBroker")}: {v.brokerName ?? t("admin.unassigned")}</span>
            {v.listing.isDemo && <Pill tone="amber">{t("common.demoListing")}</Pill>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {b.transactionFull ? (
            <Link href={`/admin/transactions/${b.transactionFull.id}`} className="btn-secondary btn-sm">{t("broker.viewTx")} ({b.transactionFull.reference})</Link>
          ) : (
            <ActionForm action={C.openTransactionAction} compact hidden={{ enquiryId: v.id }} submitLabel={t("broker.openTx")} submitClass="btn-secondary" />
          )}
        </div>
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">⚠ {t("broker.brokerWarning")}</div>

      <Section title={t("broker.parties")}>
        <div className="grid gap-3 md:grid-cols-2">
          {company(b.buyerCompany, t("broker.buyerParty"))}
          {company(b.sellerCompany, t("broker.sellerParty"))}
        </div>
        <p className="mt-2 text-xs text-slate-500">{t("broker.buyerParty")}: {b.buyerUser?.name} · {b.buyerUser?.email}</p>
        <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
          <div>
            <p className="font-semibold">{t("broker.buyerTerms")}</p>
            {b.buyerTerms.length ? b.buyerTerms.map((x) => <p key={x.id} className="text-xs">{x.termsVersion} · {formatDateTime(x.acceptedAt, locale)} · {x.authorizedRepresentative}</p>) : <p className="text-xs text-amber-800">{t("broker.none")}</p>}
          </div>
          <div>
            <p className="font-semibold">{t("broker.sellerAgreement")}</p>
            {b.sellerAgreement ? <p className="text-xs">{b.sellerAgreement.reference} · {t(`enums.AgreementStatus.${b.sellerAgreement.status}`)} · {b.sellerAgreement.documentVersion}</p> : <p className="text-xs text-amber-800">{t("broker.none")}</p>}
          </div>
        </div>
        <div className="mt-3 grid gap-3 text-xs md:grid-cols-2">
          <ul>{b.buyerDocs.map((d) => <li key={d.id}><a className="text-electric-600 underline" href={`/api/files/doc/${d.id}`}>{d.originalFilename}</a> · {t(`enums.DocumentType.${d.type}`)}</li>)}</ul>
          <ul>{b.sellerDocs.map((d) => <li key={d.id}><a className="text-electric-600 underline" href={`/api/files/doc/${d.id}`}>{d.originalFilename}</a> · {t(`enums.DocumentType.${d.type}`)}</li>)}</ul>
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        {channelBox("BUYER_BROKER", t("enums.MessageChannel.BUYER_BROKER"), t("broker.sellerParty"))}
        {channelBox("SELLER_BROKER", t("enums.MessageChannel.SELLER_BROKER"), t("broker.buyerParty"))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title={t("enums.MessageChannel.INTERNAL")}>
          <MessageList messages={byChannel("INTERNAL")} t={t} locale={locale} staffView />
          <ActionForm action={C.postMessageAction} submitLabel={t("broker.send")} hidden={{ enquiryId: v.id, channel: "INTERNAL" }} resetOnSuccess className="mt-3">
            <F name="body" type="textarea" label={t("enums.MessageChannel.INTERNAL")} rows={2} />
          </ActionForm>
          {v.sharedChannelEnabled && (
            <div className="mt-4 border-t pt-3">
              <p className="mb-2 font-semibold">{t("enums.MessageChannel.SHARED")}</p>
              <MessageList messages={byChannel("SHARED")} t={t} locale={locale} staffView />
            </div>
          )}
        </Section>
        <Section title={t("broker.setStatus")}>
          <ActionForm action={C.setCaseStatusAction} submitLabel={t("admin.update")} hidden={{ enquiryId: v.id }}>
            <F name="status" type="select" label={t("common.status")} options={SETTABLE.map((s) => [s, t(`enums.EnquiryStatus.${s}`)])} defaultValue={SETTABLE.includes(v.status) ? v.status : undefined} required />
            <F name="note" type="textarea" label={t("admin.internalNotes")} rows={2} />
          </ActionForm>
          {can(actor, "broker:all") && (
            <ActionForm action={C.assignBrokerAction} compact hidden={{ enquiryId: v.id }} className="mt-4">
              <label className="text-xs" htmlFor="ab">{t("broker.assignBroker")}</label>
              <select id="ab" name="brokerId" defaultValue="" className="input max-w-56">
                <option value="">{t("admin.unassigned")}</option>
                {b.brokers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              <SubmitButton label={t("admin.update")} className="btn-secondary btn-sm" />
            </ActionForm>
          )}
        </Section>
      </div>

      <Section title={t("broker.offers")}>
        {v.offers.length === 0 ? <p className="text-sm text-slate-500">{t("broker.noOffers")}</p> : (
          <table className="table">
            <thead><tr><th>{t("enums.OfferParty.BUYER")}/{t("enums.OfferParty.SELLER")}</th><th>{t("broker.amount")}</th><th>{t("broker.terms")}</th><th>{t("common.status")}</th><th /></tr></thead>
            <tbody>
              {v.offers.map((o) => (
                <tr key={o.id}>
                  <td>{t(`enums.OfferParty.${o.fromParty}`)}<br /><span className="text-xs text-slate-500">{formatDate(o.createdAt, locale)}</span></td>
                  <td className="font-semibold">{money(o.amount, o.currency)}</td>
                  <td className="text-xs">{o.terms}</td>
                  <td>{t(`enums.OfferStatus.${o.status}`)}</td>
                  <td>{o.status === "SUBMITTED" && <ActionForm action={C.relayOfferAction} compact hidden={{ enquiryId: v.id, offerId: o.id }} submitLabel={t("broker.relay")} submitClass="btn-teal" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Introductions */}
      <Section title={t("broker.introduction")}>
        <h3 className="mb-2 text-sm font-semibold">{t("broker.checklist")}</h3>
        <ul className="mb-4 grid gap-1 text-sm sm:grid-cols-2">
          {Object.entries(b.checklist.items).map(([k, ok]) => (
            <li key={k} className={ok ? "text-emerald-700" : "text-red-700"}>{ok ? "✓" : "✕"} {t(`intro.${k}`)}</li>
          ))}
        </ul>
        {b.introductions.map((i) => (
          <div key={i.id} className="mb-4 rounded-lg border border-slate-200 p-3 text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <StatusPill status={i.status === "COMPLETED" ? "APPROVED" : i.status === "PENDING_REVIEW" ? "PENDING" : i.status} label={t(`enums.IntroductionStatus.${i.status}`)} />
              <span className="text-xs text-slate-500">{i.broker.name} · {formatDateTime(i.requestedAt, locale)}{i.approver && ` · ${t("broker.approvedBy", { name: i.approver.name })}`}</span>
            </p>
            <p className="mt-1">{i.purpose}</p>
            <p className="mt-1 text-xs">{t("broker.sellerFields")}: {i.sellerFieldsToBuyer.map((f) => t(`enums.DisclosableField.${f}`)).join(", ") || "—"}</p>
            <p className="text-xs">{t("broker.buyerFields")}: {i.buyerFieldsToSeller.map((f) => t(`enums.DisclosableField.${f}`)).join(", ") || "—"}</p>
            <p className="text-xs">{t("broker.relationship")}: {t(`enums.ExistingRelationship.${i.existingRelationship}`)} {i.existingRelationshipNote && `— ${i.existingRelationshipNote}`}</p>
            {i.reviewNote && <p className="text-xs text-slate-600">{t("broker.reviewNote")}: {i.reviewNote}</p>}
            {i.disclosures.length > 0 && <p className="mt-1 text-xs text-emerald-700">{i.disclosures.length} × IDENTITY_DISCLOSED · {formatDateTime(i.completedAt, locale)}</p>}

            {can(actor, "intro:approve") && ["PENDING_REVIEW", "MORE_INFO_REQUIRED"].includes(i.status) && (
              <ActionForm action={C.reviewIntroAction} hidden={{ enquiryId: v.id, introductionId: i.id }} className="mt-3 border-t border-slate-100 pt-3">
                <F name="reviewNote" type="textarea" label={t("broker.reviewNote")} rows={2} />
                <F name="overrideReason" type="textarea" label={t("broker.overrideReason")} rows={2} />
                <div className="flex flex-wrap gap-2">
                  <SubmitButton label={t("broker.approve")} className="btn-teal btn-sm" name="decision" value="APPROVE" />
                  <SubmitButton label={t("broker.moreInfo")} className="btn-secondary btn-sm" name="decision" value="MORE_INFO" />
                  <SubmitButton label={t("admin.reject")} className="btn-danger btn-sm" name="decision" value="REJECT" />
                </div>
              </ActionForm>
            )}
            {i.status === "APPROVED" && (
              <ActionForm action={C.completeIntroAction} submitLabel={t("broker.complete")} submitClass="btn-primary btn-sm" hidden={{ enquiryId: v.id, introductionId: i.id }} className="mt-3 border-t border-slate-100 pt-3">
                <F name="sharedChannelEnabled" type="checkbox" label={t("broker.enableShared")} />
              </ActionForm>
            )}
            {["PENDING_REVIEW", "MORE_INFO_REQUIRED"].includes(i.status) && !i.sellerDeclaredAt && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-electric-600">{t("broker.declareTitle")} ({t("enums.Role.BROKER")})</summary>
                <ActionForm action={C.declareRelationshipAction} submitLabel={t("broker.declare")} submitClass="btn-secondary btn-sm" hidden={{ enquiryId: v.id, introductionId: i.id }} className="mt-2">
                  <F name="relationship" type="select" label={t("broker.relationship")} options={(["NONE", "KNOWN_BUYER", "ACTIVE_NEGOTIATION"] as const).map((x) => [x, t(`enums.ExistingRelationship.${x}`)])} required />
                  <F name="note" type="textarea" label={t("broker.evidence")} rows={2} />
                </ActionForm>
              </details>
            )}
          </div>
        ))}
        {!openIntro && !b.introductions.some((i) => i.status === "COMPLETED") && (
          <details className="rounded-lg border border-electric-400/40 p-3" open={b.checklist.ok}>
            <summary className="cursor-pointer font-semibold text-electric-600">{t("broker.requestIntro")}</summary>
            {!b.checklist.ok && <Alert tone="warn">{t("errors.introPreconditions")}</Alert>}
            <ActionForm action={C.requestIntroAction} submitLabel={t("broker.requestIntro")} hidden={{ enquiryId: v.id }} className="mt-3">
              <F name="purpose" type="textarea" label={t("broker.purpose")} rows={2} required />
              <CheckGroup name="sellerFieldsToBuyer" label={t("broker.sellerFields")} options={fieldOpts} defaults={["legalName", "contactName", "contactEmail"]} />
              <CheckGroup name="buyerFieldsToSeller" label={t("broker.buyerFields")} options={fieldOpts} defaults={["legalName", "contactName", "contactEmail"]} />
              <F name="evidenceRef" label={t("broker.evidence")} />
              <F name="notes" type="textarea" label={t("broker.notes")} rows={2} />
            </ActionForm>
          </details>
        )}
      </Section>

      {/* Inspections */}
      <Section title={t("broker.inspections")}>
        <p className="mb-3 text-xs text-slate-500">{t("broker.inspectionNote")}</p>
        {v.inspections.map((i) => (
          <div key={i.id} className="mb-3 rounded-lg border border-slate-200 p-3 text-sm">
            <p className="font-medium">{t(`enums.InspectionType.${i.type}`)} · {formatDateTime(i.scheduledAt, locale)} · {t(`enums.InspectionOutcome.${i.outcome}`)}</p>
            <p className="text-xs text-slate-600">{t("broker.location")}: {i.location ?? "—"} · {t("broker.participants")}: {i.participants ?? "—"} · {t("broker.provider")}: {i.provider ?? "—"}</p>
            <ActionForm action={C.updateInspectionAction} submitLabel={t("admin.update")} submitClass="btn-secondary btn-sm" hidden={{ enquiryId: v.id, inspectionId: i.id }} className="mt-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <F name="outcome" type="select" label={t("broker.outcome")} options={["SCHEDULED", "PASSED", "ISSUES_FOUND", "FAILED", "CANCELLED"].map((o) => [o, t(`enums.InspectionOutcome.${o}`)])} defaultValue={i.outcome} required />
                <F name="reportRef" label={t("broker.report")} defaultValue={i.reportRef} />
              </div>
              <F name="followUp" type="textarea" label={t("broker.followUp")} defaultValue={i.followUp} rows={2} />
              <F name="shareLocation" type="checkbox" label={t("broker.shareLocation")} defaultChecked={i.shareLocation} />
            </ActionForm>
          </div>
        ))}
        <details className="rounded-lg border border-slate-200 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-electric-600">{t("broker.schedule")}</summary>
          <ActionForm action={C.scheduleInspectionAction} submitLabel={t("broker.schedule")} hidden={{ enquiryId: v.id }} className="mt-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <F name="type" type="select" label={t("broker.inspectionType")} options={["VIDEO", "ON_SITE", "INDEPENDENT_PARTNER"].map((o) => [o, t(`enums.InspectionType.${o}`)])} required />
              <F name="scheduledAt" type="datetime-local" label={t("broker.when")} required />
              <F name="location" label={t("broker.location")} />
              <F name="provider" label={t("broker.provider")} />
            </div>
            <F name="participants" label={t("broker.participants")} />
            <F name="shareLocation" type="checkbox" label={t("broker.shareLocation")} />
          </ActionForm>
        </details>
      </Section>
    </div>
  );
}
