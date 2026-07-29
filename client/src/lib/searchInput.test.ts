import assert from "node:assert/strict";
import test from "node:test";
import { isSearchConfirmationKey } from "./searchInput";

test("accepts a completed Enter search action", () => {
  assert.equal(isSearchConfirmationKey({
    key: "Enter",
    isComposing: false,
    keyCode: 13,
  }), true);
});

test("ignores Enter while a Korean composition is active", () => {
  assert.equal(isSearchConfirmationKey({
    key: "Enter",
    isComposing: true,
    keyCode: 13,
  }), false);
  assert.equal(isSearchConfirmationKey({
    key: "Enter",
    isComposing: false,
    keyCode: 229,
  }), false);
});

test("ignores non-confirmation keys", () => {
  assert.equal(isSearchConfirmationKey({
    key: "Process",
    isComposing: false,
    keyCode: 229,
  }), false);
});
