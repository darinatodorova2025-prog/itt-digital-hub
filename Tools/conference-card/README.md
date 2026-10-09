# ITT Digital Hub conference card · final print production

Standalone React/TypeScript + Vite preview and Chromium/pdf-lib print tooling. This tool does not modify production website routes or deploy anything.

## Run and export

```bash
npm ci
npm run dev
# http://127.0.0.1:4176/
npm run print:package
```

The default browser view is **A4 landscape, 4 × 2 cards, short-edge duplex** at 40% screen zoom: page 1 fronts, page 2 backs. Individual front/back/both views, preview-only bleed/trim/safety guides and numbered proof remain available. The alternative **4-up portrait / long-edge** preset has its own selector.

`npm run print:package` type-checks, tests, exports five PDFs, renders every page at 300 dpi and runs digital preflight. Node 22+, Playwright Chromium and Poppler are required; all artwork fonts/assets are local. Poppler uses the Codex bundled runtime, system PATH or `CONFERENCE_POPPLER_BIN`.

| Command | Result |
| --- | --- |
| `npm run print:package` | Verified 8-up package in `output/print/` |
| `npm run print:4up` | Verified alternative 4-up package in `output/4up/` |
| `npm run export:individual` | Preserved individual PDFs |
| `npm run export:duplex` | Production master + numbered registration proof |
| `npm run export:calibration` | Two-page calibration sheet |
| `npm run render` | 300 dpi renders for current default manifest |
| `npm run preflight` | Verify complete 8-up package and current source hash |
| `npm run build` / `npm test` | TypeScript/Vite build / geometry tests |

8-up outputs:

- `conference-card-A4-8up-duplex-PRINT.pdf`: exactly two 297 × 210 mm pages, eight cards each, no proof overlays.
- `conference-card-A4-8up-registration-proof.pdf`: all F1/B1 through F8/B8, asymmetric through-paper fiducials; test only.
- `conference-card-A4-8up-calibration.pdf`: asymmetric A–D crosses, trim outlines, 100 mm ruler; test only.
- Existing individual `conference-card-front.pdf` and `conference-card-back.pdf`: retained byte-for-byte, 71 × 96 mm MediaBox/BleedBox with 65 × 90 mm TrimBox.

## Approved artwork preservation

The user approved and locked both designs on 2026-10-08. `src/card.css`, `src/tokens.css`, content, QR, logo/font assets and Card components remain unchanged. The approved individual PDFs and their 300 dpi renders are retained in `validation/approved/`. The exporter embeds those native/vector PDFs at scale 1; it never rasterizes or resizes the cards. Browser and layout/font checks still render the editable Card source.

`validation/approved/source-lock.json` records the approved source and PDF hashes. Preflight rejects source drift, changed individual PDF bytes, changed individual renders, scaled placement matrices and imposed artwork that differs from the approved renders. Any later artwork edit requires a new user-approved baseline; do not silently refresh this lock during print-production work.

The 4 mm safety and approved 3 mm bottom-contact exception are retained. The final questions have checkbox/divider only; no enclosing row outlines. The front has four participation steps, ending in “Спечели”; the sixth back question is “Има ли чести грешки?”.

## Geometry and duplex contract

Trim 65 × 90 mm, bleed 3 mm, full artwork 71 × 96 mm. `config/print.json` defaults to A4 297 × 210 mm, 4 columns × 2 rows, zero gutter, short-edge, X/Y back offsets. `config/print-4up.json` retains A4 210 × 297 mm, 2 × 2, 14/16 mm gutters, long-edge.

8-up bleed origins are X **6.5, 77.5, 148.5, 219.5** and Y **9, 105** mm. Footprints occupy 284 × 192 mm; no overlaps or internal marks. Only external trim ticks are drawn, 1 mm long, 0.5 mm beyond bleed, 0.25 pt. Minimum guide-to-paper clearance is 5 mm.

`src/geometry.mjs` chooses the actual physical hinge from paper orientation plus duplex mode. A vertical hinge (landscape short-edge / portrait long-edge) maps `back.x = W − front.x − 71`, leaves Y unchanged and keeps artwork upright. A horizontal hinge (landscape long-edge / portrait short-edge) maps `back.y = H − front.y − 96`, leaves X unchanged and rotates artwork 180°. The actual logo/text is never mirrored. X/Y offsets apply afterwards to backs and their trim guides only.

For the default, front row identities 1 2 3 4 / 5 6 7 8 correspond to back sheet order 4 3 2 1 / 8 7 6 5. Tests independently model the physical hinge, all identities and asymmetric markers. PDF checks inspect real translation/rotation/scale matrices, actual crop coordinates and overlays; proof labels and fiducials use the same placement identity.

## Release validation and limits

`preflight.json` / `PREFLIGHT.md` record PDF page boxes, number of cards, source preservation, embedded fonts/Unicode and actual browser glyph fonts, text completeness, artwork ranges/safety, bleed, crop clearance/coverage, front/back registration, all eight QR scans and comparisons of all 16 imposed cards against approved individual renders. `VISUAL-REVIEW.md` records inspection of the actual high-resolution pages.

Output is RGB digital-print PDF, without CMYK, PDF/X or ICC certification. Digital geometry tolerance is 0.01 mm; physical duplex registration remains printer-dependent. First use calibration, then all eight numbered pairs, then one cut card on the actual stock. **19 duplex copies = 152 finished cards before waste.** Printer margins must permit the 5 mm guide boundary at 100%; otherwise use a print shop/larger carrier or the 4-up preset. See Bulgarian `PRINT-INSTRUCTIONS.md` for exact settings and cut coordinates.
