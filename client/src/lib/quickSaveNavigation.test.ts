import assert from "node:assert/strict";
import test from "node:test";
import { navigateAfterSuccessfulQuickSave } from "./quickSaveNavigation";

test("replaces a successful QuickSave entry with Home", () => {
  const history = ["/external-share", "/quick-save?url=https%3A%2F%2Fexample.com"];

  navigateAfterSuccessfulQuickSave((path, options) => {
    if (options?.replace) history[history.length - 1] = path;
    else history.push(path);
  });

  assert.deepEqual(history, ["/external-share", "/"]);
  history.pop();
  assert.equal(history.at(-1), "/external-share");
});

test("does not alter history before a successful save", () => {
  const history = ["/", "/quick-save?shareId=share-123"];

  assert.deepEqual(history, ["/", "/quick-save?shareId=share-123"]);
});
