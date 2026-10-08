import fs from "node:fs/promises";
import path from "node:path";
import { out, command } from "./common.mjs";
const manifest = JSON.parse(
  await fs.readFile(path.join(out, "manifest.json"), "utf8"),
);
for (const name of manifest.artifacts) {
  command("pdftoppm", [
    "-r",
    "300",
    "-png",
    path.join(out, name),
    path.join(out, name.replace(".pdf", "")),
  ]);
  console.log(`Rendered ${name} at 300 dpi`);
}
// A source-derived side-by-side preview of finished trim areas, not a print source.
const { PNG } = await import("pngjs");
const a = PNG.sync.read(
    await fs.readFile(path.join(out, "conference-card-front-1.png")),
  ),
  b = PNG.sync.read(
    await fs.readFile(path.join(out, "conference-card-back-1.png")),
  );
const mm = 300 / 25.4,
  bleed = Math.round(manifest.print.bleed * mm),
  w = Math.round(manifest.print.trim.width * mm),
  h = Math.round(manifest.print.trim.height * mm),
  pad = 35,
  gap = 45;
const result = new PNG({ width: w * 2 + pad * 2 + gap, height: h + pad * 2 });
for (let i = 0; i < result.data.length; i += 4)
  result.data.set([225, 231, 242, 255], i);
for (const [index, img] of [a, b].entries())
  for (let y = 0; y < h; y++) {
    const sourceStart = ((y + bleed) * img.width + bleed) * 4;
    result.data.set(
      img.data.subarray(sourceStart, sourceStart + w * 4),
      ((y + pad) * result.width + pad + index * (w + gap)) * 4,
    );
  }
await fs.writeFile(
  path.join(out, "design-preview.png"),
  PNG.sync.write(result),
);
