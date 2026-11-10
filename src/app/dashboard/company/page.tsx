import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { lname } from "@/lib/i18n";
import { getMyCompany, COMPANY_TYPES } from "@/lib/services/companies";
import { getActiveCatalog } from "@/lib/services/admin";
import { formatDate } from "@/lib/format";
import { Alert, Section, StatusPill } from "@/components/ui";
import { ActionForm, F } from "@/components/forms";
import { saveCompanyAction, uploadCompanyDocAction, deleteDocAction } from "@/app/actions/account";

export default async function CompanyPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const actor = (await getActor())!;
  const [{ next }, t, locale, company, catalog] = await Promise.all([searchParams, getT(), getLocale(), getMyCompany(actor), getActiveCatalog()]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("dash.company")}</h1>
      {company && (
        <Alert>
          {t("dash.privacyNote", { alias: company.alias })}{" "}
          <span className="ml-2">{t("dash.verification")}: <StatusPill status={company.verificationStatus} label={t(`enums.CompanyVerification.${company.verificationStatus}`)} /></span>
          {company.verificationNote && <span className="mt-1 block text-sm">{company.verificationNote}</span>}
        </Alert>
      )}
      <Section>
        <ActionForm action={saveCompanyAction} submitLabel={t("common.save")} hidden={{ next: next ?? "" }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <F name="legalName" label={t("dash.legalName")} defaultValue={company?.legalName} required />
            <F name="displayName" label={t("dash.displayName")} defaultValue={company?.displayName} required />
            <F name="registrationNumber" label={t("dash.registrationNumber")} defaultValue={company?.registrationNumber} required />
            <F name="companyType" type="select" label={t("dash.companyType")} options={COMPANY_TYPES.map((c) => [c, t(`enums.CompanyType.${c}`)])} defaultValue={company?.companyType} required />
            <F name="address" label={t("dash.address")} defaultValue={company?.address} required className="sm:col-span-2" />
            <F name="locationId" type="select" label={t("dash.city")} options={catalog.locations.map((l) => [l.id, lname(l, locale)])} defaultValue={company?.locationId} required />
            <F name="website" type="url" label={t("dash.website")} defaultValue={company?.website} placeholder="https://" />
            <F name="contactName" label={t("dash.contactName")} defaultValue={company?.contactName} />
            <F name="contactEmail" type="email" label={t("dash.contactEmail")} defaultValue={company?.contactEmail} />
            <F name="contactPhone" type="tel" label={t("dash.contactPhone")} defaultValue={company?.contactPhone} />
          </div>
          <F name="foreignInvested" type="checkbox" label={t("dash.foreignInvested")} help={t("dash.foreignNote")} defaultChecked={company?.foreignInvested} />
        </ActionForm>
      </Section>
      {company && (
        <Section title={t("dash.companyDocs")}>
          {company.documents.length > 0 && (
            <ul className="mb-4 divide-y divide-slate-100 text-sm">
              {company.documents.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <a href={`/api/files/doc/${d.id}`} className="text-electric-600 underline">{d.originalFilename}</a> · {t(`enums.DocumentType.${d.type}`)} · {formatDate(d.uploadedAt, locale)}
                  </span>
                  <span className="flex items-center gap-2">
                    <StatusPill status={d.reviewStatus} label={t(`enums.DocReviewStatus.${d.reviewStatus}`)} />
                    <ActionForm action={deleteDocAction} compact hidden={{ id: d.id }} confirm={t("common.delete") + "?"}>
                      <button className="btn-ghost btn-sm text-red-700">{t("common.delete")}</button>
                    </ActionForm>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <ActionForm action={uploadCompanyDocAction} submitLabel={t("sell.upload")} hidden={{ companyId: company.id }} resetOnSuccess>
            <div className="grid gap-3 sm:grid-cols-2">
              <F name="type" type="select" label={t("sell.docType")} options={["COMPANY_REGISTRATION", "SELLER_AUTHORIZATION", "OTHER"].map((x) => [x, t(`enums.DocumentType.${x}`)])} required />
              <F name="file" type="file" label={t("sell.file")} accept="application/pdf,image/jpeg,image/png" required />
            </div>
            <p className="help">{t("sell.docsHelp", { mb: process.env.MAX_UPLOAD_MB ?? "10" })}</p>
          </ActionForm>
        </Section>
      )}
    </div>
  );
}
