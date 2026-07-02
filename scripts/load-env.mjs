import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const candidateRoots = [
  process.env.INIT_CWD,
  process.env.PWD,
  process.cwd(),
  path.resolve(sourceDir, ".."),
];

const seen = new Set();
for (const root of candidateRoots) {
  if (!root) continue;
  for (const filename of [".env.local", ".env"]) {
    const envPath = path.resolve(root, filename);
    if (seen.has(envPath) || !fs.existsSync(envPath)) continue;
    seen.add(envPath);
    dotenv.config({ path: envPath, quiet: true });
  }
}
