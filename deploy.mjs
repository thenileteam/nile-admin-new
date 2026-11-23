/**
 * Uploads `dist/` over FTP using credentials from the environment.
 *
 *   FTP_HOST=… FTP_USER=… FTP_PASSWORD=… FTP_DIR=/admin.nile.ng npm run deploy
 *
 * Credentials are never stored in this repository; keep them in a local .env
 * (git-ignored) or export them in your shell.
 */
import { Client } from "basic-ftp";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const loadEnvFile = () => {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
};

const fail = (message) => {
  console.error(`✖ ${message}`);
  process.exit(1);
};

loadEnvFile();

const host = process.env.FTP_HOST;
const user = process.env.FTP_USER;
const password = process.env.FTP_PASSWORD;
const remoteDir = process.env.FTP_DIR || "/admin.nile.ng";
const distDir = resolve(process.cwd(), "dist");

if (!host || !user || !password) {
  fail("Set FTP_HOST, FTP_USER and FTP_PASSWORD (environment or .env).");
}
if (!existsSync(distDir)) {
  fail("dist/ is missing. Run `npm run build` first.");
}

const client = new Client(60_000);
client.ftp.verbose = process.env.FTP_VERBOSE === "1";

try {
  await client.access({ host, user, password, secure: process.env.FTP_SECURE === "1" });
  await client.ensureDir(remoteDir);
  await client.cd(remoteDir);

  // The build is a self-contained SPA: clear stale hashed assets before upload.
  if (process.env.FTP_CLEAN === "1") {
    await client.clearWorkingDir();
  }

  await client.uploadFromDir(distDir);
  console.log(`✔ Uploaded dist/ to ${host}${remoteDir}`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  client.close();
}
