/**
 * Email adapter. The MVP ships only a "console" adapter that writes messages to the
 * server log (safe mail capture for local development). Notifications inside the
 * app work regardless of email configuration.
 */
export type Mail = { to: string; subject: string; text: string };

export function emailConfigured(): boolean {
  const driver = process.env.EMAIL_DRIVER ?? "none";
  if (driver === "console") return process.env.NODE_ENV !== "production";
  return false; // real providers are not integrated in the MVP
}

export const sentMail: Mail[] = []; // captured for tests

export async function sendMail(mail: Mail): Promise<boolean> {
  if (!emailConfigured()) return false;
  sentMail.push(mail);
  if (process.env.NODE_ENV !== "test") {
    console.info(`\n[mail:console] To: ${mail.to}\nSubject: ${mail.subject}\n${mail.text}\n`);
  }
  return true;
}
