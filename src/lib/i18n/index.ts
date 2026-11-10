import vi, { type Dictionary } from "./vi";
import en from "./en";

export type Locale = "vi" | "en";
export const LOCALES: Locale[] = ["vi", "en"];
export const DEFAULT_LOCALE: Locale = "vi";
export const dictionaries: Record<Locale, Dictionary> = { vi, en };

export const isLocale = (v: unknown): v is Locale => v === "vi" || v === "en";

function lookup(dict: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), dict);
}

export type T = ((key: string, params?: Record<string, string | number>) => string) & {
  list: (key: string) => string[];
  raw: <R = unknown>(key: string) => R;
  locale: Locale;
};

export function makeT(locale: Locale): T {
  const dict = dictionaries[locale];
  const t = ((key: string, params?: Record<string, string | number>) => {
    let v = lookup(dict, key);
    if (typeof v !== "string") v = lookup(dictionaries[DEFAULT_LOCALE], key);
    if (typeof v !== "string") return key;
    return params ? v.replace(/\{(\w+)\}/g, (_, p) => (p in params ? String(params[p]) : `{${p}}`)) : v;
  }) as T;
  t.list = (key) => {
    const v = lookup(dict, key);
    return Array.isArray(v) ? (v as string[]) : [];
  };
  t.raw = <R,>(key: string) => lookup(dict, key) as R;
  t.locale = locale;
  return t;
}

/** Translate an i18n key coming from a service error, or pass through a plain message. */
export function tMessage(t: T, msg: string) {
  return /^[a-zA-Z]+\.[\w.]+$/.test(msg) ? t(msg) : msg;
}

/** Picks the localized name of a catalogue row ({nameVi, nameEn}). */
export function lname(row: { nameVi: string; nameEn: string } | null | undefined, locale: Locale) {
  if (!row) return "—";
  return locale === "en" ? row.nameEn : row.nameVi;
}
