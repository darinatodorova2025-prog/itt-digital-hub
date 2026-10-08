import test from "node:test";
import assert from "node:assert/strict";
import { slots, cropSegments, print, full, qrReady } from "../src/geometry.mjs";
const near = (a, b) =>
  assert.ok(Math.abs(a - b) <= print.geometryToleranceMm, `${a} != ${b}`);
test("true 65x90 trim with 3mm bleed and exact four slots", () => {
  assert.deepEqual(full, { width: 71, height: 96 });
  assert.deepEqual(print.trim, { width: 65, height: 90 });
  assert.equal(print.bleed, 3);
  assert.equal(slots().length, 4);
});
for (const duplex of ["long-edge", "short-edge"])
  test(`${duplex} front/back identities, orientation and offsets`, () => {
    const c = { ...print, duplex, backOffset: { x: 1.3, y: -0.7 } };
    const front = slots("front", c),
      back = slots("back", c);
    for (let i = 0; i < 4; i++) {
      const f = front[i],
        b = back[i];
      assert.equal(f.id, b.id);
      near(
        duplex === "long-edge"
          ? c.paper.width - (b.x - c.backOffset.x) - b.width
          : b.x - c.backOffset.x,
        f.x,
      );
      near(
        duplex === "short-edge"
          ? c.paper.height - (b.y - c.backOffset.y) - b.height
          : b.y - c.backOffset.y,
        f.y,
      );
      assert.equal(b.rotation, duplex === "long-edge" ? 0 : 180);
    }
  });
test("crop marks outside every artwork and sheet edges, no neighbouring bleed intersection", () => {
  for (const side of ["front", "back"])
    for (const s of slots(side))
      for (const [x1, y1, x2, y2] of cropSegments(s)) {
        assert.ok(
          Math.min(x1, x2) >= 0 &&
            Math.max(x1, x2) <= print.paper.width &&
            Math.min(y1, y2) >= 0 &&
            Math.max(y1, y2) <= print.paper.height,
        );
        for (const b of slots(side))
          assert.ok(
            Math.max(x1, x2) <= b.x ||
              Math.min(x1, x2) >= b.x + b.width ||
              Math.max(y1, y2) <= b.y ||
              Math.min(y1, y2) >= b.y + b.height,
            "crop mark intersects bleed",
          );
      }
});
test("a new QR URL invalidates production approval", () => {
  assert.equal(qrReady({ url: "", confirmedUrl: "", evidence: "none" }), false);
  assert.equal(
    qrReady({
      url: "https://example.org/new",
      confirmedUrl: "https://example.org/old",
      evidence: "verified",
    }),
    false,
  );
  assert.equal(
    qrReady({
      url: "http://example.org",
      confirmedUrl: "http://example.org",
      evidence: "verified",
    }),
    false,
  );
  assert.equal(
    qrReady({
      url: "https://example.org",
      confirmedUrl: "https://example.org",
      evidence: "verified",
    }),
    true,
  );
});
