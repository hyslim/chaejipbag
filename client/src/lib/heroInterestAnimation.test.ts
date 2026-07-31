import assert from "node:assert/strict";
import test from "node:test";
import { getHeroInterestAnimationKeys } from "./heroInterestAnimation";

test("animates every card when the Hero section first appears", () => {
  const keys = getHeroInterestAnimationKeys(
    [
      { key: "web", count: 8 },
      { key: "home", count: 6 },
      { key: "food", count: 5 },
    ],
    new Map([
      ["web", 8],
      ["home", 6],
      ["food", 4],
    ]),
    false
  );

  assert.deepEqual([...keys], ["web", "home", "food"]);
});

test("animates only a card that newly reaches five uses", () => {
  const keys = getHeroInterestAnimationKeys(
    [
      { key: "web", count: 9 },
      { key: "home", count: 7 },
      { key: "food", count: 5 },
    ],
    new Map([
      ["web", 8],
      ["home", 7],
      ["food", 4],
    ]),
    true
  );

  assert.deepEqual([...keys], ["food"]);
});

test("does not replay for unchanged counts or ordinary rerenders", () => {
  const keys = getHeroInterestAnimationKeys(
    [
      { key: "web", count: 9 },
      { key: "home", count: 7 },
      { key: "food", count: 5 },
    ],
    new Map([
      ["web", 9],
      ["home", 7],
      ["food", 5],
    ]),
    true
  );

  assert.equal(keys.size, 0);
});
