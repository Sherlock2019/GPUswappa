import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { AppError } from "./errors";

/**
 * Private file storage. Files are NEVER placed under /public; they are only served
 * through authorised route handlers (/api/files/...).
 */
export interface StorageAdapter {
  put(data: Buffer, ext: string): Promise<string>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

const KEY_RE = /^[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/;

class LocalPrivateStorage implements StorageAdapter {
  constructor(private root: string) {}
  private resolve(key: string) {
    if (!KEY_RE.test(key)) throw new AppError("VALIDATION", "errors.invalidFile");
    return path.join(this.root, key);
  }
  async put(data: Buffer, ext: string) {
    await fs.mkdir(this.root, { recursive: true, mode: 0o700 });
    const key = `${randomUUID()}.${ext}`;
    await fs.writeFile(this.resolve(key), data, { mode: 0o600 });
    return key;
  }
  async get(key: string) {
    return fs.readFile(this.resolve(key));
  }
  async remove(key: string) {
    await fs.rm(this.resolve(key), { force: true });
  }
}

let adapter: StorageAdapter | null = null;
export function storage(): StorageAdapter {
  if (!adapter) {
    const driver = process.env.STORAGE_DRIVER ?? "local";
    if (driver !== "local") throw new Error(`Storage driver "${driver}" is not implemented in the MVP`);
    adapter = new LocalPrivateStorage(path.resolve(process.env.STORAGE_DIR ?? "./storage/private"));
  }
  return adapter;
}

// ── File validation (by magic bytes, not by client-supplied MIME type) ──

export type DetectedType = { mime: string; ext: "pdf" | "jpg" | "png" | "webp" };

export function detectFileType(buf: Buffer): DetectedType | null {
  if (buf.length < 12) return null;
  if (buf.subarray(0, 5).toString("ascii") === "%PDF-") return { mime: "application/pdf", ext: "pdf" };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png" };
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export function maxUploadBytes() {
  const mb = Number(process.env.MAX_UPLOAD_MB ?? "10");
  return (Number.isFinite(mb) && mb > 0 ? mb : 10) * 1024 * 1024;
}

export function validateUpload(buf: Buffer, allowed: string[]): DetectedType {
  if (buf.length === 0) throw new AppError("VALIDATION", "errors.fileEmpty");
  if (buf.length > maxUploadBytes()) throw new AppError("VALIDATION", "errors.fileTooLarge");
  const t = detectFileType(buf);
  if (!t || !allowed.includes(t.mime)) throw new AppError("VALIDATION", "errors.fileType");
  return t;
}

/** Keeps a display-only filename: strips paths and unusual characters. */
export function safeFilename(name: string) {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.normalize("NFKD").replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, " ").trim().slice(0, 120);
  return cleaned || "file";
}
