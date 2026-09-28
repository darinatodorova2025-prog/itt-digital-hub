#!/usr/bin/env tsx
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";

const url = "https://ittdigitalhub.org/bg/mahni-dosadnoto";

async function main() {
  const qrSvg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 480,
    color: { dark: "#102a33", light: "#ffffff" },
  });

  const innerMatch = qrSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  const innerBody = innerMatch?.[1]?.trim() ?? "";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="540" viewBox="0 0 512 540">
  <rect width="100%" height="100%" fill="#fff"/>
  <svg x="16" y="16" width="480" height="480" viewBox="0 0 480 480">${innerBody}</svg>
  <text x="256" y="528" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#102a33">ittdigitalhub.org/bg/mahni-dosadnoto</text>
</svg>`;

  const outDir = path.join(process.cwd(), "public", "event");
  mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, "mahni-dosadnoto-qr.svg");
  writeFileSync(out, svg, "utf8");
  console.log(`Wrote ${out} for ${url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
