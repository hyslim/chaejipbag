import assert from "node:assert/strict";
import test from "node:test";
import { getRecentPokachips, type Fragment } from "./fragments";
import {
  FREQUENT_POKACHIP_THRESHOLD,
  getHistoryEvents,
} from "./history";

function fragment(
  id: string,
  createdAt: string,
  pokachips: string[],
  title = `조각 ${id}`
): Fragment {
  return {
    id,
    title,
    time: "",
    date: "",
    createdAt,
    updatedAt: createdAt,
    pokachips,
    thumbnailColor: "",
  };
}

test("recent search pokachips are normalized, unique, limited, and exclude temporary values", () => {
  const fragments = [
    fragment("old", "2026-07-01T09:00:00.000Z", ["오래된"]),
    fragment("new", "2026-07-12T09:00:00.000Z", [" 최신 ", "#중복", "임시조각", ""]),
    fragment("middle", "2026-07-11T09:00:00.000Z", ["중복", "다음", "셋째", "넷째", "다섯째", "여섯째", "일곱째", "여덟째", "아홉째"]),
  ];

  assert.deepEqual(
    getRecentPokachips(fragments, {
      limit: 8,
      exclude: ["임시조각"],
      includeFallback: false,
    }),
    ["최신", "중복", "다음", "셋째", "넷째", "다섯째", "여섯째", "일곱째"]
  );
});

test("history creates one normalized first appearance and excludes temporary events", () => {
  const events = getHistoryEvents([
    fragment("1", "2026-07-01T09:00:00.000Z", ["임시조각", " 태그 "]),
    fragment("2", "2026-07-01T10:00:00.000Z", ["#태그", "임시조각"]),
    fragment("3", "2026-07-02T09:00:00.000Z", ["태그"]),
  ]);

  assert.equal(events.filter((event) => event.kind === "first" && event.chips[0] === "태그").length, 1);
  assert.equal(events.some((event) => event.chips.includes("임시조각")), false);
  assert.equal(events.filter((event) => event.kind === "again").length, 1);
});

test("history deduplicates combinations regardless of order or repeated chips", () => {
  const events = getHistoryEvents([
    fragment("1", "2026-07-01T09:00:00.000Z", ["가", "나", "가"]),
    fragment("2", "2026-07-02T09:00:00.000Z", ["#나", " 가 "]),
  ]);

  const together = events.filter((event) => event.kind === "together");
  assert.equal(together.length, 1);
  assert.deepEqual(together[0].chips, ["가", "나"]);
});

test("history emits the frequent threshold once and ignores duplicate fragment ids", () => {
  const fragments = Array.from({ length: FREQUENT_POKACHIP_THRESHOLD + 2 }, (_, index) =>
    fragment(`${index}`, `2026-07-${String(index + 1).padStart(2, "0")}T09:00:00.000Z`, ["반복"])
  );
  fragments.push({ ...fragments[0] });

  const frequent = getHistoryEvents(fragments).filter((event) => event.kind === "frequent");
  assert.equal(frequent.length, 1);
  assert.equal(frequent[0].fragment.id, String(FREQUENT_POKACHIP_THRESHOLD - 1));
});

test("reappearance is generated once per later day, not for same-day consecutive saves", () => {
  const events = getHistoryEvents([
    fragment("1", "2026-06-01T09:00:00.000Z", ["재등장"]),
    fragment("2", "2026-06-01T10:00:00.000Z", ["재등장"]),
    fragment("3", "2026-07-12T09:00:00.000Z", ["재등장"]),
    fragment("4", "2026-07-12T10:00:00.000Z", ["재등장"]),
  ]);

  assert.equal(events.filter((event) => event.kind === "again").length, 1);
});

test("replacing fragments with the same restored backup leaves derived history unchanged", () => {
  const backupFragments = [
    fragment("1", "2026-07-01T09:00:00.000Z", ["복원", "짝"]),
    fragment("2", "2026-07-10T09:00:00.000Z", ["#복원"]),
    fragment("3", "2026-07-20T09:00:00.000Z", ["복원"]),
  ];
  const firstRestore = getHistoryEvents(backupFragments);
  const repeatedRestore = getHistoryEvents(JSON.parse(JSON.stringify(backupFragments)) as Fragment[]);

  assert.deepEqual(repeatedRestore, firstRestore);
});
