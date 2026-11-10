import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { DEFAULT_LOCALE, isLocale, makeT, type Locale } from "./index";

export const getLocale = cache(async (): Promise<Locale> => {
  const v = (await cookies()).get("locale")?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
});

export async function getT() {
  return makeT(await getLocale());
}
