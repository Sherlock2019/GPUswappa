import type { T, Locale } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format";

type Msg = { id: string; body: string; mine: boolean; fromBroker: boolean; createdAt: Date; channel: string; flagged?: boolean; relayOfId?: string | null; author?: string; approvedBy?: string | null };

/** Chat-style message list. Party views never show the other party's name — only "You" / "Broker" / "Other party". */
export function MessageList({ messages, t, locale, staffView = false }: { messages: Msg[]; t: T; locale: Locale; staffView?: boolean }) {
  if (!messages.length) return <p className="text-sm text-slate-500">{t("broker.noMessages")}</p>;
  return (
    <ul className="space-y-2" aria-live="polite">
      {messages.map((m) => (
        <li key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.mine ? "bg-electric-600 text-white" : m.fromBroker ? "bg-teal-100 text-navy-900" : "bg-slate-100 text-navy-900"}`}>
            <p className={`text-[11px] ${m.mine ? "text-electric-100" : "text-slate-500"}`}>
              {staffView ? `${m.author ?? ""}` : m.mine ? t("broker.you") : m.fromBroker ? t("broker.brokerLabel") : t("broker.otherParty")}
              {" · "}
              {formatDateTime(m.createdAt, locale)}
              {staffView && m.relayOfId && ` · ${t("broker.relayed")}${m.approvedBy ? ` · ${t("broker.approvedBy", { name: m.approvedBy })}` : ""}`}
            </p>
            <p className="whitespace-pre-line">{m.body}</p>
            {staffView && m.flagged && <p className="mt-1 text-[11px] font-semibold text-amber-700">⚠ {t("broker.flagged")}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
