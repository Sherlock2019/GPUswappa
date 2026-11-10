import Link from "next/link";
import type { Metadata } from "next";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { lname } from "@/lib/i18n";
import { publicRequests } from "@/lib/services/marketplace";
import { getActiveCatalog } from "@/lib/services/admin";
import { formatDate, formatVnd } from "@/lib/format";
import { EmptyState, PageHeader, Pill } from "@/components/ui";
import { ActionForm, F } from "@/components/forms";
import { createRequestAction } from "@/app/actions/market";
import { isStaff } from "@/lib/rbac";

export const metadata: Metadata = { title: "GPU requests" };

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ condition?: string }> }) {
  const [{ condition }, t, locale, actor, rows, catalog] = await Promise.all([searchParams, getT(), getLocale(), getActor(), publicRequests(), getActiveCatalog()]);
  const opt = (k: string, vals: string[]) => vals.map((v) => [v, t(`enums.${k}.${v}`)] as [string, string]);
  return (
    <>
      <PageHeader title={t("requests.title")} subtitle={t("requests.subtitle")} />
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_440px]">
        <section aria-labelledby="board">
          <h2 id="board" className="text-xl font-bold">{t("requests.boardTitle")}</h2>
          <p className="mb-4 text-sm text-slate-600">{t("requests.boardNote")}</p>
          {rows.length === 0 ? (
            <EmptyState title={t("requests.boardEmpty")} />
          ) : (
            <ul className="space-y-3">
              {rows.map((r) => (
                <li key={r.id} className="card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {r.category && <Pill tone="blue">{lname(r.category, locale)}</Pill>}
                    {r.gpuModelName && <Pill>{r.gpuModelName}</Pill>}
                    <Pill tone="teal">{t(`enums.ConditionPref.${r.conditionPreference}`)}</Pill>
                  </div>
                  <p className="mt-2 font-semibold">{r.desiredEquipment}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {t("listing.gpus", { count: r.quantity })} · 📍 {lname(r.location, locale)} · {r.budgetMinVnd !== null || r.budgetMaxVnd !== null ? `${formatVnd(r.budgetMinVnd, locale)} – ${formatVnd(r.budgetMaxVnd, locale)}` : t("requests.budgetHidden")}
                    {r.desiredDeliveryDate && ` · ${t("requests.deliveryDate")}: ${formatDate(r.desiredDeliveryDate, locale)}`}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(r.createdAt, locale)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section id="new" className="card h-fit p-5" aria-labelledby="newreq">
          <h2 id="newreq" className="text-xl font-bold">{t("requests.newTitle")}</h2>
          {!actor ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm">{t("requests.signIn")}</p>
              <Link href="/auth/login?next=/requests%23new" className="btn-primary">{t("common.signIn")}</Link>
            </div>
          ) : isStaff(actor) ? null : (
            <ActionForm action={createRequestAction} submitLabel={t("common.submit")} resetOnSuccess className="mt-4">
              <F name="desiredEquipment" label={t("requests.desiredEquipment")} help={t("requests.desiredEquipmentHelp")} required />
              <div className="grid grid-cols-2 gap-3">
                <F name="categoryId" type="select" label={t("listing.category")} options={catalog.categories.map((c) => [c.id, lname(c, locale)])} />
                <F name="gpuModelId" type="select" label={t("listing.gpuModel")} options={catalog.models.map((m) => [m.id, m.name])} />
                <F name="quantity" type="number" label={t("requests.quantity")} defaultValue={8} min={1} required />
                <F name="locationId" type="select" label={t("requests.preferredLocation")} options={catalog.locations.map((l) => [l.id, lname(l, locale)])} />
              </div>
              <F name="conditionPreference" type="select" label={t("requests.conditionPreference")} options={opt("ConditionPref", ["ANY", "NEW", "USED", "NEW_OR_UNUSED"])} defaultValue={condition ?? "ANY"} required />
              <div className="grid grid-cols-2 gap-3">
                <F name="budgetMinVnd" label={t("requests.budgetMin")} />
                <F name="budgetMaxVnd" label={t("requests.budgetMax")} />
              </div>
              <F name="hideBudget" type="checkbox" label={t("requests.hideBudget")} defaultChecked />
              <F name="desiredDeliveryDate" type="date" label={t("requests.deliveryDate")} />
              <F name="requirements" type="textarea" label={t("requests.requirements")} rows={3} />
              <div className="grid grid-cols-2 gap-3">
                <F name="contactPreference" type="select" label={t("requests.contactPreference")} options={opt("ContactPref", ["PLATFORM", "EMAIL", "PHONE"])} defaultValue="PLATFORM" required />
                <F name="visibility" type="select" label={t("requests.visibility")} options={opt("Visibility", ["PRIVATE", "PUBLIC"])} defaultValue="PRIVATE" required />
              </div>
            </ActionForm>
          )}
        </section>
      </div>
    </>
  );
}
