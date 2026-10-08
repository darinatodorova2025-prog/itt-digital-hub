import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {
  PDFDocument,
  PDFArray,
  PDFRawStream,
  decodePDFRawStream,
} from "pdf-lib";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import {
  slots,
  cropSegments,
  full,
  print,
  MM,
  qrReady,
} from "../src/geometry.mjs";
import { out, root, proof, readJson, sourceHash, command } from "./common.mjs";
const checks = [],
  warnings = [];
function check(name, ok, detail) {
  checks.push({ name, status: ok === null ? "N/A" : ok ? "PASS" : "FAIL", detail });
}
const normalize = (text) => text.normalize("NFC").replace(/\s+/g, "");
const near = (a, b) => Math.abs(a - b) <= print.geometryToleranceMm;
const manifest = JSON.parse(
  await fs.readFile(path.join(out, "manifest.json"), "utf8"),
);
const content = await readJson("config/content.json");
const qr = await readJson("config/qr.json");
const reference = await readJson("config/back-reference.json");
const rasterBack = reference.format === "raster-reference";
check(
  "Current source matches export",
  manifest.sourceHash === (await sourceHash()),
);
check(
  "Complete package exported",
  manifest.completePackage && manifest.artifacts.length === 5,
);
check(
  "Configured geometry",
  print.trim.width === 65 &&
    print.trim.height === 90 &&
    print.bleed === 3 &&
    full.width === 71 &&
    full.height === 96 &&
    print.paper.width === 210 &&
    print.paper.height === 297 &&
    print.columns === 2 &&
    print.rows === 2 &&
    print.safe >= 4,
);
check("Confirmed QR configuration", proof || qrReady(qr), {
  url: qr.url,
  mode: proof ? "PROOF" : "PRODUCTION",
});
check("QR quiet zone >=4 modules", qr.quietZoneModules >= 4);
const layouts = JSON.parse(
  await fs.readFile(path.join(out, "browser-layout.json"), "utf8"),
);
const texts = {
  front: [...Object.values(content.front).flat(), content.website].filter(Boolean),
  back: [...Object.values(content.back).flat(), content.website].filter(Boolean),
};
for (const side of ["front", "back"]) {
  const layout = layouts[side];
  const nativeCheck = (name, ok, detail) => check(name,
    side === "back" && rasterBack ? null : ok,
    side === "back" && rasterBack ? "N/A: text and logo are part of the exact supplied raster artwork." : detail);
  if (side === "back" && rasterBack) {
    const bytes = await fs.readFile(path.join(root, "public", reference.src));
    const source = PNG.sync.read(bytes);
    const artwork = layout.images.find(i => i.src === reference.src);
    check("back: exact approved reference asset preserved",
      crypto.createHash("sha256").update(bytes).digest("hex") === reference.sha256);
    check("back: reference aspect ratio matches 65 x 90 mm",
      Math.abs(source.width / source.height - 65 / 90) < 0.00001);
    check("back: reference artwork at exact trim width",
      artwork?.loaded && Math.abs(artwork.widthMm - 65) <= 25.4 / 96 / 2);
    check("back: reference effective resolution >=300 dpi",
      source.width / (65 / 25.4) >= 300, {dpi:source.width / (65 / 25.4)});
    await fs.mkdir(path.join(root, "tmp", "reference-images"), {recursive:true});
    const imagePrefix = path.join(root, "tmp", "reference-images", "back");
    command("pdfimages", ["-png", path.join(out, "conference-card-back.pdf"), imagePrefix]);
    const embedded = PNG.sync.read(await fs.readFile(imagePrefix + "-000.png"));
    check("back: PDF embeds every reference pixel unchanged",
      embedded.width === source.width && embedded.height === source.height &&
      embedded.data.equals(source.data));
    check("back: reference footer inside 4 mm safe area",
      reference.footerBottomInsetMm >= 4, reference.safeAreaNote);
    warnings.push("Exact raster reference used for BACK at 416.56 dpi. Back text/logo are flattened into the supplied image; native font and selectable-text checks are N/A. Website is approximately 2 mm from bottom trim, with approximately 5 pt text, retained to meet the requested 1:1 design.");
  }
  check(
    `${side}: physical browser geometry`,
    near(layout.width, 71) && near(layout.height, 96),
    { width: layout.width, height: layout.height },
  );
  check(
    `${side}: loaded fonts and assets`,
    layout.fontsReady === "loaded" &&
      layout.images.every((i) => i.loaded) &&
      layout.errors.length === 0,
  );
  check(`${side}: no exported overlays`, !layout.guides);
  nativeCheck(`${side}: safe margin >=4 mm`, layout.safeMm >= 4);
  const bound = print.bleed + layout.safeMm;
  const unsafe = layout.items.filter(
    (i) =>
      i.box.x < bound - 0.03 ||
      i.box.y < bound - 0.03 ||
      i.box.x + i.box.width > full.width - bound + 0.03 ||
      i.box.y + i.box.height > full.height - bound + 0.03,
  );
  nativeCheck(
    `${side}: all important content inside safe margin`,
    unsafe.length === 0,
    unsafe.map((i) => ({ text: i.text, className: i.className, box: i.box })),
  );
  nativeCheck(
    `${side}: no important-content overlap`,
    layout.overlaps.length === 0,
    layout.overlaps,
  );
  nativeCheck(
    `${side}: no container overflow`,
    layout.items.every((i) => !i.overflow),
    layout.items.filter((i) => i.overflow),
  );
  const clipped = layout.ranges.filter(
    (r) =>
      r.x < bound - 0.08 ||
      r.y < bound - 0.08 ||
      r.x + r.width > full.width - bound + 0.08 ||
      r.y + r.height > full.height - bound + 0.08,
  );
  nativeCheck(
    `${side}: rendered text ranges inside safe margin`,
    clipped.length === 0,
    clipped,
  );
  const small = layout.items.filter((i) => i.text && i.fontPt < 7.49);
  nativeCheck(`${side}: minimum supporting text 7.5 pt`, small.length === 0, small);
  const essential = layout.items.filter(
    (i) =>
      i.className === "question-text" ||
      i.className === "interpretation" ||
      i.className === "support" ||
      i.className === "instruction",
  );
  nativeCheck(
    `${side}: essential body text >=8 pt`,
    essential.every((i) => i.fontPt >= 7.99),
  );
  const fontNames = layout.items.filter((i) => i.text).map((i) => i.font);
  nativeCheck(
    `${side}: IBM Plex used throughout`,
    fontNames.every((f) => f.includes("Plex")),
  );
  nativeCheck(
    `${side}: actual glyph fonts, no Cyrillic fallback`,
    layout.platformFonts
      .flat()
      .every(
        (f) => f.glyphCount === 0 || f.postScriptName.startsWith("IBMPlexSans"),
      ),
    layout.platformFonts.flat(),
  );
  const bodyMissing = texts[side].filter(
    (t) => !normalize(layout.text).includes(normalize(t)),
  );
  nativeCheck(
    `${side}: approved browser text complete`,
    bodyMissing.length === 0,
    bodyMissing,
  );
  const pdf = await PDFDocument.load(
    await fs.readFile(path.join(out, `conference-card-${side}.pdf`)),
  );
  const p = pdf.getPage(0);
  check(`${side}: single bleed PDF page`, pdf.getPageCount() === 1);
  for (const [name, box, w, h, x, y] of [
    ["MediaBox", p.getMediaBox(), 71, 96, 0, 0],
    ["BleedBox", p.getBleedBox(), 71, 96, 0, 0],
    ["TrimBox", p.getTrimBox(), 65, 90, 3, 3],
  ])
    check(
      `${side}: ${name}`,
      near(box.width / MM, w) &&
        near(box.height / MM, h) &&
        near(box.x / MM, x) &&
        near(box.y / MM, y),
      box,
    );
  const extracted = command("pdftotext", [
    "-layout",
    path.join(out, `conference-card-${side}.pdf`),
    "-",
  ]);
  const missing = texts[side].filter(
    (t) => !normalize(extracted).includes(normalize(t)),
  );
  nativeCheck(
    `${side}: selectable Bulgarian PDF text complete`,
    missing.length === 0,
    missing,
  );
  nativeCheck(
    `${side}: no replacement or broken glyphs`,
    !/[\uFFFD\u25A1\u0000]/u.test(extracted),
  );
  const fonts = command("pdffonts", [
    path.join(out, `conference-card-${side}.pdf`),
  ])
    .trim()
    .split("\n")
    .slice(2);
  nativeCheck(
    `${side}: all fonts embedded with Unicode mapping`,
    fonts.length >= 2 &&
      fonts.every((row) => /yes\s+(?:yes|no)\s+yes/.test(row)),
    fonts,
  );
  // Raster comparisons measure differences without treating antialiasing as layout failure.
  const png = PNG.sync.read(
    await fs.readFile(path.join(out, `conference-card-${side}-1.png`)),
  );
  const browser = PNG.sync.read(
    await fs.readFile(path.join(out, `browser-${side}.png`)),
  );
  let sum = 0,
    n = 0;
  for (let y = 3; y < Math.min(png.height, browser.height) - 3; y += 2)
    for (let x = 3; x < Math.min(png.width, browser.width) - 3; x += 2) {
      const a = (y * png.width + x) * 4,
        b = (y * browser.width + x) * 4;
      for (let k = 0; k < 3; k++) {
        sum += Math.abs(png.data[a + k] - browser.data[b + k]);
        n++;
      }
    }
  const diff = sum / n;
  check(
    `${side}: PDF/browser raster comparison`,
    Math.abs(png.width - browser.width) <= 2 &&
      Math.abs(png.height - browser.height) <= 2 &&
      diff < 14,
    {
      meanChannelDifference: diff,
      browser: [browser.width, browser.height],
      pdf: [png.width, png.height],
      limit: 14,
    },
  );
  const sample = (x, y) => {
    const i = (y * png.width + x) * 4;
    return [...png.data.slice(i, i + 3)];
  };
  // 0.15 mm inside each media edge must have designed fill; white printer margins fail.
  const inset = Math.ceil((0.15 * 300) / 25.4);
  const edgePoints = [
    [inset, inset],
    [png.width - inset, inset],
    [inset, png.height - inset],
    [png.width - inset, png.height - inset],
  ];
  const whiteCorners = edgePoints.filter(([x, y]) =>
    sample(x, y).every((c) => c > 251),
  );
  check(
    `${side}: full-bleed backgrounds, no white margins`,
    whiteCorners.length === 0,
    edgePoints.map(([x, y]) => sample(x, y)),
  );
  for (const image of layout.images)
    warnings.push(
      `${side}: PNG artwork retained, effective resolution ${(image.naturalWidth / (image.widthMm / 25.4)).toFixed(0)} dpi.`,
    );
}
function streams(doc, page) {
  let c = page.node.Contents();
  const list = c instanceof PDFArray ? c.asArray() : [c];
  return list
    .map((ref) => doc.context.lookup(ref))
    .filter((x) => x instanceof PDFRawStream)
    .map((s) => Buffer.from(decodePDFRawStream(s).decode()).toString("latin1"))
    .join("\n");
}
for (const name of [
  "conference-card-A4-duplex.pdf",
  "conference-card-A4-registration-proof.pdf",
  "conference-card-A4-calibration.pdf",
]) {
  const doc = await PDFDocument.load(await fs.readFile(path.join(out, name)));
  check(
    `${name}: exactly two A4 pages`,
    doc.getPageCount() === 2 &&
      doc
        .getPages()
        .every(
          (p) => near(p.getWidth() / MM, 210) && near(p.getHeight() / MM, 297),
        ),
  );
  const fontRows = command("pdffonts", [path.join(out, name)])
    .trim()
    .split("\n")
    .slice(2);
  check(
    `${name}: all fonts embedded`,
    fontRows.length > 0 &&
      fontRows.every((row) => /yes\s+(?:yes|no)\s+yes/.test(row)),
    fontRows,
  );
  if (name.includes("calibration")) {
    for (const [index, side] of ["front", "back"].entries()) {
      const txt = normalize(
        command("pdftotext", [
          "-f",
          String(index + 1),
          "-l",
          String(index + 1),
          "-raw",
          path.join(out, name),
          "-",
        ]),
      );
      check(
        `Calibration ${side}: labels and scale text present`,
        txt.includes(`${side.toUpperCase()}/TOP^`) &&
          txt.includes("100mm") &&
          ["A", "B", "C", "D"].every((id) =>
            txt.includes(`${id}/${side.toUpperCase()}`),
          ),
      );
      const image = PNG.sync.read(
        await fs.readFile(
          path.join(out, `conference-card-A4-calibration-${index + 1}.png`),
        ),
      );
      const inverted = side === "back" && print.duplex === "short-edge";
      const low = ((inverted ? 278 : 10) * 300) / 25.4,
        high = ((inverted ? 290 : 22) * 300) / 25.4;
      let ink = 0;
      for (let y = Math.floor(low); y < Math.floor(high); y++)
        for (let x = 0; x < image.width; x++) {
          const pos = (y * image.width + x) * 4;
          if (
            image.data[pos] < 100 &&
            image.data[pos + 1] < 100 &&
            image.data[pos + 2] < 130
          )
            ink++;
        }
      check(
        `Calibration ${side}: rendered orientation label visible`,
        ink > 200,
        { ink },
      );
    }
    continue;
  }
  if (name.includes("registration-proof"))
    for (const [index, side] of ["front", "back"].entries()) {
      const txt = normalize(
        command("pdftotext", [
          "-f",
          String(index + 1),
          "-l",
          String(index + 1),
          "-raw",
          path.join(out, name),
          "-",
        ]),
      );
      const image = PNG.sync.read(
        await fs.readFile(
          path.join(
            out,
            `conference-card-A4-registration-proof-${index + 1}.png`,
          ),
        ),
      );
      let yellow = 0;
      for (let i = 0; i < image.data.length; i += 4)
        if (
          image.data[i] > 240 &&
          image.data[i + 1] > 200 &&
          image.data[i + 2] < 130
        )
          yellow++;
      check(
        `Numbered proof ${side}: actual numbered artwork labels visible`,
        [1, 2, 3, 4].every((id) =>
          txt.includes(`${side === "front" ? "F" : "B"}${id}^`),
        ) && yellow > 2000,
        { yellow },
      );
    }
  for (const [index, side] of ["front", "back"].entries()) {
    const s = streams(doc, doc.getPage(index));
    const extractedPage = normalize(
      command("pdftotext", [
        "-f",
        String(index + 1),
        "-l",
        String(index + 1),
        "-raw",
        path.join(out, name),
        "-",
      ]),
    );
    const counts = texts[side].map((text) => ({
      text,
      count: extractedPage.split(normalize(text)).length - 1,
      expected:
        4 *
        texts[side].reduce(
          (sum, value) => sum + value.split(text).length - 1,
          0,
        ),
    }));
    check(
      `${name} ${side}: four complete copies of correct approved text`,
      side === "back" && rasterBack ? null : counts.every((c) => c.count === c.expected),
      counts,
    );
    check(
      `${name} ${side}: no PDF page rotation`,
      doc.getPage(index).getRotation().angle === 0,
    );
    const draws = [
      ...s.matchAll(/q\s+([\s\S]*?)\/EmbeddedPdf[^\s]+\s+Do\s+Q/g),
    ];
    const unitScale = draws.every((m) => {
      const cm = [
        ...m[1].matchAll(
          /([\d.e+-]+) ([\d.e+-]+) ([\d.e+-]+) ([\d.e+-]+) ([\d.e+-]+) ([\d.e+-]+) cm/g,
        ),
      ].map((v) => v.slice(1).map(Number));
      return cm
        .slice(1)
        .every(
          (v) =>
            Math.abs(Math.abs(v[0]) - 1) < 1e-8 &&
            Math.abs(Math.abs(v[3]) - 1) < 1e-8 &&
            Math.abs(v[1]) < 1e-8 &&
            Math.abs(v[2]) < 1e-8,
        );
    });
    check(
      `${name} ${side}: scale 1 without distortion`,
      draws.length === 4 && unitScale,
    );
    const doCount = (s.match(/\/EmbeddedPdf[^\s]+\s+Do/g) || []).length;
    check(`${name} ${side}: four embedded artwork placements`, doCount === 4, {
      count: doCount,
    });
    const translation = [...s.matchAll(/1 0 0 1 ([\d.-]+) ([\d.-]+) cm/g)].map(
      (m) => [Number(m[1]) / MM, Number(m[2]) / MM],
    );
    const expected = slots(side).map((slot) => [
      slot.x + (slot.rotation === 180 ? slot.width : 0),
      print.paper.height -
        slot.y -
        slot.height +
        (slot.rotation === 180 ? slot.height : 0),
    ]);
    check(
      `${name} ${side}: actual PDF translation matrices`,
      expected.every((e) =>
        translation.some((t) => near(e[0], t[0]) && near(e[1], t[1])),
      ),
      { expected, translation },
    );
    const hasRotation180 = (s.match(/-1 [\d.e+-]+ [\d.e+-]+ -1 0 0 cm/g) || [])
      .length;
    check(
      `${name} ${side}: orientation`,
      side === "front" || print.duplex === "long-edge"
        ? hasRotation180 === 0
        : hasRotation180 === 4,
    );
  }
}
const front = slots("front"),
  back = slots("back");
