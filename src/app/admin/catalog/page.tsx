import { getActor } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { requirePermission } from "@/lib/rbac";
import { getCatalog } from "@/lib/services/admin";
import { Section } from "@/components/ui";
import { ActionForm, F } from "@/components/forms";
import { categoryAction, gpuModelAction, locationAction } from "@/app/actions/admin";

export default async function CatalogPage() {
  requirePermission(await getActor(), "admin:catalog");
  const [t, { categories, models, locations }] = await Promise.all([getT(), getCatalog()]);
  const MAN = ["NVIDIA", "AMD", "INTEL", "SERVER_MANUFACTURER", "OTHER"].map((m) => [m, t(`enums.Manufacturer.${m}`)] as [string, string]);
  const row = (children: React.ReactNode, action: typeof categoryAction, id?: string) => (
    <ActionForm action={action} hidden={{ id: id ?? "" }} submitLabel={id ? t("common.save") : t("common.submit")} submitClass="btn-secondary btn-sm" className="grid items-end gap-2 border-b border-slate-100 pb-3 sm:grid-cols-[repeat(5,minmax(0,1fr))_auto] [&>div]:space-y-0">
      {children}
    </ActionForm>
  );
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("admin.catalog")}</h1>
      <Section title={t("listing.category")}>
        <div className="space-y-3">
          {categories.map((c) => row(<>
            <F name="slug" label={t("admin.slug")} defaultValue={c.slug} required />
            <F name="nameVi" label={t("admin.nameVi")} defaultValue={c.nameVi} required />
            <F name="nameEn" label={t("admin.nameEn")} defaultValue={c.nameEn} required />
            <F name="sortOrder" type="number" label={t("admin.sortOrder")} defaultValue={c.sortOrder} required />
            <F name="active" type="checkbox" label={t("admin.active")} defaultChecked={c.active} />
          </>, categoryAction, c.id))}
          <p className="pt-2 text-sm font-semibold">{t("admin.newCategory")}</p>
          {row(<>
            <F name="slug" label={t("admin.slug")} required />
            <F name="nameVi" label={t("admin.nameVi")} required />
            <F name="nameEn" label={t("admin.nameEn")} required />
            <F name="sortOrder" type="number" label={t("admin.sortOrder")} defaultValue={categories.length} required />
            <F name="active" type="checkbox" label={t("admin.active")} defaultChecked />
          </>, categoryAction)}
        </div>
      </Section>
      <Section title={t("listing.gpuModel")}>
        <p className="mb-3 text-xs text-slate-500">{t("admin.exportFlag")} — {t("trust.sections.4.text")}</p>
        <div className="space-y-3">
          {[...models, null].map((m) => row(<>
            <F name="name" label={t("listing.gpuModel")} defaultValue={m?.name} required />
            <F name="manufacturer" type="select" label={t("listing.manufacturer")} options={MAN} defaultValue={m?.manufacturer} required />
            <F name="memoryGb" type="number" label={t("admin.memoryGb")} defaultValue={m?.memoryGb ?? ""} />
            <F name="sortOrder" type="number" label={t("admin.sortOrder")} defaultValue={m?.sortOrder ?? models.length} required />
            <div className="space-y-1">
              <F name="exportReviewFlag" type="checkbox" label={t("admin.exportFlag")} defaultChecked={m?.exportReviewFlag} />
              <F name="active" type="checkbox" label={t("admin.active")} defaultChecked={m?.active ?? true} />
            </div>
          </>, gpuModelAction, m?.id))}
        </div>
      </Section>
      <Section title={t("dash.city")}>
        <div className="space-y-3">
          {[...locations, null].map((l) => row(<>
            <F name="code" label={t("admin.slug")} defaultValue={l?.code} required />
            <F name="nameVi" label={t("admin.nameVi")} defaultValue={l?.nameVi} required />
            <F name="nameEn" label={t("admin.nameEn")} defaultValue={l?.nameEn} required />
            <F name="sortOrder" type="number" label={t("admin.sortOrder")} defaultValue={l?.sortOrder ?? locations.length} required />
            <F name="active" type="checkbox" label={t("admin.active")} defaultChecked={l?.active ?? true} />
          </>, locationAction, l?.id))}
        </div>
      </Section>
    </div>
  );
}
