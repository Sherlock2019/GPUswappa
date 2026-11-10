import { z } from "zod";
import { AppError } from "./errors";
import { parseVnd } from "./format";

/** Error messages are i18n keys (validation.*). */
const req = "validation.required";

export const str = (max = 200) => z.string().trim().max(max, "validation.tooLong");
export const reqStr = (max = 200, min = 1) => z.string({ required_error: req }).trim().min(min, min > 1 ? "validation.tooShort" : req).max(max, "validation.tooLong");
export const optStr = (max = 2000) =>
  z.string().trim().max(max, "validation.tooLong").optional().transform((v) => (v ? v : null));
export const email = z.string({ required_error: req }).trim().toLowerCase().email("validation.email").max(200);
export const enumOf = <const T extends [string, ...string[]]>(vals: T) => z.enum(vals, { errorMap: () => ({ message: "validation.choose" }) });
export const optEnum = <const T extends [string, ...string[]]>(vals: T) =>
  z.union([z.enum(vals), z.literal("")]).optional().transform((v) => (v ? (v as T[number]) : null));
export const vnd = z.string().optional().transform((v, ctx) => {
  if (!v || !v.trim()) return null;
  const p = parseVnd(v);
  if (p === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "validation.amount" });
    return z.NEVER;
  }
  return p;
});
export const intIn = (min: number, max: number) =>
  z.coerce.number({ invalid_type_error: "validation.number" }).int("validation.number").min(min, "validation.range").max(max, "validation.range");
export const checkbox = z.union([z.literal("on"), z.literal("true"), z.literal(""), z.undefined(), z.null()]).transform((v) => v === "on" || v === "true");

export const password = z
  .string({ required_error: req })
  .min(10, "validation.passwordLength")
  .max(200, "validation.tooLong")
  .regex(/[A-Za-z]/, "validation.passwordMix")
  .regex(/\d/, "validation.passwordMix");

export function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const r = schema.safeParse(input);
  if (!r.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of r.error.issues) {
      const k = issue.path.join(".") || "_";
      if (!fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    throw new AppError("VALIDATION", "errors.validation", fieldErrors);
  }
  return r.data;
}

/** FormData → plain object (last value wins; files excluded). */
export function formToObject(fd: FormData): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") o[k] = v;
  return o;
}