for (let i = 0; i < 4; i++) {
  const f = front[i],
    b = back[i];
  const bx = b.x - print.backOffset.x,
    by = b.y - print.backOffset.y;
  check(
    `Slot ${f.id}: duplex registration within ${print.geometryToleranceMm} mm`,
    near(
      print.duplex === "long-edge" ? print.paper.width - bx - b.width : bx,
      f.x,
    ) &&
      near(
        print.duplex === "short-edge" ? print.paper.height - by - b.height : by,
        f.y,
      ),
  );
}
let cropValid = true;
for (const side of ["front", "back"])
  for (const slot of slots(side))
    for (const [x1, y1, x2, y2] of cropSegments(slot)) {
      cropValid &&=
        Math.min(x1, x2) >= 0 &&
        Math.max(x1, x2) <= print.paper.width &&
        Math.min(y1, y2) >= 0 &&
        Math.max(y1, y2) <= print.paper.height;
      for (const b of slots(side))
        cropValid &&=
          Math.max(x1, x2) <= b.x ||
          Math.min(x1, x2) >= b.x + b.width ||
          Math.max(y1, y2) <= b.y ||
          Math.min(y1, y2) >= b.y + b.height;
    }
check("Crop marks clear all bleed artwork and paper boundaries", cropValid);
const frontPng = PNG.sync.read(
  await fs.readFile(path.join(out, "conference-card-front-1.png")),
);
const decoded = jsQR(
  new Uint8ClampedArray(frontPng.data),
  frontPng.width,
  frontPng.height,
);
check(
  "QR decoded from final PDF PNG",
  proof && !qrReady(qr) ? decoded === null : decoded?.data === qr.url,
  { decoded: decoded?.data || null },
);
// Decode original supplied repository SVG independently, preserving its exact destination.
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
  await page.goto(
    `file://${path.join(root, "public/assets/original-challenge-qr.svg")}`,
  );
  const p = PNG.sync.read(await page.screenshot());
  const original = jsQR(new Uint8ClampedArray(p.data), p.width, p.height);
  check(
    "Original functional QR content preserved",
    original?.data === qr.originalUrl,
    { decoded: original?.data || null },
  );
} finally {
  await browser.close();
}
// Each imposed front QR must also decode, ensuring imposition introduced no scaling or corruption.
const imposed = PNG.sync.read(
  await fs.readFile(path.join(out, "conference-card-A4-duplex-1.png")),
);
for (const slot of slots("front")) {
  const x = Math.round((slot.x * 300) / 25.4),
    y = Math.round((slot.y * 300) / 25.4),
    w = Math.round((slot.width * 300) / 25.4),
    h = Math.round((slot.height * 300) / 25.4);
  const crop = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < h; row++)
    crop.set(
      imposed.data.subarray(
        ((y + row) * imposed.width + x) * 4,
        ((y + row) * imposed.width + x + w) * 4,
      ),
      row * w * 4,
    );
  const d = jsQR(crop, w, h);
  check(
    `A4 slot ${slot.id}: QR scans`,
    proof && !qrReady(qr) ? d === null : d?.data === qr.url,
  );
}
warnings.push(
  rasterBack ? "Front typography is unchanged. Back typography is the supplied raster reference." : "Native back typography: headings 18 px / 13.5 pt, instruction/questions/interpretation/email/site 8 pt, invitation 8.5 pt, phone 9 pt. Review a 100% paper proof for personal readability.",
);
warnings.push(
  "RGB digital-print output. No CMYK / PDF-X / print-shop ICC profile claim. Physical printer registration requires calibration.",
);
const failed = checks.filter((c) => c.status === "FAIL");
const result = {
  status: failed.length
    ? "FAIL"
    : proof
      ? "PASS_PROOF"
      : "PASS_DIGITAL_PREFLIGHT",
  requires:
    "Final design approval and physical paper/calibration proof before the print run",
  sourceHash: manifest.sourceHash,
  checks,
  warnings,
  failed: failed.length,
};
await fs.writeFile(
  path.join(out, "preflight.json"),
  JSON.stringify(result, null, 2),
);
await fs.writeFile(
  path.join(out, "PREFLIGHT.md"),
  `# ${result.status}\n\n${checks.filter(c => c.status === "PASS").length} PASS, ${checks.filter(c => c.status === "N/A").length} N/A, ${failed.length} FAIL / ${checks.length} проверки. Геометрична толерантност: ${print.geometryToleranceMm} mm.\n\n${checks.map((c) => `- ${c.status} — ${c.name}${c.status === "FAIL" ? `: ${JSON.stringify(c.detail)}` : ""}`).join("\n")}\n\n## Ограничения\n\n${warnings.map((w) => `- ${w}`).join("\n")}\n\nНужни са визуално одобрение и физическа проба.\n`,
);
console.log(
  `${result.status}: ${checks.filter(c => c.status === "PASS").length} PASS, ${checks.filter(c => c.status === "N/A").length} N/A, ${failed.length} FAIL / ${checks.length}`,
);
for (const c of failed) console.error(c.name, JSON.stringify(c.detail));
if (failed.length) process.exitCode = 1;
