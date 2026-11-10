import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="container-page py-24 text-center">
      <p className="text-6xl font-bold text-electric-600">404</p>
      <h1 className="mt-4 text-2xl font-bold">{t("errors.notFoundTitle")}</h1>
      <p className="mt-2 text-slate-600">{t("errors.notFoundText")}</p>
      <Link href="/" className="btn-primary mt-6">{t("nav.home")}</Link>
    </div>
  );
}
