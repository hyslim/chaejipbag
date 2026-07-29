import {
  getFallbackCreatedAt,
  getPokachipKey,
  getUniquePokachips,
  type Fragment,
} from "./fragments";

export type HistoryEventKind = "first" | "together" | "frequent" | "again";

export type HistoryEvent = {
  id: string;
  kind: HistoryEventKind;
  occurredAt: string;
  fragment: Fragment;
  chips: string[];
  text: string;
};

export const FREQUENT_POKACHIP_THRESHOLD = 3;

const temporaryPokachipKey = getPokachipKey("임시조각");

function getCreatedAt(fragment: Fragment, index: number): string {
  const createdAtTime = Date.parse(fragment.createdAt ?? "");
  if (Number.isFinite(createdAtTime)) return new Date(createdAtTime).toISOString();

  const dateParts = fragment.date.match(/\d+/g)?.map(Number);
  if (dateParts && dateParts.length >= 3) {
    const [year, month, day] = dateParts;
    return new Date(year, month - 1, day).toISOString();
  }

  return getFallbackCreatedAt(fragment, index);
}

function getLocalDayKey(isoDate: string): string {
  const date = new Date(isoDate);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function getHistoryEvents(fragments: Fragment[]): HistoryEvent[] {
  const fragmentIds = new Set<string>();
  const uniqueFragments = fragments.filter((fragment) => {
    if (fragmentIds.has(fragment.id)) return false;
    fragmentIds.add(fragment.id);
    return true;
  });
  const fragmentOrder = new Map(uniqueFragments.map((fragment, index) => [fragment.id, index]));
  const chronologicalFragments = [...uniqueFragments].sort((a, b) =>
    Date.parse(getCreatedAt(a, fragmentOrder.get(a.id) ?? 0))
    - Date.parse(getCreatedAt(b, fragmentOrder.get(b.id) ?? 0))
  );
  const firstSeen = new Set<string>();
  const lastSeenDay = new Map<string, string>();
  const usageCounts = new Map<string, number>();
  const togetherKeys = new Set<string>();
  const againKeys = new Set<string>();
  const events: HistoryEvent[] = [];

  for (const fragment of chronologicalFragments) {
    const occurredAt = getCreatedAt(fragment, fragmentOrder.get(fragment.id) ?? 0);
    const dayKey = getLocalDayKey(occurredAt);
    const chips = getUniquePokachips(fragment.pokachips ?? [])
      .filter((chip) => getPokachipKey(chip) !== temporaryPokachipKey);

    for (const chip of chips) {
      const chipKey = getPokachipKey(chip);
      const previousDay = lastSeenDay.get(chipKey);

      if (!firstSeen.has(chipKey)) {
        firstSeen.add(chipKey);
        events.push({
          id: `first:${chipKey}`,
          kind: "first",
          occurredAt,
          fragment,
          chips: [chip],
          text: `${chip} 조각이 처음 나타났어요`,
        });
      } else if (previousDay && previousDay !== dayKey) {
        const eventKey = `${chipKey}:${dayKey}`;
        if (!againKeys.has(eventKey)) {
          againKeys.add(eventKey);
          events.push({
            id: `again:${eventKey}`,
            kind: "again",
            occurredAt,
            fragment,
            chips: [chip],
            text: `${chip} 조각이 다시 나타났어요`,
          });
        }
      }

      const nextCount = (usageCounts.get(chipKey) ?? 0) + 1;
      usageCounts.set(chipKey, nextCount);
      if (nextCount === FREQUENT_POKACHIP_THRESHOLD) {
        events.push({
          id: `frequent:${chipKey}:${FREQUENT_POKACHIP_THRESHOLD}`,
          kind: "frequent",
          occurredAt,
          fragment,
          chips: [chip],
          text: `${chip} 조각을 자주 사용하고 있어요`,
        });
      }

      lastSeenDay.set(chipKey, dayKey);
    }

    if (chips.length > 1) {
      const combinationKey = chips.map(getPokachipKey).sort().join("|");
      if (!togetherKeys.has(combinationKey)) {
        togetherKeys.add(combinationKey);
        events.push({
          id: `together:${combinationKey}`,
          kind: "together",
          occurredAt,
          fragment,
          chips,
          text: `${chips.join(", ")} 조각이 함께 나타났어요`,
        });
      }
    }
  }

  return events.sort((a, b) =>
    Date.parse(b.occurredAt) - Date.parse(a.occurredAt)
    || a.id.localeCompare(b.id, "ko-KR")
  );
}
