import { readFileSync, existsSync } from "fs";
import os from "os";
import path from "path";

/** Loads .env (without overriding real env vars) and points the app at the TEST database. */
export function loadTestEnv() {
  const file = path.resolve(__dirname, "..", ".env");
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  }
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error("TEST_DATABASE_URL must be set (see .env.example)");
  if (!/_test\b/.test(testUrl)) throw new Error("Refusing to run tests: TEST_DATABASE_URL must point at a *_test database");
  process.env.DATABASE_URL = testUrl;
  process.env.STORAGE_DIR = path.join(os.tmpdir(), "gpuswapper-test-storage");
  process.env.EMAIL_DRIVER = "console";
  process.env.SESSION_SECRET ??= "test-secret-test-secret-test-secret-123456";
}
