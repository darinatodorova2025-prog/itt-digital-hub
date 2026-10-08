# ITT Digital Hub · Conference card

Standalone editable React/TypeScript + Vite artwork and Chromium → pdf-lib print pipeline. This folder uses the repository's existing `Tools/` directory (macOS is case-insensitive). It has its own package and does not add website routes or change production code.

## Run

Node 22+ and npm are required. Dependencies are pinned in `package-lock.json`.

```bash
cd '/Users/ivan.todorov/Documents/Projects/Ivan/ITT Digital Hub website/Tools/conference-card'
npm ci
npx playwright install chromium
npm run dev
```

Open http://127.0.0.1:4176/. Front, back, both and A4 modes use the same `Card` components as the exporter. Guides are preview-only. The A4 view opens at 50%; select 100% to view its actual CSS physical size. A 100 mm ruler calibrates the current monitor at browser zoom 100%, stored locally. Recalibrate after moving to another monitor or changing browser zoom. This never changes the PDF.

## Complete print package

```bash
npm run print:package
```

This type-checks, runs geometry tests, rebuilds from current source, renders with Chromium at scale 1, adds exact PDF boxes, imposes both sheets, renders all pages at 300 dpi and runs preflight. Requires Poppler (`brew install poppler`) or the bundled Codex Poppler runtime. Optionally set `CONFERENCE_POPPLER_BIN` to a directory containing `pdftoppm`, `pdftotext`, `pdffonts`. Nothing is deployed.

| Command                      | Purpose                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| `npm run build`              | TypeScript check and Vite build                                |
| `npm test`                   | Geometry, duplex transforms, crop clearances, QR approval gate |
| `npm run export:individual`  | Both individual bleed PDFs                                     |
| `npm run export:duplex`      | A4 duplex and numbered registration proof                      |
| `npm run export:calibration` | Two-page printer calibration                                   |
| `npm run render`             | 300 dpi PNGs for exported PDF pages                            |
| `npm run preflight`          | Verify an existing complete package and its source hash        |
| `npm run print:package`      | Rebuild and verify the complete package                        |
| `npm run print:proof`        | Safe proof package while QR is pending; PROOF labels           |

Partial exports do not certify a complete package. Regenerate `print:package` before handoff. `output/print/` contains five PDFs, browser captures, 300 dpi page renders, `design-preview.png`, `manifest.json`, `preflight.json`, and `PREFLIGHT.md`. `output/proof/` is separate. `tmp/` is only for intermediate tooling. Outputs are ignored by Git and reproducible.

## Edit with Codex

