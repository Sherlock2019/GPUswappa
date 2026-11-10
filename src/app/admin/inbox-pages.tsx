import type { ReactNode } from "react";
import type { T } from "@/lib/i18n";
import { ActionForm, F } from "@/components/forms";

/** Shared status-update form for inbox-type records (requests, swaps, contacts, partners). */
export function StatusForm({ action, id, statuses, enumKey, current, notes, t }: { action: (p: never, fd: FormData) => Promise<unknown>; id: string; statuses: string[]; enumKey: string; current: string; notes: string | null; t: T }) {
  return (
    <details>
      <summary className="cursor-pointer text-xs text-electric-600">{t("admin.update")}</summary>
      <ActionForm action={action as never} submitLabel={t("admin.update")} submitClass="btn-primary btn-sm" hidden={{ id }} className="mt-2 w-64">
        <F name="status" type="select" label={t("common.status")} options={statuses.map((s) => [s, t(`enums.${enumKey}.${s}`)])} defaultValue={current} required />
        <F name="adminNotes" type="textarea" label={t("admin.adminNotes")} defaultValue={notes} rows={2} />
      </ActionForm>
    </details>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-2xl font-bold">{children}</h1>;
}
