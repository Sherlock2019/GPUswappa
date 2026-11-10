import Link from "next/link";
import type { T } from "@/lib/i18n";
import type { Settings } from "@/lib/settings";

export function SiteFooter({ t, settings }: { t: T; settings: Settings }) {
  const np = t("common.notProvided");
  const cols: [string, [string, string][]][] = [
    [t("footer.marketplace"), [["/marketplace", t("nav.marketplace")], ["/new-gpus", t("nav.newMarket")], ["/sell", t("nav.sell")], ["/requests", t("nav.requests")], ["/swap", t("nav.swap")], ["/services", t("nav.services")]]],
    [t("footer.company"), [["/about", t("nav.about")], ["/why", t("nav.why")], ["/how-it-works", t("nav.howItWorks")], ["/trust", t("nav.trust")], ["/contact", t("nav.contact")], ["/credits", t("footer.credits")]]],
    [
      t("footer.legal"),
      [
        ["/legal/terms", t("footer.terms")],
        ["/legal/marketplace-rules", t("footer.rules")],
        ["/legal/privacy", t("footer.privacy")],
        ["/legal/brokerage-terms", t("footer.brokerage")],
        ["/legal/buyer-intro-terms", t("footer.buyerTerms")],
        ["/legal", t("legal.pages")],
      ],
    ],
  ];
  return (
    <footer className="mt-16 border-t border-navy-800 bg-navy-950 text-slate-300">
      <div className="container-page grid gap-8 py-12 md:grid-cols-4">
        <div>
          <p className="text-lg font-bold text-white">{t("common.brand")}</p>
          <p className="text-xs uppercase tracking-wider text-teal-400">{t("common.operatorRole")}</p>
          <p className="mt-3 text-sm">{t("footer.about")}</p>
        </div>
        {cols.map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <p className="mb-3 text-sm font-semibold text-white">{title}</p>
            <ul className="space-y-2 text-sm">
              {links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-navy-800">
        <div className="container-page grid gap-4 py-6 text-xs text-slate-400 md:grid-cols-2">
          <div>
            <p className="font-semibold text-slate-300">{t("footer.registration")}</p>
            <p>
              {t("footer.operator")}: {settings["site.operatorLegalName"] || np}
            </p>
            <p>
              {t("footer.regNumber")}: {settings["site.businessRegistrationNumber"] || np}
            </p>
            <p>
              {t("footer.ecommerce")}: {settings["site.ecommerceRegistration"] || np}
            </p>
          </div>
          <div className="space-y-2">
            <p>{t("common.legalNotice")}</p>
            <p>{t("common.noPayments")}</p>
            <p>{t("footer.trademarks")}</p>
            <p className="italic">{t("common.translationNote")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