| File                                    | Responsibility                                                                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components.tsx`                    | FrontCard, BackCard, BrandHeader, QRSection, ChallengeSteps, RewardSection, AssessmentQuestions, Conclusion, ContactFooter, Card, Sheet |
| `src/tokens.css`                        | Colors, headline sizes, QR size, panel radius, assessment row gap                                                                       |
| `src/card.css`                          | Physical artwork layout in mm and pt                                                                                                    |
| `src/main.tsx`, `src/preview.css`       | Preview controls and screen-only styling                                                                                                |
| `config/content.json`                   | Exact approved Bulgarian copy and optional verified phone                                                                               |
| `config/qr.json`                        | QR destination, independently confirmed URL, evidence, 4-module quiet zone                                                              |
| `config/print.json`, `src/geometry.mjs` | Trim, bleed, A4 slots, duplex transform, crop marks, printer offsets                                                                    |
| `scripts/export.mjs`                    | Chromium PDFs and vector imposition                                                                                                     |
| `scripts/preflight.mjs`                 | Artifact and layout validation                                                                                                          |
| `PRINT-INSTRUCTIONS.md`                 | Practical Bulgarian printing guidance                                                                                                   |

For example, “make the front headline 10% larger” changes `--front-heading`; “increase the QR” changes `--qr-size`; “reduce back row spacing” changes `.back-workbench .assessment li` padding; “change radius” changes `--panel-radius`. Larger elements may require redistributing space. The preflight rejects overflow, content overlap and safety violations. Preview refreshes immediately; after a visual change regenerate the package and visually inspect new PDF renders.

Both sides use one continuous navy gradient, native editable text and a real logo at the same position and size: 23 × 4.7917 mm at x/y 7 mm in bleed coordinates. The PNG's transparent top padding is compensated so the visible mark reaches the 4 mm safe boundary. Both headings are exactly 18 px (13.5 pt). The front retains the blank eyebrow row; its supporting line has been removed. A 23 mm QR sits beside the participation steps. The reward reads “TOP 3 идеи за автоматизиране” and “получават безплатен ИИ одит за организацията или лична консултация”, with the audit phrase in blue and semibold. Its body has 1.7 mm space above it. Only the website remains at the lowest safe front position.

The back has six outlined checkbox rows and a light blue interpretation panel. The invitation is a separate block below this panel. The instruction has been removed. Back contacts stack website, office email and phone, aligned left in muted color at 7.5 pt with regular weight. Body/questions/interpretation are 8 pt; invitation 8.5 pt. Trim remains 65 × 90 mm, bleed 3 mm and safety at least 4 mm, with the user-approved 3 mm bottom margin for back contacts. QR destination, PDF export and imposition are unchanged. The original reference raster is not used in final artwork.

## QR policy and assets

The destination was found in `scripts/mahni-dosadnoto-qr.ts`, `docs/mahni-dosadnoto/REHEARSAL.md`, and the functional `public/event/mahni-dosadnoto-qr.svg`, then checked live on 2026-10-08. The original asset is preserved as evidence. The generated vector QR encodes the exact same URL with a proper four-module quiet zone. Preflight independently decodes both the original QR and the final PDF, including all four A4 placements.

To replace the URL, edit `url`. This immediately disables production export until `confirmedUrl` is set to the same independently verified destination and `evidence` records the source. A pending URL shows a labeled development placeholder; `print:proof` remains available. Do not “confirm” an invented destination.

Official PNG lockups were copied without redrawing from `public/brand/`; effective logo resolution exceeds 600 dpi. The supplied kit TTFs failed Cyrillic coverage (actual browser glyph fallback to Helvetica). Only the tool copies were replaced by complete official IBM Plex Sans WOFF2 files from `@ibm/plex-sans@1.1.0`, npm shasum `44a45a8e269870221c431eb4e8023dca6ed21ceb`. The complete Regular WOFF2 was also losslessly converted to TrueType for pdf-lib labels; this avoids WOFF subset rendering defects in PDF readers. Its converted TTF is vendored; regeneration needs no Python dependency. License is in `public/assets/IBM-PLEX-LICENSE.txt`. Source: https://github.com/IBM/plex . Cards use `lang="bg"` and localized Bulgarian glyph forms. Runtime fonts are local; export needs no font network fetch.

## Geometry contract

65 × 90 mm trim, 3 mm bleed, 71 × 96 mm MediaBox/BleedBox, centered TrimBox. A4 210 × 297 mm; bleed-slot top-left positions are (27,44.5), (112,44.5), (27,156.5), (112,156.5) mm. Important artwork has at least 4 mm safety on both sides, except the approved 3 mm bottom margin for back contacts in `config/artwork.json`. The artwork CSS variable is captured in the export and independently checked against the 4 mm minimum. Crop marks are 4 mm long, 1 mm beyond bleed, 0.25 pt thick.

Coordinates are in top-left mm. Long-edge: `back.x = paper.width - front.x - full.width`, `back.y = front.y`. Short-edge: `back.y = paper.height - front.y - full.height`, `back.x = front.x`, artwork rotation 180°. Back offsets are added afterwards. Card graphics are never horizontally mirrored. All layouts and crop marks use this shared configuration. The proof IDs expose slot identity even when repeated artwork appears identical.

Chromium subpoint page rounding is normalized to exact boxes; a 0.12 mm vector extension at the outermost bleed edge uses computed artwork background colors to prevent thin white seams. Text/artwork scale remains 1. The PDF→PNG/browser comparison allows antialiasing differences; it does not replace human review. Geometric transform tolerance is 0.01 mm, distinct from printer registration.

## Release checks

`preflight.json` records the actual PDF boxes, text extraction, font embedding and real glyph fonts (no Cyrillic fallback), QR decoding, PDF placement matrices, crop clearance, safety, overlap, missing assets, and PDF/browser raster comparison. A source digest rejects stale exports. `VISUAL-REVIEW.md` records human visual review of the latest renders; repeat it after changes.

Digital preflight does not approve a physical print run. Use calibration, a numbered proof and one cut card. Output is RGB digital-print PDF, not CMYK, PDF/X or an ICC-certified press file. See `PRINT-INSTRUCTIONS.md`.
