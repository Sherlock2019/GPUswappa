/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { lname } from "@/lib/i18n";
import { EDITABLE_STATUSES, getOwnListingForEdit, WIZARD_STEPS } from "@/lib/services/listings";
import { DOCUMENT_TYPE_VALUES } from "@/lib/services/files";
import { getActiveCatalog } from "@/lib/services/admin";
import { getSettings } from "@/lib/settings";
import { formatDate, formatDateTime, toNum } from "@/lib/format";
import { AppError } from "@/lib/errors";
import { Alert, Section, StatusPill, Pill } from "@/components/ui";
import { ActionForm, F, SubmitButton } from "@/components/forms";
import * as A from "@/app/actions/listings";

type P = { params: Promise<{ id: string }>; searchParams: Promise<{ step?: string }> };

export default async function ListingWizard({ params, searchParams }: P) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const actor = (await getActor())!;
  let data;
  try {
    data = await getOwnListingForEdit(actor, id);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  const { listing: l, missing } = data;
  const [t, locale, catalog, settings] = await Promise.all([getT(), getLocale(), getActiveCatalog(), getSettings()]);
  const step = Math.min(Math.max(Number(sp.step) || 1, 1), WIZARD_STEPS);
  const editable = EDITABLE_STATUSES.includes(l.publicationStatus);
  const steps = t.list("sell.steps");
  const opt = (k: string, vals: string[]) => vals.map((v) => [v, t(`enums.${k}.${v}`)] as [string, string]);
  const mb = process.env.MAX_UPLOAD_MB ?? "10";
  const agreement = l.agreements.find((a) => a.status === "ACTIVE" || a.status === "ACCEPTED");
  const awaiting = l.agreements.find((a) => a.status === "AWAITING_SELLER_REVIEW");
  const termsSource = awaiting ?? agreement;

  const stepForm = (fields: React.ReactNode) => (
    <ActionForm action={A.saveStepAction} hidden={{ listingId: l.id, step: String(step) }}>
      <fieldset disabled={!editable} className="space-y-4">{fields}</fieldset>
      {editable && (
        <div className="flex flex-wrap gap-2 pt-2">
          <SubmitButton label={t("sell.saveDraft")} className="btn-secondary" name="intent" value="save" />
          <SubmitButton label={t("sell.saveContinue")} name="intent" value="next" />
        </div>
      )}
    </ActionForm>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">{t("sell.stepOf", { step, total: WIZARD_STEPS })}</p>
          <h1 className="text-2xl font-bold">{l.title || t("dash.newListing")}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <StatusPill status={l.publicationStatus} label={t(`enums.PublicationStatus.${l.publicationStatus}`)} />
            {l.isDemo && <Pill tone="amber">{t("common.demoListing")}</Pill>}
          </p>
        </div>
        <Link href={`/listings/${l.id}`} className="btn-secondary btn-sm">{t("sell.previewPublic")}</Link>
      </div>

      {l.publicationStatus === "UNDER_REVIEW" && <Alert>{t("sell.underReview")}</Alert>}
      {l.publicationStatus === "ON_HOLD" && <Alert tone="warn">{t("sell.onHoldExplain")}</Alert>}
      {l.publicationStatus === "NEEDS_INFO" && <Alert tone="warn">{t("sell.needsInfoExplain")}</Alert>}
      {!editable && l.publicationStatus !== "UNDER_REVIEW" && l.publicationStatus !== "ON_HOLD" && <Alert>{t("sell.notEditable")}</Alert>}
      {awaiting && <Alert tone="warn">{t("agreements.awaiting")}</Alert>}

      {/* Step navigation */}
      <nav aria-label="Steps">
        <ol className="flex gap-1 overflow-x-auto pb-1">
          {steps.map((s, i) => {
            const n = i + 1;
            const hasMissing = missing.some((m) => m.step === n);
            return (
              <li key={s}>
                <Link
                  href={`?step=${n}`}
                  aria-current={n === step ? "step" : undefined}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${n === step ? "bg-navy-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-electric-500"}`}
                >
                  <span>{n}</span>
                  <span className="hidden md:inline">{s}</span>
                  {hasMissing && <span aria-label="missing" className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      <Section title={steps[step - 1]}>
        {step === 1 &&
          stepForm(
            <>
              <p className="text-sm">{t("sell.companyInfo")} <strong>{l.sellerCompany.displayName}</strong> ({l.sellerCompany.alias})</p>
              <p className="text-sm text-slate-600">{t("dash.privacyNote", { alias: l.sellerCompany.alias })}</p>
              <F name="contentLanguage" type="select" label={t("sell.contentLanguage")} help={t("sell.contentLanguageHelp")} options={[["vi", "Tiếng Việt"], ["en", "English"]]} defaultValue={l.contentLanguage} required />
            </>,
          )}
        {step === 2 &&
          stepForm(
            <>
              <F name="title" label={t("listing.title")} help={t("sell.titleHelp")} defaultValue={l.title} required />
              <div className="grid gap-4 sm:grid-cols-2">
                <F name="categoryId" type="select" label={t("listing.category")} options={catalog.categories.map((c) => [c.id, lname(c, locale)])} defaultValue={l.categoryId} required />
                <F name="manufacturer" type="select" label={t("listing.manufacturer")} options={opt("Manufacturer", ["NVIDIA", "AMD", "INTEL", "SERVER_MANUFACTURER", "OTHER"])} defaultValue={l.manufacturer} />
                <F name="gpuModelId" type="select" label={t("listing.gpuModel")} options={catalog.models.map((m) => [m.id, m.name])} defaultValue={l.gpuModelId} />
                <F name="gpuModelOther" label={t("listing.gpuModelOther")} defaultValue={l.gpuModelOther} />
                <F name="gpuQuantity" type="number" label={t("listing.gpuQuantity")} defaultValue={l.gpuQuantity || ""} min={0} />
                <F name="gpuMemory" label={t("listing.gpuMemory")} defaultValue={l.gpuMemory} />
              </div>
              <F name="description" type="textarea" label={t("listing.description")} defaultValue={l.description} rows={6} required />
            </>,
          )}
        {step === 3 &&
          stepForm(
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {(["serverManufacturer", "serverModel", "cpu", "systemRam", "storage", "networking", "powerRequirements", "coolingRequirements"] as const).map((f) => (
                  <F key={f} name={f} label={t(`listing.${f}`)} defaultValue={l[f]} />
                ))}
              </div>
              <F name="serialNumbers" type="textarea" label={t("admin.serials")} help={t("sell.serialHelp")} defaultValue={l.serialNumbers} rows={2} />
            </>,
          )}
        {step === 4 &&
          stepForm(
            <>
              <F name="condition" type="radio" label={t("sell.qCondition")} options={opt("Condition", ["NEW", "UNUSED", "USED", "REFURBISHED"])} defaultValue={l.condition} required />
              <F name="hasKnownFaults" type="radio" label={t("sell.qFaults")} options={opt("TriState", ["NO", "YES", "UNKNOWN"])} defaultValue={l.hasKnownFaults} required />
              <F name="knownDefects" type="textarea" label={t("listing.knownDefects")} defaultValue={l.knownDefects} rows={3} />
              <div className="grid gap-4 sm:grid-cols-2">
                <F name="usageDetails" label={t("listing.usageDetails")} defaultValue={l.usageDetails} />
                <F name="equipmentAge" label={t("listing.equipmentAge")} defaultValue={l.equipmentAge} />
              </div>
              <F name="warrantyStatus" type="select" label={t("listing.warrantyStatus")} options={opt("WarrantyStatus", ["MANUFACTURER", "SELLER", "NONE", "UNKNOWN"])} defaultValue={l.warrantyStatus} required />
              <F name="warrantyDetails" type="textarea" label={t("listing.warrantyDetails")} defaultValue={l.warrantyDetails} rows={2} />
              <p className="text-sm text-slate-600">{t("sell.unknownNote")}</p>
            </>,
          )}
        {step === 5 &&
          stepForm(
            <>
              <F name="inVietnam" type="radio" label={t("sell.qInVietnam")} options={opt("TriState", ["YES", "NO", "UNKNOWN"])} defaultValue={l.inVietnam} required />
              <F name="locationId" type="select" label={t("listing.location")} options={catalog.locations.map((x) => [x.id, lname(x, locale)])} defaultValue={l.locationId} required />
              <F name="transactionType" type="radio" label={t("sell.qTransaction")} options={opt("TransactionType", ["SALE", "SWAP", "SALE_OR_SWAP"])} defaultValue={l.transactionType} required />
              <F name="deliveryOptions" type="textarea" label={t("listing.deliveryOptions")} defaultValue={l.deliveryOptions} rows={2} />
              <F name="installationOptions" type="textarea" label={t("listing.installationOptions")} defaultValue={l.installationOptions} rows={2} />
            </>,
          )}
        {step === 6 &&
          stepForm(
            <>
              <F name="ownership" type="radio" label={t("sell.qOwnership")} options={opt("OwnershipAnswer", ["OWNS", "AUTHORIZED", "NO", "UNKNOWN"])} defaultValue={l.ownership} required />
              <F name="encumbrance" type="radio" label={t("sell.qEncumbrance")} options={opt("Encumbrance", ["NONE", "LEASED", "FINANCED", "OTHER_RIGHTS", "UNKNOWN"])} defaultValue={l.encumbrance} required />
              <F name="customsStatus" type="radio" label={t("sell.qCustoms")} options={opt("CustomsStatus", ["CLEARED_DOMESTIC", "OTHER_KNOWN", "UNKNOWN"])} defaultValue={l.customsStatus} required />
              <F name="customsNotes" type="textarea" label={t("admin.customsNotes")} help={t("sell.serialHelp")} defaultValue={l.customsNotes} rows={3} />
              <Alert>
                <p>{t("sell.unknownNote")}</p>
                <p className="mt-1">{t("sell.invoiceNote")}</p>
              </Alert>
            </>,
          )}
        {step === 7 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{t("sell.docsHelp", { mb })}</p>
            {l.documents.length > 0 && (
              <ul className="divide-y divide-slate-100 text-sm">
                {l.documents.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span><a href={`/api/files/doc/${d.id}`} className="text-electric-600 underline">{d.originalFilename}</a> · {t(`enums.DocumentType.${d.type}`)}</span>
                    <span className="flex items-center gap-2">
                      <StatusPill status={d.reviewStatus} label={t(`enums.DocReviewStatus.${d.reviewStatus}`)} />
                      {editable && (
                        <ActionForm action={A.deleteListingDocAction} compact hidden={{ id: d.id, listingId: l.id }}>
                          <button className="btn-ghost btn-sm text-red-700">{t("common.delete")}</button>
                        </ActionForm>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {editable && (
              <ActionForm action={A.uploadListingDocAction} submitLabel={t("sell.upload")} hidden={{ listingId: l.id }} resetOnSuccess>
                <div className="grid gap-3 sm:grid-cols-2">
                  <F name="type" type="select" label={t("sell.docType")} options={DOCUMENT_TYPE_VALUES.map((x) => [x, t(`enums.DocumentType.${x}`)])} required />
                  <F name="file" type="file" label={t("sell.file")} accept="application/pdf,image/jpeg,image/png" required />
                </div>
              </ActionForm>
            )}
            <p className="text-sm text-slate-600">{t("sell.invoiceNote")}</p>
            <Link href={`?step=8`} className="btn-secondary">{t("common.next")} →</Link>
          </div>
        )}
        {step === 8 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{t("sell.photosHelp", { mb })}</p>
            {l.images.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {l.images.map((img) => (
                  <li key={img.id} className="card overflow-hidden">
                    <img src={`/api/files/image/${img.id}`} alt={img.altText} className="h-28 w-full object-cover" />
                    <div className="flex items-center justify-between gap-1 p-2">
                      <StatusPill status={img.approvalStatus} label={t(`enums.ImageApproval.${img.approvalStatus}`)} />
                      {editable && (
                        <ActionForm action={A.deleteImageAction} compact hidden={{ id: img.id, listingId: l.id }}>
                          <button className="btn-ghost btn-sm text-red-700" aria-label={t("common.delete")}>✕</button>
                        </ActionForm>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {editable && (
              <ActionForm action={A.uploadImageAction} submitLabel={t("sell.upload")} hidden={{ listingId: l.id }} resetOnSuccess>
                <div className="grid gap-3 sm:grid-cols-2">
                  <F name="file" type="file" label={t("sell.file")} accept="image/jpeg,image/png,image/webp" required />
                  <F name="altText" label={t("sell.altText")} />
                </div>
              </ActionForm>
            )}
            <Link href={`?step=9`} className="btn-secondary">{t("common.next")} →</Link>
          </div>
        )}
        {step === 9 &&
          stepForm(
            <>
              <F name="priceVnd" label={t("listing.priceVnd")} help={t("sell.priceHelp")} defaultValue={toNum(l.priceVnd)?.toString()} />
              <F name="priceOnRequest" type="checkbox" label={t("listing.priceOnRequest")} defaultChecked={l.priceOnRequest} />
            </>,
          )}
        {step === 10 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold">{t("sell.missingTitle")}</h3>
              {missing.length === 0 ? (
                <p className="mt-1 text-sm text-emerald-700">{t("sell.missingNone")}</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {missing.map((m) => (
                    <li key={m.field}>
                      <Link href={`?step=${m.step}`} className="text-amber-800 underline">{t(`missing.${m.field}`)}</Link> <span className="text-slate-400">({t("sell.stepOf", { step: m.step, total: WIZARD_STEPS })})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Listing & brokerage terms */}
            <div className="rounded-xl border border-electric-400/40 bg-electric-100/30 p-4">
              <h3 className="font-semibold">{t("agreements.acceptTitle")}</h3>
              <p className="mt-2 text-sm">{t("agreements.acceptText")}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                <li>{t("agreements.summaryFee", { fee: String(termsSource?.listingFeeUsdEquivalent ?? settings["fees.listingMonthlyUsdEquivalent"]) })}</li>
                <li>{t("agreements.summaryCommission", { pct: String(termsSource?.standardCommissionPct ?? settings["fees.standardCommissionPct"]) })}</li>
                {termsSource?.negotiatedCommissionPct && <li>{t("agreements.summaryNegotiated", { pct: String(termsSource.negotiatedCommissionPct) })}</li>}
                <li>{t("agreements.summaryTrigger", { trigger: t(`enums.FeeTrigger.${termsSource?.feeTrigger ?? "SALE_AGREEMENT_SIGNED"}`), days: String(termsSource?.paymentDeadlineDays ?? settings["fees.paymentDeadlineDays"]) })}</li>
                <li>{t("agreements.summaryCredit", { credit: termsSource?.listingFeeCredit ? t("common.yes") : t("common.no") })}</li>
                <li>{t("agreements.summaryNoGuarantee")}</li>
              </ul>
              <p className="mt-2 text-xs text-slate-600">{t("fees.currencyNote")}</p>
              <p className="mt-1 text-xs text-amber-800">{t("agreements.draftNote")}</p>
              <p className="mt-1 text-xs"><Link href="/legal/brokerage-terms" className="text-electric-600 underline">{t("footer.brokerage")}</Link></p>
              {agreement && !awaiting ? (
                <p className="mt-3 text-sm font-medium text-emerald-700">✓ {t("agreements.accepted", { version: agreement.documentVersion, date: formatDateTime(agreement.acceptedAt, locale) })} ({agreement.reference})</p>
              ) : (
                <ActionForm action={A.acceptTermsAction} submitLabel={t("agreements.acceptButton")} hidden={{ listingId: l.id }} className="mt-3">
                  <F name="representative" label={t("agreements.representative")} defaultValue={actor.name} required />
                  <F name="existingBuyerDeclaration" type="textarea" label={t("agreements.existingBuyers")} help={t("agreements.existingBuyersHelp")} rows={2} />
                  <F name="acceptTerms" type="checkbox" label={t("agreements.accept", { version: termsSource?.documentVersion ?? settings["terms.brokerageVersion"] })} />
                </ActionForm>
              )}
            </div>

            {editable && (
              <ActionForm action={A.submitListingAction} submitLabel={t("sell.submitReview")} hidden={{ listingId: l.id }} />
            )}
          </div>
        )}
      </Section>

      {/* Review messages */}
      {(l.messages.length > 0 || l.publicationStatus !== "DRAFT") && (
        <Section title={t("sell.reviewMessages")}>
          <ul className="space-y-2">
            {l.messages.map((m) => (
              <li key={m.id} className={`rounded-lg p-3 text-sm ${m.fromStaff ? "bg-electric-100/60" : "bg-slate-100"}`}>
                <p className="text-xs text-slate-500">{m.fromStaff ? t("enums.Role.REVIEWER") : t("broker.you")} · {formatDateTime(m.createdAt, locale)}</p>
                <p className="whitespace-pre-line">{m.body}</p>
              </li>
            ))}
          </ul>
          <ActionForm action={A.replyReviewAction} submitLabel={t("sell.reply")} hidden={{ listingId: l.id }} resetOnSuccess className="mt-3">
            <F name="body" type="textarea" label={t("sell.reply")} placeholder={t("sell.replyPlaceholder")} rows={3} />
          </ActionForm>
        </Section>
      )}

      {/* Listing fees */}
      {l.fees.length > 0 && (
        <Section title={t("fees.myFees")}>
          <p className="mb-2 text-xs text-slate-600">{t("fees.standard")} {t("fees.manualOnly")}</p>
          <table className="table">
            <thead><tr><th>{t("fees.period")}</th><th>{t("fees.usd")}</th><th>{t("fees.due")}</th><th>{t("common.status")}</th></tr></thead>
            <tbody>
              {l.fees.map((f) => (
                <tr key={f.id}>
                  <td>{formatDate(f.periodStart, locale)} – {formatDate(f.periodEnd, locale)}</td>
                  <td>US${f.usdEquivalent}</td>
                  <td>{formatDate(f.dueDate, locale)}</td>
                  <td><StatusPill status={f.status} label={t(`enums.ListingFeeStatus.${f.status}`)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {l.publicationStatus !== "ARCHIVED" && l.publicationStatus !== "DRAFT" && (
        <ActionForm action={A.archiveListingAction} compact hidden={{ listingId: l.id }} confirm={t("sell.archiveConfirm")}>
          <button className="btn-ghost btn-sm text-red-700">{t("sell.archive")}</button>
        </ActionForm>
      )}
    </div>
  );
}
