import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const proof = process.argv.includes("--proof");
export const preset = process.argv.includes("4up") ? "4up" : "8up";
export const out = path.join(root, "output", proof ? "proof" : preset === "4up" ? "4up" : "print");
export async function readJson(file) {
  return JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
}
export async function assertApprovedArtwork() {
  const lock = await readJson("validation/approved/source-lock.json");
  const digest = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
  const changed = [];
  for (const [file, expected] of Object.entries(lock.files))
    if (digest(await fs.readFile(path.join(root,file))) !== expected) changed.push(file);
  const component = (await fs.readFile(path.join(root,"src/components.tsx"),"utf8")).split("export function Sheet(")[0];
  if (digest(component) !== lock.componentArtwork) changed.push("approved Card components");
  for (const [side,expected] of Object.entries(lock.pdfs))
    if (digest(await fs.readFile(path.join(root,`validation/approved/${side}.pdf`))) !== expected) changed.push(`${side} approved PDF`);
  if (changed.length) throw new Error(`Approved artwork changed: ${changed.join(", ")}. Print production requires the approved baseline.`);
}
export async function sourceHash() {
  const hash = crypto.createHash("sha256");
  async function visit(dir) {
    for (const entry of (await fs.readdir(dir, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(file);
      else {
        hash.update(path.relative(root, file));
        hash.update(await fs.readFile(file));
      }
    }
  }
  for (const dir of ["src", "config", "public/assets", "scripts", "tests", "validation/approved"])
    await visit(path.join(root, dir));
  for (const file of ["package.json", "package-lock.json", "index.html"])
    hash.update(await fs.readFile(path.join(root, file)));
  return hash.digest("hex");
}
export function command(name, args) {
  const bundled = path.join(
    os.homedir(),
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/poppler/bin",
    name,
  );
  const executable = process.env.CONFERENCE_POPPLER_BIN
    ? path.join(process.env.CONFERENCE_POPPLER_BIN, name)
    : existsSync(bundled)
      ? bundled
      : name;
  try {
    return execFileSync(executable, args, {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (error) {
    throw new Error(
      `${name} failed. Install Poppler (brew install poppler) or add its bin directory to PATH. ${error.message}`,
    );
  }
}
