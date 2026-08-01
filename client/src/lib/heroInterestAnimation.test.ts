import assert from "node:assert/strict";
import test from "node:test";
import { getHeroInterestAnimationKeys } from "./heroInterestAnimation";

test("animates every card when the Hero section first appears", () => {
  const keys = getHeroInterestAnimationKeys(
    [
      { key: "web" },
      { key: "home" },
      { key: "food" },
    ],
    new Set(),
    false
  );

  assert.deepEqual([...keys], ["web", "home", "food"]);
});

test("animates only a card that newly enters the Top 6", () => {
  const keys = getHeroInterestAnimationKeys(
    [
      { key: "web" },
      { key: "home" },
      { key: "food" },
    ],
    new Set(["web", "home"]),
    true
  );

  assert.deepEqual([...keys], ["food"]);
});

test("does not replay for unchanged counts or ordinary rerenders", () => {
  const keys = getHeroInterestAnimationKeys(
    [
      { key: "web" },
      { key: "home" },
      { key: "food" },
    ],
    new Set(["food", "web", "home"]),
    true
  );

  assert.equal(keys.size, 0);
});

test("does not treat a Top 6 order change as a new entry", () => {
  const keys = getHeroInterestAnimationKeys(
    [{ key: "food" }, { key: "web" }, { key: "home" }],
    new Set(["web", "home", "food"]),
    true
  );

  assert.equal(keys.size, 0);
});

test("keeps a newly entered card pending until animation completion", () => {
  const keys = getHeroInterestAnimationKeys(
    [{ key: "web" }, { key: "home" }, { key: "food" }],
    new Set(["web", "home", "food"]),
    true,
    new Set(["food"])
  );

  assert.deepEqual([...keys], ["food"]);
});
