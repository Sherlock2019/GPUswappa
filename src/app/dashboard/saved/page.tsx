import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { listSaved } from "@/lib/services/listings";
import { ListingCard } from "@/components/listing";
import { EmptyState } from "@/components/ui";

export default async function SavedPage() {
  const actor = (await getActor())!;
  const [t, locale, rows] = await Promise.all([getT(), getLocale(), listSaved(actor)]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("dash.saved")}</h1>
      {rows.length === 0 ? <EmptyState title={t("dash.noSaved")} /> : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{rows.map((l) => <ListingCard key={l.id} l={l} t={t} locale={locale} />)}</div>
      )}
    </div>
  );
}
