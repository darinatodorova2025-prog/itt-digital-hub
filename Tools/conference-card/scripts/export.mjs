import fs from "node:fs/promises";
import path from "node:path";
import { build, preview } from "vite";
import { chromium } from "playwright";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import {
  full,
  presets,
  backPoint,
  slots,
  cropSegments,
  MM,
  qrReady,
} from "../src/geometry.mjs";
import fontkit from "@pdf-lib/fontkit";
import { root, out, proof, preset, readJson, sourceHash, assertApprovedArtwork } from "./common.mjs";
const print = presets[preset];
const names = preset === "8up" ? {duplex:"conference-card-A4-8up-duplex-PRINT.pdf", registration:"conference-card-A4-8up-registration-proof.pdf", calibration:"conference-card-A4-8up-calibration.pdf"} : {duplex:"conference-card-A4-duplex.pdf", registration:"conference-card-A4-registration-proof.pdf", calibration:"conference-card-A4-calibration.pdf"};
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
await assertApprovedArtwork();
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
      // The approved individual PDFs are retained byte-for-byte and embedded at scale 1.
      // Fresh browser rendering still feeds layout/font/asset checks; the source lock
      // and raster comparison reject any change to the approved artwork.
      documents[side] = proof ? await doc.save() : await fs.readFile(path.join(root, "validation/approved", `${side}.pdf`));
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
    const embedded = {front: await doc.embedPdf(documents.front,[0]), back: await doc.embedPdf(documents.back,[0])};
    for (const side of ["front","back"]) {
      const p = doc.addPage([print.paper.width*MM,print.paper.height*MM]);
      for (const s of slots(side,print)) {
        p.drawPage(embedded[side][0], {
          x:(s.x+(s.rotation===180?s.width:0))*MM,
          y:(print.paper.height-s.y-s.height+(s.rotation===180?s.height:0))*MM,
          width:s.width*MM,height:s.height*MM,rotate:degrees(s.rotation),
        });
        for (const segment of cropSegments(s,print)) line(p,segment,print.crop.lineWidthPt);
      }
    }
    doc.setTitle(`ITT · A4 ${preset} duplex · ${print.duplex}`);
    doc.setSubject("Approved artwork; RGB digital print; actual size 100%; physical printer calibration required");
    const bytes=await doc.save();
    await fs.writeFile(path.join(out,names.duplex),bytes);artifacts.push(names.duplex);
    const numbered=await PDFDocument.load(bytes),font=await labelFont(numbered);
    for (const [pageIndex,side] of ["front","back"].entries()) {
      const p=numbered.getPage(pageIndex);
      for (const s of slots(side,print)) {
        const cx=(s.x+s.width/2)*MM,cy=(print.paper.height-s.y-s.height/2)*MM;
        p.drawRectangle({x:cx-24,y:cy-10,width:48,height:20,color:rgb(1,0.91,0.3)});
        p.drawText(`${side==='front'?'F':'B'}${s.id} ^`,{x:cx-18,y:cy-4,font,size:12,color:navy,rotate:degrees(s.rotation)});
        // Exact asymmetric fiducial: same physical point/arms through the paper.
        const f=slots('front',print).find(f=>f.id===s.id);
        const map=point=>side==='front'?point:backPoint(point,print);
        for (const [a,b] of [[[f.x+7,f.y+84],[f.x+13,f.y+84]],[[f.x+8,f.y+80],[f.x+8,f.y+86]],[[f.x+13,f.y+84],[f.x+11,f.y+82]]])
          line(p,[...map(a),...map(b)],0.7);
      }
      p.drawText(`PAIRING PROOF / ${side.toUpperCase()} / ${print.duplex} / 100%`,{x:10*MM,y:6*MM,font,size:6,color:navy});
    }
    await fs.writeFile(path.join(out,names.registration),await numbered.save());artifacts.push(names.registration);
  }
  if (makeCalibration) {
    const doc=await PDFDocument.create(),font=await labelFont(doc);
    const W=print.paper.width,H=print.paper.height;
    const targets=[{id:'A',x:22,y:29},{id:'B',x:W-27,y:41},{id:'C',x:31,y:H-26},{id:'D',x:W-39,y:H-38}];
    for (const side of ['front','back']) {
      const p=doc.addPage([W*MM,H*MM]);
      const transform=point=>side==='front'?point:backPoint(point,print);
      const mappedLine=(a,b,width)=>line(p,[...transform(a),...transform(b)],width);
      for (const t of targets) {
        mappedLine([t.x-4,t.y],[t.x+7,t.y],0.4);
        mappedLine([t.x,t.y-6],[t.x,t.y+3],0.4);
        mappedLine([t.x+7,t.y],[t.x+5,t.y-1.5],0.4);
        mappedLine([t.x+7,t.y],[t.x+5,t.y+1.5],0.4);
        for (const d of [-2,-1,1,2]) {
          mappedLine([t.x+d,t.y-0.8],[t.x+d,t.y+0.8],0.2);
          mappedLine([t.x-0.8,t.y+d],[t.x+0.8,t.y+d],0.2);
        }
        const [x,y]=transform([t.x+2,t.y+7]);
        p.drawText(`${t.id} / ${side.toUpperCase()}`,{x:x*MM,y:(H-y)*MM,font,size:9,color:navy});
      }
      for (const s of slots(side,print)) {
        for (const segment of cropSegments(s,print))line(p,segment,print.crop.lineWidthPt);
        p.drawRectangle({x:(s.x+print.bleed)*MM,y:(H-s.y-s.height+print.bleed)*MM,width:65*MM,height:90*MM,borderWidth:0.3,borderColor:navy});
      }
      p.drawText(`${side.toUpperCase()} / TOP ^ / ${print.duplex.toUpperCase()} / ACTUAL SIZE 100%`,{x:42*MM,y:(H-18)*MM,size:10,font,color:navy});
      p.drawText(`Back offsets: X ${print.backOffset.x} mm, Y ${print.backOffset.y} mm`,{x:42*MM,y:(H-23)*MM,size:8,font,color:navy});
      p.drawText('Hold against light. View from BACK. Compare A/B/C/D crosses.',{x:42*MM,y:(H/2+18)*MM,size:8,font,color:navy});
      p.drawText('Measure back-minus-front. Add X=-dx, Y=-dy to current offsets.',{x:42*MM,y:(H/2+13)*MM,size:8,font,color:navy});
      const x=(W-100)/2,y=H/2+15;
      line(p,[x,y,x+100,y],0.4);
      for(const xx of [x,x+100])line(p,[xx,y-2,xx,y+2],0.4);
      p.drawText('100 mm',{x:(W/2-8)*MM,y:(H-y-5)*MM,size:9,font,color:navy});
    }
    await fs.writeFile(path.join(out,names.calibration),await doc.save());artifacts.push(names.calibration);
  }
  const digest = await sourceHash();
  const manifest = {
    version: 1,
    mode: proof ? "proof" : "production-artwork",
    sourceHash: digest,
    generatedAt: new Date().toISOString(),
    qr,
    print,
    preset,
    names,
    full,
    placements: { front: slots("front",print), back: slots("back",print) },
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
