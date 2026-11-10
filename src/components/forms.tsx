"use client";

import { createContext, useActionState, useContext, useEffect, useRef, useTransition, type ReactNode } from "react";
import type { ActionState } from "@/lib/actions-util";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;
const Ctx = createContext<{ fieldErrors?: Record<string, string>; pending: boolean }>({ pending: false });

/**
 * Form wrapper around a Server Action. Submits via a transition (form values are kept on
 * validation errors), shows translated messages and exposes field errors to <F/> fields.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  submitClass = "btn-primary",
  resetOnSuccess = false,
  compact = false,
  className = "",
  confirm,
  hidden,
}: {
  action: Action;
  children?: ReactNode;
  submitLabel?: string;
  submitClass?: string;
  resetOnSuccess?: boolean;
  compact?: boolean;
  className?: string;
  confirm?: string;
  hidden?: Record<string, string>;
}) {
  const [state, formAction] = useActionState(action, {} as ActionState);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
    if (state.message && !compact) msgRef.current?.focus();
  }, [state, resetOnSuccess, compact]);

  return (
    <Ctx.Provider value={{ fieldErrors: state.fieldErrors, pending }}>
      <form
        ref={ref}
        className={compact ? `inline-flex flex-wrap items-center gap-2 ${className}` : `space-y-4 ${className}`}
        onSubmit={(e) => {
          e.preventDefault();
          if (confirm && !window.confirm(confirm)) return;
          const fd = new FormData(e.currentTarget);
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          if (submitter?.name) fd.set(submitter.name, submitter.value);
          start(() => formAction(fd));
        }}
        noValidate
      >
        {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        {state.message && (
          <div
            ref={msgRef}
            tabIndex={-1}
            role={state.ok ? "status" : "alert"}
            className={
              compact
                ? `text-xs ${state.ok ? "text-emerald-700" : "text-red-700"}`
                : `rounded-lg border px-4 py-3 text-sm ${state.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900"}`
            }
          >
            <p>{state.message}</p>
            {!!state.details?.length && (
              <ul className="mt-1 list-disc pl-5">
                {state.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {children}
        {submitLabel && <SubmitButton label={submitLabel} className={submitClass + (compact ? " btn-sm" : "")} />}
      </form>
    </Ctx.Provider>
  );
}

export function SubmitButton({ label, className = "btn-primary", name, value }: { label: string; className?: string; name?: string; value?: string }) {
  const { pending } = useContext(Ctx);
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending} name={name} value={value}>
      {pending && <span aria-hidden="true" className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {label}
    </button>
  );
}

type Opt = [string, string];

/** Accessible form field: label, control, help text and server-side error. */
export function F({
  name,
  label,
  type = "text",
  help,
  defaultValue,
  options,
  required,
  placeholder,
  rows = 4,
  className = "",
  accept,
  defaultChecked,
  multiple,
  min,
  max,
  step,
}: {
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "number" | "date" | "datetime-local" | "textarea" | "select" | "checkbox" | "file" | "url" | "tel" | "radio";
  help?: string;
  defaultValue?: string | number | null;
  options?: Opt[];
  required?: boolean;
  placeholder?: string;
  rows?: number;
  className?: string;
  accept?: string;
  defaultChecked?: boolean;
  multiple?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
}) {
  const { fieldErrors } = useContext(Ctx);
  const err = fieldErrors?.[name];
  const id = `f-${name}`;
  const describedBy = [help ? `${id}-help` : null, err ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  const common = { id, name, "aria-invalid": err ? true : undefined, "aria-describedby": describedBy, required };
  const dv = defaultValue === null || defaultValue === undefined ? undefined : String(defaultValue);

  if (type === "checkbox") {
    return (
      <div className={className}>
        <label className="flex items-start gap-2 text-sm text-slate-800">
          <input type="checkbox" {...common} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 rounded border-slate-400 text-electric-600" />
          <span>{label}</span>
        </label>
        {help && <p id={`${id}-help`} className="help ml-6">{help}</p>}
        {err && <p id={`${id}-err`} className="ml-6 mt-1 text-xs font-medium text-red-700">{err}</p>}
      </div>
    );
  }
  if (type === "radio" && options) {
    return (
      <fieldset className={className} aria-describedby={describedBy}>
        <legend className="label">
          {label}
          {required && <span className="text-red-700"> *</span>}
        </legend>
        <div className="flex flex-wrap gap-2">
          {options.map(([v, l]) => (
            <label key={v} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm has-[:checked]:border-electric-500 has-[:checked]:bg-electric-100">
              <input type="radio" name={name} value={v} defaultChecked={dv === v} className="h-4 w-4 text-electric-600" />
              {l}
            </label>
          ))}
        </div>
        {help && <p id={`${id}-help`} className="help">{help}</p>}
        {err && <p id={`${id}-err`} className="mt-1 text-xs font-medium text-red-700">{err}</p>}
      </fieldset>
    );
  }
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-red-700"> *</span>}
      </label>
      {type === "textarea" ? (
        <textarea {...common} rows={rows} defaultValue={dv} placeholder={placeholder} className="input" />
      ) : type === "select" ? (
        <select {...common} defaultValue={dv ?? ""} className="input" multiple={multiple}>
          {!multiple && <option value="">—</option>}
          {options?.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      ) : (
        <input {...common} type={type} defaultValue={type === "file" ? undefined : dv} placeholder={placeholder} accept={accept} className={type === "file" ? "block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-electric-100 file:px-3 file:py-2 file:text-electric-600" : "input"} min={min} max={max} step={step} />
      )}
      {help && <p id={`${id}-help`} className="help">{help}</p>}
      {err && <p id={`${id}-err`} className="mt-1 text-xs font-medium text-red-700">{err}</p>}
    </div>
  );
}

/** Checkbox group submitting several values under one name. */
export function CheckGroup({ name, label, options, defaults = [] }: { name: string; label: string; options: Opt[]; defaults?: string[] }) {
  const { fieldErrors } = useContext(Ctx);
  const err = fieldErrors?.[name];
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {options.map(([v, l]) => (
          <label key={v} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={name} value={v} defaultChecked={defaults.includes(v)} className="h-4 w-4" />
            {l}
          </label>
        ))}
      </div>
      {err && <p className="mt-1 text-xs font-medium text-red-700">{err}</p>}
    </fieldset>
  );
}
