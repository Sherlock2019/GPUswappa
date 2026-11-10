export type AppErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "RATE_LIMITED" | "CONFLICT" | "POLICY";

/**
 * Errors thrown by services. `message` is a translation key (errors.*) or a safe,
 * user-facing sentence. Never put implementation details in it.
 */
export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public fieldErrors?: Record<string, string>,
    public details?: string[],
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const forbidden = (msg = "errors.forbidden") => new AppError("FORBIDDEN", msg);
export const notFound = (msg = "errors.notFound") => new AppError("NOT_FOUND", msg);
export const unauthenticated = () => new AppError("UNAUTHENTICATED", "errors.signInRequired");
