import assert from "node:assert/strict";
import test from "node:test";
import { getShowcaseCategory, SHOWCASE_CATEGORIES } from "./showcaseCategories";

test("showcase categories provide 5 unique categories with 3 slides each", () => {
  assert.equal(SHOWCASE_CATEGORIES.length, 5);
  const ids = new Set(SHOWCASE_CATEGORIES.map((c) => c.id));
  assert.equal(ids.size, 5);

  for (const cat of SHOWCASE_CATEGORIES) {
    assert.equal(cat.slides.length, 3, `${cat.id} should define 3 App Store slides`);
    assert.equal(cat.palette.length, 3, `${cat.id} should define 3 palette swatches`);
    for (const hex of cat.palette) {
      assert.match(hex, /^#[0-9A-Fa-f]{6}$/, `invalid hex ${hex} in ${cat.id}`);
    }
    assert.ok(cat.title.length > 0);
    assert.ok(cat.presetId.length > 0);
  }
});

test("getShowcaseCategory resolves known ids and falls back safely", () => {
  assert.equal(getShowcaseCategory("fintech").title, "Smart Portfolio");
  assert.equal(getShowcaseCategory("productivity").tileTone, "light");
  assert.equal(getShowcaseCategory("unknown-id").id, SHOWCASE_CATEGORIES[0]!.id);
});
