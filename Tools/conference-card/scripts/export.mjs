import fs from "node:fs/promises";
import path from "node:path";
import { build, preview } from "vite";
import { chromium } from "playwright";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import {
  full,
  print,
  slots,
  cropSegments,
  MM,
  qrReady,
} from "../src/geometry.mjs";
import fontkit from "@pdf-lib/fontkit";
import { root, out, proof, readJson, sourceHash } from "./common.mjs";
const qr = await readJson("config/qr.json");
if (!proof && !qrReady(qr))
  throw new Error(
    "Production blocked: set qr.url and an identical qr.confirmedUrl with verification evidence. Use npm run print:proof while pending.",
  );
const only = process.argv[process.argv.indexOf("--only") + 1];
const all = !process.argv.includes("--only");
const makeIndividual = all || only === "individual";
const makeDuplex = all || only === "duplex";
const makeCalibration = all || only === "calibration";
if (!makeIndividual && !makeDuplex && !makeCalibration)
  throw new Error("Unknown --only value");
await fs.mkdir(out, { recursive: true });
await fs.mkdir(path.join(root, "tmp"), { recursive: true });
await build({ root });
const server = await preview({
  root,
  preview: { host: "127.0.0.1", port: 0, strictPort: false },
});
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
let browser;
const layouts = {};
const documents = {};
const artifacts = [];
async function labelFont(doc) {
  doc.registerFontkit(fontkit);
  return doc.embedFont(
    await fs.readFile(path.join(root, "public/assets/IBMPlexSans-Regular.ttf")),
    { subset: false },
  );
}
const navy = rgb(4 / 255, 14 / 255, 49 / 255);
function line(page, coords, width = 0.25) {
  page.drawLine({
    start: { x: coords[0] * MM, y: (print.paper.height - coords[1]) * MM },
    end: { x: coords[2] * MM, y: (print.paper.height - coords[3]) * MM },
    thickness: width,
    color: navy,
  });
}
try {
  browser = await chromium.launch({ headless: true });
  if (makeIndividual || makeDuplex) {
    for (const side of ["front", "back"]) {
      const page = await browser.newPage({
        viewport: { width: 1000, height: 1200 },
        deviceScaleFactor: 300 / 96,
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("response", (r) => {
        if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
      });
      await page.goto(`${origin}/?render=card&side=${side}`, {
        waitUntil: "networkidle",
      });
      await page.evaluate(() => document.fonts.ready);
      if (qrReady(qr) && side === "front")
        await page.locator(".qr-art svg").waitFor();
      await page
        .locator(".card")
        .screenshot({ path: path.join(out, `browser-${side}.png`) });
      layouts[side] = await page.evaluate(() => {
        const card = document.querySelector(".card"),
          r = card.getBoundingClientRect(),
          unit = 96 / 25.4;
        const rect = (e) => {
          const b = e.getBoundingClientRect();
          return {
            x: (b.x - r.x) / unit,
            y: (b.y - r.y) / unit,
            width: b.width / unit,
            height: b.height / unit,
          };
        };
        const items = [...card.querySelectorAll("[data-safe]")].map((e) => ({
          tag: e.tagName,
          className: e.className,
          text: e.textContent,
          box: rect(e),
          font: getComputedStyle(e).fontFamily,
          fontPt: (parseFloat(getComputedStyle(e).fontSize) * 72) / 96,
          overflow:
            e.scrollHeight > e.clientHeight + 1 ||
            e.scrollWidth > e.clientWidth + 1,
        }));
        const ranges = [];
        for (const e of card.querySelectorAll("[data-safe]")) {
          if (!e.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(e);
          for (const b of range.getClientRects())
            ranges.push({
              text: e.textContent,
              x: (b.x - r.x) / unit,
              y: (b.y - r.y) / unit,
              width: b.width / unit,
              height: b.height / unit,
            });
        }
        const hero = card.querySelector(".front-hero, .back-hero");
        const color = (e) =>
          getComputedStyle(e)
            .backgroundColor.match(/[\d.]+/g)
            .slice(0, 3)
            .map(Number);
        const edgeBackground = {
          base: color(card),
          top: hero ? color(hero) : color(card),
          heroMm: hero ? hero.getBoundingClientRect().height / unit : 0,
          workbench: card.querySelector(".back-workbench")
            ? {
                ...rect(card.querySelector(".back-workbench")),
                color: color(card.querySelector(".back-workbench")),
                radius:
                  parseFloat(
                    getComputedStyle(card.querySelector(".back-workbench"))
                      .borderTopLeftRadius,
                  ) / unit,
              }
            : null,
        };
        return {
          edgeBackground,
          safeMm: parseFloat(getComputedStyle(card).getPropertyValue("--safe")),
          width: r.width / unit,
          height: r.height / unit,
          items,
          ranges,
          text: card.innerText,
          fontsReady: document.fonts.status,
          images: [...document.images].map((i) => ({
            src: i.getAttribute("src"),
            loaded: i.complete && i.naturalWidth > 0,
            naturalWidth: i.naturalWidth,
            widthMm: i.width / unit,
          })),
          overlaps: [...card.querySelectorAll("[data-safe]")].flatMap(
            (a, i, all) =>
              all
                .slice(i + 1)
                .filter((b) => !a.contains(b) && !b.contains(a))
                .filter((b) => {
                  const ar = a.getBoundingClientRect(),
                    br = b.getBoundingClientRect();
                  return (
                    Math.min(ar.right, br.right) - Math.max(ar.left, br.left) >
                      0.15 &&
                    Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top) >
                      0.15
                  );
                })
                .map((b) => [a.textContent, b.textContent]),
          ),
          guides: !!card.querySelector(".guides"),
          qrUrl: card
            .querySelector("[data-qr-url]")
            ?.getAttribute("data-qr-url"),
        };
      });
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("DOM.enable");
      await cdp.send("CSS.enable");
      const dom = await cdp.send("DOM.getDocument");
      const nodes = await cdp.send("DOM.querySelectorAll", {
        nodeId: dom.root.nodeId,
        selector: ".card [data-safe]",
      });
      layouts[side].platformFonts = [];
      for (const nodeId of nodes.nodeIds)
        layouts[side].platformFonts.push(
          (await cdp.send("CSS.getPlatformFontsForNode", { nodeId })).fonts,
        );
      layouts[side].errors = errors;
      await page.emulateMedia({ media: "print" });
      const raw = await page.pdf({
        width: `${full.width}mm`,
        height: `${full.height}mm`,
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: 0, bottom: 0, left: 0, right: 0 },
        scale: 1,
      });
      const doc = await PDFDocument.load(raw);
      if (doc.getPageCount() !== 1)
        throw new Error(`${side} has ${doc.getPageCount()} pages`);
      const p = doc.getPage(0);
      p.setMediaBox(0, 0, full.width * MM, full.height * MM);
      p.setCropBox(0, 0, full.width * MM, full.height * MM);
      p.setBleedBox(0, 0, full.width * MM, full.height * MM);
      p.setTrimBox(
        print.bleed * MM,
        print.bleed * MM,
        print.trim.width * MM,
        print.trim.height * MM,
      );
      // Chromium rounds page sizes to subpoints. Extend only the outer 0.12 mm of
      // bleed from the actual CSS edge colours; artwork and text keep scale 1.
      const edge = layouts[side].edgeBackground,
        strip = 0.12 * MM,
        pw = full.width * MM,
        ph = full.height * MM;
      const color = (values) => rgb(...values.map((v) => v / 255));
      for (const x of [0, pw - strip])
        p.drawRectangle({
          x,
          y: 0,
          width: strip,
          height: ph,
          color: color(edge.base),
        });
      p.drawRectangle({
        x: 0,
        y: 0,
        width: pw,
        height: strip,
        color: color(edge.base),
      });
      p.drawRectangle({
        x: 0,
        y: ph - strip,
        width: pw,
        height: strip,
        color: color(edge.top),
      });
      if (edge.heroMm)
        for (const x of [0, pw - strip])
          p.drawRectangle({
            x,
            y: ph - edge.heroMm * MM,
            width: strip,
            height: edge.heroMm * MM,
            color: color(edge.top),
          });
      if (edge.workbench)
        for (const x of [0, pw - strip])
          p.drawRectangle({
            x,
            y: ph - (edge.workbench.y + edge.workbench.height) * MM,
            width: strip,
            height: (edge.workbench.height - edge.workbench.radius) * MM,
            color: color(edge.workbench.color),
          });
      doc.setTitle(
        `ITT Digital Hub · Conference card · ${side}${proof ? " · PROOF" : ""}`,
      );
      doc.setSubject(
        `Trim 65x90 mm, bleed 3 mm; RGB; ${proof ? "proof only" : "design awaiting final approval"}`,
      );
      if (proof) {
        const font = await labelFont(doc);
        p.drawText("PROOF ONLY - NOT FOR PRODUCTION", {
          x: 8 * MM,
          y: 1 * MM,
          size: 5,
          font,
          color: navy,
        });
      }
      documents[side] = await doc.save();
      if (makeIndividual) {
        const name = `conference-card-${side}.pdf`;
        await fs.writeFile(path.join(out, name), documents[side]);
        artifacts.push(name);
      }
      await page.close();
    }
    await fs.writeFile(
      path.join(out, "browser-layout.json"),
      JSON.stringify(layouts, null, 2),
    );
  }
  if (makeDuplex) {
    const doc = await PDFDocument.create();
    const embedded = {
      front: await doc.embedPdf(documents.front, [0]),
      back: await doc.embedPdf(documents.back, [0]),
    };
    for (const side of ["front", "back"]) {
      const p = doc.addPage([print.paper.width * MM, print.paper.height * MM]);
      for (const s of slots(side)) {
        const x = s.x + (s.rotation === 180 ? s.width : 0),
          y =
            print.paper.height -
            s.y -
            s.height +
            (s.rotation === 180 ? s.height : 0);
        p.drawPage(embedded[side][0], {
          x: x * MM,
          y: y * MM,
          width: s.width * MM,
          height: s.height * MM,
          rotate: degrees(s.rotation),
        });
        for (const segment of cropSegments(s))
          line(p, segment, print.crop.lineWidthPt);
      }
    }
    doc.setTitle(`ITT · A4 duplex · ${print.duplex}${proof ? " · PROOF" : ""}`);
    const name = "conference-card-A4-duplex.pdf";
    const duplexBytes = await doc.save();
    await fs.writeFile(path.join(out, name), duplexBytes);
    artifacts.push(name);
    const numbered = await PDFDocument.load(duplexBytes);
    const proofFont = await labelFont(numbered);
    // Numbered asymmetric proof uses the same embedded artwork and placements.
    for (const [pageIndex, side] of ["front", "back"].entries()) {
      const p = numbered.getPage(pageIndex);
      for (const s of slots(side)) {
        const rotated = s.rotation === 180;
        const x = (s.x + (rotated ? s.width - 8 : 8)) * MM,
          y = (print.paper.height - s.y - (rotated ? s.height - 10 : 10)) * MM;
        p.drawRectangle({
          x: rotated ? x - 34 : x,
          y: rotated ? y - 13 : y - 3,
          width: 34,
          height: 16,
          color: rgb(1, 0.91, 0.3),
        });
        p.drawText(`${side === "front" ? "F" : "B"}${s.id} ^`, {
          x: rotated ? x - 3 : x + 3,
          y: rotated ? y - 1 : y + 1,
          font: proofFont,
          size: 11,
          color: navy,
          rotate: degrees(s.rotation),
        });
      }
      p.drawText(
        `PAIRING PROOF / ${side.toUpperCase()} / ${print.duplex} / 100%`,
        { x: 27 * MM, y: 20 * MM, font: proofFont, size: 8, color: navy },
      );
    }
    const proofName = "conference-card-A4-registration-proof.pdf";
    await fs.writeFile(path.join(out, proofName), await numbered.save());
    artifacts.push(proofName);
  }
  if (makeCalibration) {
    const doc = await PDFDocument.create();
    const font = await labelFont(doc);
    const targets = [
      { id: "A", x: 27, y: 37 },
      { id: "B", x: 178, y: 52 },
      { id: "C", x: 39, y: 253 },
      { id: "D", x: 164, y: 238 },
    ];
    for (const side of ["front", "back"]) {
      const p = doc.addPage([print.paper.width * MM, print.paper.height * MM]);
      const transform = ([x, y]) =>
        side === "front"
          ? [x, y]
          : print.duplex === "long-edge"
            ? [
                print.paper.width - x + print.backOffset.x,
                y + print.backOffset.y,
              ]
            : [
                x + print.backOffset.x,
                print.paper.height - y + print.backOffset.y,
              ];
      function mappedLine(a, b, width) {
        line(p, [...transform(a), ...transform(b)], width);
      }
      for (const t of targets) {
        mappedLine([t.x - 4, t.y], [t.x + 7, t.y], 0.4);
        mappedLine([t.x, t.y - 6], [t.x, t.y + 3], 0.4);
        mappedLine([t.x + 7, t.y], [t.x + 5, t.y - 1.5], 0.4);
        mappedLine([t.x + 7, t.y], [t.x + 5, t.y + 1.5], 0.4);
        for (const d of [-2, -1, 1, 2]) {
          mappedLine([t.x + d, t.y - 0.8], [t.x + d, t.y + 0.8], 0.2);
          mappedLine([t.x - 0.8, t.y + d], [t.x + 0.8, t.y + d], 0.2);
        }
        const [x, y] = transform([t.x + 2, t.y + 7]);
        p.drawText(`${t.id} / ${side === "front" ? "FRONT" : "BACK"}`, {
          x: x * MM,
          y: (print.paper.height - y) * MM,
          font,
          size: 9,
          color: navy,
          rotate: degrees(
            side === "back" && print.duplex === "short-edge" ? 180 : 0,
          ),
        });
      }
      for (const s of slots(side)) {
        for (const segment of cropSegments(s))
          line(p, segment, print.crop.lineWidthPt);
        const b = print.bleed;
        p.drawRectangle({
          x: (s.x + b) * MM,
          y: (print.paper.height - s.y - s.height + b) * MM,
          width: print.trim.width * MM,
          height: print.trim.height * MM,
          borderWidth: 0.3,
          borderColor: navy,
        });
      }
      const inverted = side === "back" && print.duplex === "short-edge";
      p.drawText(
        `${side.toUpperCase()} / TOP ^ / ${print.duplex.toUpperCase()} / ACTUAL SIZE 100%`,
        {
          x: (inverted ? 155 : 55) * MM,
          y: (inverted ? 17 : 280) * MM,
          size: 11,
          font,
          color: navy,
          rotate: degrees(inverted ? 180 : 0),
        },
      );
      p.drawText(
        `Back offsets: X ${print.backOffset.x} mm, Y ${print.backOffset.y} mm`,
        { x: 55 * MM, y: 274 * MM, size: 9, font, color: navy },
      );
      p.drawText(
        "Hold against light. View from BACK. Compare A/B/C/D crosses.",
        { x: 40 * MM, y: 145 * MM, size: 9, font, color: navy },
      );
      p.drawText(
        "Measure back-minus-front. Add X=-dx, Y=-dy to current offsets.",
        { x: 40 * MM, y: 140 * MM, size: 9, font, color: navy },
      );
      // A known 100 mm scale independent of card geometry.
      line(p, [55, 170, 155, 170], 0.4);
      for (const x of [55, 155]) line(p, [x, 168, x, 172], 0.4);
      p.drawText("100 mm", {
        x: 95 * MM,
        y: 120 * MM,
        size: 9,
        font,
        color: navy,
      });
    }
    const name = "conference-card-A4-calibration.pdf";
    await fs.writeFile(path.join(out, name), await doc.save());
    artifacts.push(name);
  }
  const digest = await sourceHash();
  const manifest = {
    version: 1,
    mode: proof ? "proof" : "production-artwork",
    sourceHash: digest,
    generatedAt: new Date().toISOString(),
    qr,
    print,
    full,
    placements: { front: slots("front"), back: slots("back") },
    artifacts,
    completePackage: all,
    colorSpace: "RGB; not PDF/X or CMYK",
    physicalRegistration: "requires printer calibration",
  };
  await fs.writeFile(
    path.join(out, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  console.log(`Exported ${artifacts.length} PDFs to ${out}`);
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
