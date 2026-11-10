import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { getCase } from "@/lib/services/brokerage";
import { AppError } from "@/lib/errors";
import { formatDate, formatDateTime, formatUsd, formatVnd } from "@/lib/format";
import { Alert, Pill, Section, StatusPill } from "@/components/ui";
import { ActionForm, F, SubmitButton } from "@/components/forms";
import { MessageList } from "@/components/messages";
import * as C from "@/app/actions/cases";

type P = { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> };

export default async function CasePage({ params, searchParams }: P) {
  const [{ id }, { sent }] = await Promise.all([params, searchParams]);
  const actor = (await getActor())!;
  let v;
  try {
    v = await getCase(actor, id);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  if (v.role === "BROKER" || v.role === "ADMIN") redirect(`/admin/cases/${id}`);
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const money = (amount: number, currency: string) => (currency === "USD" ? formatUsd(amount, locale) : formatVnd(amount, locale));
  const counterparty = v.role === "BUYER" ? v.sellerAlias : v.buyerAlias ?? "VN-B-····";
  const closed = ["CLOSED", "CANCELLED"].includes(v.status);
  const ownChannel = v.messages.filter((m) => m.channel !== "SHARED");
  const shared = v.messages.filter((m) => m.channel === "SHARED");

  return (
    <div className="space-y-6">
      {sent && <Alert tone="success">{t("listing.enquirySent")}</Alert>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-slate-500">{v.reference}</p>
          <h1 className="text-2xl font-bold">
            <Link href={`/listings/${v.listing.id}`} className="hover:text-electric-600">{v.listing.title}</Link>
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <StatusPill status={v.status} label={t(`enums.EnquiryStatus.${v.status}`)} />
            <span>{t("broker.counterparty")}: <span className="font-mono">{counterparty}</span></span>
            <span>· {t("broker.yourBroker")}: {v.brokerName ?? t("broker.unassigned")}</span>
            {v.listing.isDemo && <Pill tone="amber">{t("common.demoListing")}</Pill>}
          </p>
        </div>
        {v.role === "BUYER" && !closed && (
          <ActionForm action={C.cancelMyCaseAction} compact hidden={{ enquiryId: v.id }} confirm={t("broker.cancelCase") + "?"}>
            <button className="btn-ghost btn-sm text-red-700">{t("broker.cancelCase")}</button>
          </ActionForm>
        )}
      </div>

      <Alert>{t("broker.channelNote")}</Alert>

      {v.disclosedToMe.length > 0 && (
        <Section title={t("broker.disclosed")}>
          {v.disclosedToMe.map((d, i) => (
            <div key={i} className="mb-2">
              <p className="text-xs text-slate-500">{t("broker.disclosedAt", { date: formatDateTime(d.at, locale) })}</p>
              <dl className="grid gap-1 text-sm sm:grid-cols-2">
                {Object.entries(d.snapshot).map(([k, val]) => (
                  <div key={k}><dt className="text-xs uppercase text-slate-500">{t(`enums.DisclosableField.${k}`)}</dt><dd className="font-medium">{val}</dd></div>
                ))}
              </dl>
            </div>
          ))}
        </Section>
      )}

      {/* Seller existing-relationship declaration */}
      {v.role === "SELLER" && v.introduction && ["PENDING_REVIEW", "MORE_INFO_REQUIRED"].includes(v.introduction.status) && !v.introduction.sellerDeclaredAt && (
        <Section title={t("broker.declareTitle")}>
          <p className="mb-3 text-sm">{t("broker.declareText", { alias: counterparty })}</p>
          <ActionForm action={C.declareRelationshipAction} submitLabel={t("broker.declare")} hidden={{ enquiryId: v.id, introductionId: v.introduction.id }}>
            <F name="relationship" type="radio" label={t("broker.relationship")} options={(["NONE", "KNOWN_BUYER", "ACTIVE_NEGOTIATION"] as const).map((x) => [x, t(`enums.ExistingRelationship.${x}`)])} required />
            <F name="note" type="textarea" label={t("broker.notes")} rows={2} />
          </ActionForm>
        </Section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Section title={t("broker.channelBuyer")}>
          <MessageList messages={ownChannel} t={t} locale={locale} />
          {!closed && (
            <ActionForm action={C.postMessageAction} submitLabel={t("broker.send")} hidden={{ enquiryId: v.id }} resetOnSuccess className="mt-4">
              <F name="body" type="textarea" label={t("broker.channelBuyer")} placeholder={t("broker.messagePlaceholder")} rows={3} />
            </ActionForm>
          )}
          {v.sharedChannelEnabled && (
            <div className="mt-6 border-t border-slate-200 pt-4">
              <h3 className="mb-2 font-semibold">{t("broker.channelShared")}</h3>
              <MessageList messages={shared} t={t} locale={locale} />
              {!closed && (
                <ActionForm action={C.postMessageAction} submitLabel={t("broker.send")} hidden={{ enquiryId: v.id, channel: "SHARED" }} resetOnSuccess className="mt-3">
                  <F name="body" type="textarea" label={t("broker.channelShared")} rows={2} />
                </ActionForm>
              )}
            </div>
          )}
        </Section>

        <div className="space-y-6">
          <Section title={t("broker.offers")}>
            {v.offers.length === 0 ? (
              <p className="text-sm text-slate-500">{t("broker.noOffers")}</p>
            ) : (
              <ul className="space-y-2">
                {v.offers.map((o) => {
                  const mine = o.fromParty === v.role;
                  return (
                    <li key={o.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{money(o.amount, o.currency)}</span>
                        <StatusPill status={o.status === "RELAYED" ? "OPEN" : o.status === "ACCEPTED" ? "APPROVED" : o.status === "REJECTED" ? "DECLINED" : o.status} label={t(`enums.OfferStatus.${o.status}`)} />
                      </div>
                      <p className="text-xs text-slate-500">{mine ? t("broker.you") : t("broker.otherParty")} · {formatDate(o.createdAt, locale)}</p>
                      {o.terms && <p className="mt-1">{o.terms}</p>}
                      {!mine && o.status === "RELAYED" && !closed && (
                        <ActionForm action={C.respondOfferAction} compact hidden={{ enquiryId: v.id, offerId: o.id }} className="mt-2">
                          <SubmitButton label={t("broker.accept")} className="btn-teal btn-sm" name="decision" value="ACCEPT" />
                          <SubmitButton label={t("broker.reject")} className="btn-secondary btn-sm" name="decision" value="REJECT" />
                        </ActionForm>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {!closed && (
              <ActionForm action={C.submitOfferAction} submitLabel={t("broker.makeOffer")} hidden={{ enquiryId: v.id }} resetOnSuccess className="mt-4">
                <div className="grid grid-cols-[1fr_100px] gap-2">
                  <F name="amount" label={t("broker.amount")} required />
                  <F name="currency" type="select" label={t("broker.currency")} options={[["VND", "VND"], ["USD", "USD"]]} defaultValue="VND" required />
                </div>
                <F name="terms" type="textarea" label={t("broker.terms")} rows={2} />
              </ActionForm>
            )}
          </Section>

          <Section title={t("broker.inspections")}>
            <p className="mb-2 text-xs text-slate-500">{t("broker.inspectionNote")}</p>
            {v.inspections.length === 0 ? (
              <p className="text-sm text-slate-500">{t("broker.noInspections")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {v.inspections.map((i) => (
                  <li key={i.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="font-medium">{t(`enums.InspectionType.${i.type}`)} · {formatDateTime(i.scheduledAt, locale)}</p>
                    <p className="text-xs">{t(`enums.InspectionOutcome.${i.outcome}`)}</p>
                    <p className="text-xs text-slate-600">{t("broker.location")}: {i.location ?? t("broker.locationHidden")}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t("broker.introduction")}>
            {v.introduction ? (
              <StatusPill status={v.introduction.status === "COMPLETED" ? "APPROVED" : v.introduction.status === "PENDING_REVIEW" ? "PENDING" : v.introduction.status} label={t(`enums.IntroductionStatus.${v.introduction.status}`)} />
            ) : (
              <p className="text-sm text-slate-500">{t("broker.introNone")}</p>
            )}
          </Section>

          {v.transaction && (
            <Section title={t("broker.transaction")}>
              <p className="font-mono text-xs text-slate-500">{v.transaction.reference}</p>
              <p className="mt-1"><StatusPill status={v.transaction.status} label={t(`enums.TransactionStatus.${v.transaction.status}`)} /></p>
              {"commissionStatus" in v.transaction && v.transaction.commissionStatus && (
                <p className="mt-2 text-sm">
                  {t("broker.commission")}: {v.transaction.commissionAmount !== null && v.transaction.commissionAmount !== undefined ? money(v.transaction.commissionAmount, v.transaction.currency ?? "VND") : "—"} · {t(`enums.CommissionStatus.${v.transaction.commissionStatus}`)}
                </p>
              )}
            </Section>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500">{t("common.noPayments")}</p>
    </div>
  );
}
