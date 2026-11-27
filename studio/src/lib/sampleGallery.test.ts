import assert from "node:assert/strict";
import test from "node:test";
import { getSampleAtIndex, STUDIO_SAMPLE_SCREENSHOTS, stepSampleIndex } from "./sampleGallery";

test("STUDIO_SAMPLE_SCREENSHOTS contains 5 ordered AppAssets Studio samples with unique ids", () => {
  assert.equal(STUDIO_SAMPLE_SCREENSHOTS.length, 5);
  const ids = new Set(STUDIO_SAMPLE_SCREENSHOTS.map((item) => item.id));
  assert.equal(ids.size, 5);
  assert.deepEqual(
    STUDIO_SAMPLE_SCREENSHOTS.map((item) => item.orderLabel),
    ["01", "02", "03", "04", "05"],
  );
  for (const item of STUDIO_SAMPLE_SCREENSHOTS) {
    assert.ok(item.src.startsWith("/assets/aistudio/"));
    assert.ok(item.src.endsWith(".png"));
    assert.ok(item.title.length > 0);
  }
});

test("stepSampleIndex wraps cleanly across bounds and getSampleAtIndex resolves safely", () => {
  assert.equal(stepSampleIndex(0, -1, 5), 4);
  assert.equal(stepSampleIndex(4, 1, 5), 0);
  assert.equal(stepSampleIndex(2, 1, 5), 3);
  assert.equal(getSampleAtIndex(0).id, "smart-money-dashboard");
  assert.equal(getSampleAtIndex(2).id, "split-bill");
  assert.equal(getSampleAtIndex(-1).id, "borrow-and-lend");
});
