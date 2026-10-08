import geometry from "../config/print.json" with { type: "json" };
export const MM = 72 / 25.4;
export const print = geometry;
export const full = {
  width: print.trim.width + 2 * print.bleed,
  height: print.trim.height + 2 * print.bleed,
};
/** Top-left mm coordinates. Back text is never mirrored; short-edge rotates 180°. */
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
      if (config.duplex === "long-edge") x = config.paper.width - x - w;
      else {
        y = config.paper.height - y - h;
        rotation = 180;
      }
      x += config.backOffset.x;
      y += config.backOffset.y;
    }
    return { id: i + 1, x, y, width: w, height: h, rotation };
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
  return lines;
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
