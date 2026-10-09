import geometry from "../config/print.json" with { type: "json" };
import fourUp from "../config/print-4up.json" with { type: "json" };
export const MM = 72 / 25.4;
export const print = geometry;
export const presets = { "8up": print, "4up": fourUp };
/** The physical hinge is vertical for landscape short-edge / portrait long-edge. */
export function duplexAxis(config = print) {
  const landscape = config.paper.width > config.paper.height;
  return (config.duplex === "short-edge") === landscape ? "x" : "y";
}
export function backPoint([x, y], config = print) {
  return [
    (duplexAxis(config) === "x" ? config.paper.width - x : x) + config.backOffset.x,
    (duplexAxis(config) === "y" ? config.paper.height - y : y) + config.backOffset.y,
  ];
}
export const full = {
  width: print.trim.width + 2 * print.bleed,
  height: print.trim.height + 2 * print.bleed,
};
/** Top-left mm coordinates. Flip position across the hinge; artwork never mirrors. */
export function slots(side = "front", config = print) {
  const w = config.trim.width + 2 * config.bleed,
    h = config.trim.height + 2 * config.bleed;
  const totalW = config.columns * w + (config.columns - 1) * config.gutter.x;
  const totalH = config.rows * h + (config.rows - 1) * config.gutter.y;
  const x0 = (config.paper.width - totalW) / 2,
    y0 = (config.paper.height - totalH) / 2;
  return Array.from({ length: config.rows * config.columns }, (_, i) => {
    let x = x0 + (i % config.columns) * (w + config.gutter.x);
    let y = y0 + Math.floor(i / config.columns) * (h + config.gutter.y);
    let rotation = 0;
    if (side === "back") {
      if (duplexAxis(config) === "x") x = config.paper.width - x - w;
      else {
        y = config.paper.height - y - h;
        rotation = 180;
      }
      x += config.backOffset.x;
      y += config.backOffset.y;
    }
    return { id: i + 1, x, y, width: w, height: h, rotation, side };
  });
}
export function cropSegments(slot, config = print) {
  const b = config.bleed,
    g = config.crop.gap,
    l = config.crop.length;
  const left = slot.x + b,
    right = left + config.trim.width,
    top = slot.y + b,
    bottom = top + config.trim.height;
  const lines = [];
  for (const x of [left, right]) {
    lines.push([x, slot.y - g - l, x, slot.y - g]);
    lines.push([x, slot.y + slot.height + g, x, slot.y + slot.height + g + l]);
  }
  for (const y of [top, bottom]) {
    lines.push([slot.x - g - l, y, slot.x - g, y]);
    lines.push([slot.x + slot.width + g, y, slot.x + slot.width + g + l, y]);
  }
  // Only perimeter/gutter marks that clear EVERY bleed footprint are retained.
  // Touching 8-up footprints leave no space for internal marks.
  const all = slots(slot.side || "front", config);
  return lines.filter(([x1, y1, x2, y2]) =>
    Math.min(x1, x2) >= 0 && Math.max(x1, x2) <= config.paper.width &&
    Math.min(y1, y2) >= 0 && Math.max(y1, y2) <= config.paper.height &&
    all.every(b => Math.max(x1, x2) <= b.x || Math.min(x1, x2) >= b.x + b.width ||
      Math.max(y1, y2) <= b.y || Math.min(y1, y2) >= b.y + b.height));
}
export function qrReady(config) {
  try {
    return (
      new URL(config.url).protocol === "https:" &&
      config.url === config.confirmedUrl &&
      !!config.evidence
    );
  } catch {
    return false;
  }
}
