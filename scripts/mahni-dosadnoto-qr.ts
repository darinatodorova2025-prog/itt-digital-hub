#!/usr/bin/env tsx
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const url = "https://ittdigitalhub.org/bg/mahni-dosadnoto";
const encoded = encodeURIComponent(url);
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="100%" height="100%" fill="#fff"/>
  <image href="https://api.qrserver.com/v1/create-qr-code/?size=480x480&data=${encoded}" x="16" y="16" width="480" height="480"/>
  <text x="256" y="502" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#102a33">ittdigitalhub.org/bg/mahni-dosadnoto</text>
</svg>`;

const outDir = path.join(process.cwd(), "public", "event");
mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "mahni-dosadnoto-qr.svg");
writeFileSync(out, svg, "utf8");
console.log(`Wrote ${out} for ${url}`);
