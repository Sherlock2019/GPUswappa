import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { can, isStaff, type Permission } from "@/lib/rbac";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [actor, t] = await Promise.all([getActor(), getT()]);
  if (!actor) redirect("/auth/login?next=/admin");
  if (!isStaff(actor)) redirect("/dashboard");
  const groups: [string, [string, string, Permission][]][] = [
    [t("admin.overview"), [["/admin", t("admin.overview"), "review:access"]]],
    [
      t("broker.console"),
      [
        ["/admin/cases", t("admin.cases"), "broker:handle"],
        ["/admin/introductions", t("admin.introductions"), "intro:request"],
        ["/admin/inspections", t("admin.inspections"), "broker:handle"],
        ["/admin/transactions", t("admin.transactions"), "broker:handle"],
      ],
    ],
    [
      t("admin.listings"),
      [
        ["/admin/listings", t("admin.listings"), "review:access"],
        ["/admin/documents", t("admin.documents"), "review:access"],
        ["/admin/companies", t("admin.companies"), "admin:companies"],
      ],
    ],
    [
      t("admin.agreements"),
      [
        ["/admin/fees", t("admin.fees"), "fees:manage"],
        ["/admin/agreements", t("admin.agreements"), "agreements:manage"],
      ],
    ],
    [
      t("admin.inbox"),
      [
        ["/admin/requests", t("admin.requests"), "admin:inbox"],
        ["/admin/swaps", t("admin.swaps"), "admin:inbox"],
        ["/admin/inbox", t("admin.inbox"), "admin:inbox"],
        ["/admin/partners", t("admin.partners"), "admin:inbox"],
      ],
    ],
    [
      t("admin.settings"),
      [
        ["/admin/users", t("admin.users"), "admin:users"],
        ["/admin/catalog", t("admin.catalog"), "admin:catalog"],
        ["/admin/content", t("admin.content"), "admin:content"],
        ["/admin/disclosure", t("admin.disclosure"), "admin:content"],
        ["/admin/audit", t("admin.audit"), "admin:audit"],
      ],
    ],
  ];
  return (
    <div className="mx-auto grid w-full max-w-[1500px] gap-6 px-4 py-6 lg:grid-cols-[230px_1fr] lg:px-6">
      <nav aria-label={t("admin.title")} className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-teal-600">{t(`enums.Role.${actor.role}`)} · {actor.name}</p>
        {groups.map(([g, links]) => {
          const visible = links.filter(([, , p]) => can(actor, p));
          if (!visible.length) return null;
          return (
            <div key={g} className="mb-4">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{g}</p>
              <ul className="flex flex-wrap gap-1 lg:flex-col">
                {visible.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="block rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-white hover:text-electric-600">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
