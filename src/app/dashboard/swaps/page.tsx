import Link from "next/link";
import { getActor } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n/server";
import { listMySwaps } from "@/lib/services/marketplace";
import { formatDate, formatVnd } from "@/lib/format";
import { EmptyState, StatusPill } from "@/components/ui";

export default async function MySwaps() {
  const actor = (await getActor())!;
  const [t, locale, data] = await Promise.all([getT(), getLocale(), listMySwaps(actor)]);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("dash.swaps")}</h1>
        <Link href="/swap#form" className="btn-primary btn-sm">+ {t("swap.formTitle")}</Link>
      </div>
      <section className="space-y-2">
        <h2 className="font-semibold">{t("dash.swapsMine")}</h2>
        {data.mine.length === 0 ? <EmptyState title={t("dash.noSwaps")} /> : (
          <ul className="space-y-2">
            {data.mine.map((s) => (
              <li key={s.id} className="card flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <div>
                  <p className="font-semibold">{s.offeredEquipment} → {s.requestedEquipment}</p>
                  <p className="text-slate-600">{s.listing ? s.listing.title : "—"} · {t(`enums.CashDirection.${s.cashDirection}`)} {s.cashAdjustment ? formatVnd(s.cashAdjustment, locale) : ""} · {formatDate(s.createdAt, locale)}</p>
                </div>
                <StatusPill status={s.status} label={t(`enums.SwapStatus.${s.status}`)} />
              </li>
            ))}
          </ul>
        )}
      </section>
      {actor.role === "SELLER" && (
        <section className="space-y-2">
          <h2 className="font-semibold">{t("dash.swapsOnMine")}</h2>
          {data.onMyListings.length === 0 ? <EmptyState title={t("dash.noSwaps")} /> : (
            <ul className="space-y-2">
              {data.onMyListings.map((s) => (
                <li key={s.id} className="card p-4 text-sm">
                  <p className="font-semibold">{s.offeredEquipment} → {s.listing?.title}</p>
                  <p className="text-slate-600"><span className="font-mono">{s.proposerCompany?.alias ?? "VN-B-····"}</span> · {s.offeredDetails}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
