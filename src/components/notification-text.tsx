import Link from "next/link";
import type { T } from "@/lib/i18n";

/** Renders a stored notification (i18n key + JSON params) in the viewer's language. */
export function NotificationText({ t, n }: { t: T; n: { title: string; body: string; link: string | null; readAt: Date | null } }) {
  let params: Record<string, string> = {};
  try {
    params = JSON.parse(n.body);
  } catch {
    /* plain text */
  }
  // Translate enum-like status params where possible
  for (const k of ["status", "outcome", "decision"]) {
    if (params[k]) {
      for (const e of ["PublicationStatus", "EnquiryStatus", "IntroductionStatus", "SwapStatus", "RequestStatus", "CompanyVerification", "ReviewOutcome"]) {
        const v = t(`enums.${e}.${params[k]}`);
        if (!v.startsWith("enums.")) {
          params[k] = v;
          break;
        }
      }
    }
  }
  const text = t(n.title, params);
  const cls = n.readAt ? "text-slate-600" : "font-semibold text-navy-900";
  return n.link ? (
    <Link href={n.link} className={`${cls} hover:text-electric-600`}>{text}</Link>
  ) : (
    <span className={cls}>{text}</span>
  );
}
