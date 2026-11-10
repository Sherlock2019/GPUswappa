import Link from "next/link";
import type { ReactNode } from "react";
import { PHOTOS, type PhotoKey } from "@/lib/photos";

/** Page title banner over a (credited, decorative) data-centre photo. */
export function PageHeader({ title, subtitle, actions, eyebrow, photo = "dcRacks" }: { title: string; subtitle?: string; actions?: ReactNode; eyebrow?: string; photo?: PhotoKey }) {
  const p = PHOTOS[photo];
  return (
    <div className="relative overflow-hidden bg-navy-950">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/90 to-navy-900/40" />
      <div className="grid-bg absolute inset-0 opacity-50" />
      <div className="container-page relative flex flex-col gap-5 py-12 md:flex-row md:items-end md:justify-between">
        <div>
          {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-400">{eyebrow}</p>}
          <h1 className="text-3xl font-bold leading-tight !text-white sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-3 max-w-3xl text-base text-slate-300 sm:text-lg">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <p className="absolute bottom-1 right-3 text-[10px] text-slate-500">
        {p.author} · {p.license}
      </p>
    </div>
  );
}

type Tone = "slate" | "blue" | "teal" | "amber" | "red" | "green" | "navy" | "purple";
const TONES: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-electric-100 text-electric-600 ring-electric-400/30",
  teal: "bg-teal-100 text-teal-600 ring-teal-400/30",
  amber: "bg-amber-50 text-amber-800 ring-amber-300/50",
  red: "bg-red-50 text-red-800 ring-red-300/50",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-300/50",
  navy: "bg-navy-800 text-white ring-navy-700",
  purple: "bg-violet-50 text-violet-800 ring-violet-300/50",
};

export function Pill({ children, tone = "slate", className = "" }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]} ${className}`}>{children}</span>;
}

const STATUS_TONE: Record<string, Tone> = {
  DRAFT: "slate",
  UNDER_REVIEW: "blue",
  NEEDS_INFO: "amber",
  ON_HOLD: "purple",
  PUBLISHED: "green",
  REJECTED: "red",
  ARCHIVED: "slate",
  PASSED: "green",
  FAILED: "red",
  NOT_APPLICABLE: "slate",
  IN_PROGRESS: "blue",
  NOT_STARTED: "slate",
  PENDING: "amber",
  VERIFIED: "green",
  ACCEPTED: "green",
  APPROVED: "green",
  NEW: "blue",
  OPEN: "blue",
  RESPONDED: "teal",
  CLOSED: "slate",
  RESOLVED: "green",
  SUBMITTED: "blue",
  FORWARDED: "teal",
  DECLINED: "red",
  MATCHED: "green",
  AVAILABLE: "green",
  AVAILABLE_THROUGH_PARTNER: "teal",
  COMING_SOON: "amber",
  CONTACT_US: "blue",
  ACTIVE: "green",
  SUSPENDED: "red",
  AUTHORIZED: "green",
  REVOKED: "red",
};

export function StatusPill({ status, label }: { status: string; label: string }) {
  return <Pill tone={STATUS_TONE[status] ?? "slate"}>{label}</Pill>;
}

export function Alert({ tone = "info", title, children }: { tone?: "info" | "warn" | "error" | "success"; title?: string; children: ReactNode }) {
  const cls = {
    info: "border-electric-400/40 bg-electric-100/60 text-navy-900",
    warn: "border-amber-300 bg-amber-50 text-amber-900",
    error: "border-red-300 bg-red-50 text-red-900",
    success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${cls}`}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <svg aria-hidden="true" width="48" height="48" viewBox="0 0 48 48" className="text-slate-300">
        <rect x="6" y="12" width="36" height="24" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M12 18h24M12 24h16M12 30h10" stroke="currentColor" strokeWidth="2" />
      </svg>
      <p className="font-semibold text-navy-900">{title}</p>
      {text && <p className="max-w-md text-sm text-slate-600">{text}</p>}
      {action}
    </div>
  );
}

export function Section({ title, children, actions, id }: { title?: string; children: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <section className="card p-5" aria-labelledby={id}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && (
            <h2 id={id} className="text-lg font-semibold">
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function DefList({ items }: { items: [string, ReactNode | null | undefined][] }) {
  const shown = items.filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (!shown.length) return null;
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {shown.map(([k, v]) => (
        <div key={k} className="border-b border-slate-100 pb-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{k}</dt>
          <dd className="mt-0.5 text-sm text-slate-900 whitespace-pre-line">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-electric-600 underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}

export function GpuPlaceholder({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div role="img" aria-label={label} className={`flex items-center justify-center bg-gradient-to-br from-navy-800 to-navy-950 ${className}`}>
      <svg viewBox="0 0 120 70" width="120" height="70" aria-hidden="true">
        <rect x="6" y="14" width="108" height="42" rx="4" fill="none" stroke="#5a8bff" strokeWidth="2" />
        <circle cx="36" cy="35" r="12" fill="none" stroke="#2dd4bf" strokeWidth="2" />
        <circle cx="76" cy="35" r="12" fill="none" stroke="#2dd4bf" strokeWidth="2" />
        <path d="M14 56v6M24 56v6M34 56v6M44 56v6M54 56v6" stroke="#5a8bff" strokeWidth="2" />
      </svg>
    </div>
  );
}
