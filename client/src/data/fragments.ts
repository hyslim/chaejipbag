export type FragmentAttachmentKind = "image" | "audio" | "video" | "pdf";

export interface FragmentAttachment {
  id: string;
  kind: FragmentAttachmentKind;
  blobKey: string;
  mimeType: string;
  filename?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  createdAt: string;
}

export const MAX_FRAGMENT_IMAGE_ATTACHMENTS = 5;

export interface Fragment {
  id: string;
  title: string;
  source?: string;
  sourceType?: "link" | "text" | "youtube";
  memo?: string;
  url?: string;
  time: string;
  date: string;
  createdAt?: string;
  updatedAt?: string;
  pinnedAt?: string;
  pokachips: string[];
  thumbnailColor: string;
  /** @deprecated Legacy single-image pointer. New writes use attachments. */
  imageKey?: string;
  /** @deprecated Legacy/back-up inline image. New writes use attachments. */
  imageDataUrl?: string;
  attachments?: FragmentAttachment[];
}

export const pokachipColorTokens = [
  {
    name: "lavender",
    background: "#E8E3F7",
    text: "#726A84",
    border: "#DFD8F1",
    heroGradient: ["#EDE9FA", "#DAD0F1", "#CCC0E8"],
  },
  {
    name: "coral-pink",
    background: "#F7D9DD",
    text: "#86676D",
    border: "#F1D0D4",
    heroGradient: ["#FAE2E5", "#EFC4CB", "#E5B2BA"],
  },
  {
    name: "butter-yellow",
    background: "#F7EAC1",
    text: "#80734E",
    border: "#F0E1B0",
    heroGradient: ["#FAF1D1", "#F1DF9E", "#E6CF85"],
  },
  {
    name: "apricot",
    background: "#F6D9C1",
    text: "#856853",
    border: "#EFCDAF",
    heroGradient: ["#FAE4D2", "#EFC49E", "#E4AE85"],
  },
  {
    name: "mint",
    background: "#DCEFE7",
    text: "#607B73",
    border: "#CDE7DC",
    heroGradient: ["#E5F4EE", "#C8E4D9", "#AED5C6"],
  },
  {
    name: "sage",
    background: "#E2E9D0",
    text: "#6F785F",
    border: "#D7E0BF",
    heroGradient: ["#EBEFD9", "#D2DCB3", "#BCCB96"],
  },
  {
    name: "sky-blue",
    background: "#DAECF4",
    text: "#5F7782",
    border: "#CBE3ED",
    heroGradient: ["#E7F3F8", "#C8E1ED", "#A9D0E1"],
  },
  {
    name: "blue-gray",
    background: "#DFE7EE",
    text: "#647381",
    border: "#D1DCE5",
    heroGradient: ["#E8EEF3", "#CDD9E4", "#B4C7D6"],
  },
  {
    name: "rose-brown",
    background: "#ECDAD4",
    text: "#806B65",
    border: "#E3CEC8",
    heroGradient: ["#F3E4E0", "#E0C7BF", "#D1ADA4"],
  },
  {
    name: "neutral-beige",
    background: "#EFE8DE",
    text: "#7A7267",
    border: "#E3DBCE",
    heroGradient: ["#F5F0E8", "#E4D9CB", "#D2C4B0"],
  },
] as const;

export type PokachipColorToken = (typeof pokachipColorTokens)[number];
export type PokachipColorTokenName = PokachipColorToken["name"];

export const pokachipColorMap: Record<string, PokachipColorTokenName> = {
  글쓰기: "coral-pink",
  수조: "sky-blue",
  조명: "butter-yellow",
  웹앱: "lavender",
  블렌더: "sky-blue",
  사진: "sage",
  유리: "blue-gray",
  파랑: "sky-blue",
  임시조각: "neutral-beige",
};

export const temporaryPokachipColor = "rgba(120,112,100,0.18)";

export function normalizePokachipName(value: string): string {
  return value
    .trim()
    .replace(/^(?:[+#-]\s*)+/, "")
    .replace(/(?:\s*[+×])+$/, "")
    .trim();
}

export function getCleanPokachipName(value: string): string {
  const normalized = normalizePokachipName(value);
  return normalized && normalized !== "추가" ? normalized : "";
}

export function getPokachipKey(value: string): string {
  return getCleanPokachipName(value)
    .replace(/\s+/g, "")
    .toLocaleLowerCase("ko-KR");
}

export function getPokachipsInDisplayOrder(values: string[], selectedChip?: string | null): string[] {
  const normalized = values.map(normalizePokachipName).filter(Boolean);
  const selectedKey = getPokachipKey(selectedChip ?? "");
  if (!selectedKey) return normalized;

  const selectedIndex = normalized.findIndex((chip) => getPokachipKey(chip) === selectedKey);
  if (selectedIndex <= 0) return normalized;

  return [
    normalized[selectedIndex],
    ...normalized.slice(0, selectedIndex),
    ...normalized.slice(selectedIndex + 1),
  ];
}

const fnv1aOffsetBasis = 0x811c9dc5;
const fnv1aPrime = 0x01000193;

export function getPokachipHash(value: string): number {
  const key = getPokachipKey(value);
  let hash = fnv1aOffsetBasis;

  for (const byte of new TextEncoder().encode(key)) {
    hash ^= byte;
    hash = Math.imul(hash, fnv1aPrime) >>> 0;
  }

  return hash;
}

export function getPokachipColorIndex(value: string): number {
  const key = getPokachipKey(value);
  const mappedTokenName = Object.entries(pokachipColorMap).find(
    ([label]) => getPokachipKey(label) === key
  )?.[1];
  if (mappedTokenName) {
    return pokachipColorTokens.findIndex(({ name }) => name === mappedTokenName);
  }

  return getPokachipHash(key) % pokachipColorTokens.length;
}

export function getPokachipColorToken(value: string): PokachipColorToken {
  return pokachipColorTokens[getPokachipColorIndex(value)];
}

export function getPokachipColor(value: string): string {
  return getPokachipColorToken(value).background;
}

export function getColorWithAlpha(color: string, alpha: number): string {
  const rgbaMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbaMatch) {
    const [, red, green, blue] = rgbaMatch;
    return `rgba(${red},${green},${blue},${alpha})`;
  }

  const hexMatch = color.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);
    return `rgba(${red},${green},${blue},${alpha})`;
  }

  return color;
}
const stableFallbackCreatedAtBase = Date.UTC(2026, 0, 1, 9, 0, 0);

function getStableFragmentOffset(fragment: Fragment, index: number): number {
  const timestampId = fragment.id.match(/^\d{12,}/)?.[0];
  if (timestampId) return Number(timestampId);

  let hash = 0;
  for (const character of fragment.id || `${index}`) {
    hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  }

  return hash + index;
}

export function getFallbackCreatedAt(fragment: Fragment, index = 0): string {
  const dateParts = fragment.date.match(/\d+/g)?.map(Number);

  if (dateParts && dateParts.length >= 3) {
    const [year, month, day] = dateParts;
    return new Date(Date.UTC(year, month - 1, day, 9, 0, 0) - index).toISOString();
  }

  const stableOffset = getStableFragmentOffset(fragment, index) % (365 * 86400000);
  return new Date(stableFallbackCreatedAtBase - stableOffset).toISOString();
}

export function getFragmentReferenceAt(fragment: Fragment, index = 0): string {
  const createdAtTime = Date.parse(fragment.createdAt ?? "");
  if (Number.isFinite(createdAtTime)) return new Date(createdAtTime).toISOString();

  const updatedAtTime = Date.parse(fragment.updatedAt ?? "");
  if (Number.isFinite(updatedAtTime)) return new Date(updatedAtTime).toISOString();

  return getFallbackCreatedAt(fragment, index);
}


export function getFragmentDisplayTime(fragment: Fragment, now = new Date()): string {
  const referenceAt = new Date(getFragmentReferenceAt(fragment));
  const elapsedMs = Math.max(0, now.getTime() - referenceAt.getTime());
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const elapsedHours = Math.floor(elapsedMs / 3600000);
  const elapsedDays = Math.floor(elapsedMs / 86400000);

  if (elapsedMinutes < 1) return "\uBC29\uAE08";
  if (elapsedMinutes < 60) return `${elapsedMinutes}\uBD84 \uC804`;
  if (elapsedHours < 24) return `${elapsedHours}\uC2DC\uAC04 \uC804`;
  if (elapsedHours < 48) return "\uC5B4\uC81C";
  if (elapsedDays < 7) return `${elapsedDays}\uC77C \uC804`;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(referenceAt);
}

const attachmentKinds = new Set<FragmentAttachmentKind>(["image", "audio", "video", "pdf"]);

const isSupportedAttachment = (value: unknown): value is FragmentAttachment => {
  if (!value || typeof value !== "object") return false;
  const attachment = value as Partial<FragmentAttachment>;
  return typeof attachment.id === "string"
    && attachmentKinds.has(attachment.kind as FragmentAttachmentKind)
    && typeof attachment.blobKey === "string"
    && typeof attachment.mimeType === "string"
    && typeof attachment.createdAt === "string";
};

const getNormalizedAttachments = (
  fragment: Pick<Fragment, "attachments" | "imageKey" | "createdAt" | "updatedAt">
): FragmentAttachment[] => {
  let imageCount = 0;
  const attachments = (fragment.attachments ?? [])
    .filter(isSupportedAttachment)
    .filter((attachment) => attachment.kind !== "image" || imageCount++ < MAX_FRAGMENT_IMAGE_ATTACHMENTS);

  if (attachments.some((attachment) => attachment.kind === "image") || !fragment.imageKey) {
    return attachments;
  }

  return [...attachments, {
    id: `legacy-${fragment.imageKey}`,
    kind: "image",
    blobKey: fragment.imageKey,
    mimeType: "image/*",
    createdAt: fragment.createdAt ?? fragment.updatedAt ?? new Date(0).toISOString(),
  }];
};

export function getFragmentImageAttachments(
  fragment?: Pick<Fragment, "attachments" | "imageKey" | "createdAt" | "updatedAt">
): FragmentAttachment[] {
  if (!fragment) return [];
  return getNormalizedAttachments(fragment).filter((attachment) => attachment.kind === "image");
}

export function getFragmentImageCount(
  fragment?: Pick<Fragment, "attachments" | "imageKey" | "imageDataUrl" | "createdAt" | "updatedAt">
): number {
  const attachmentCount = getFragmentImageAttachments(fragment).length;
  return attachmentCount || (fragment?.imageDataUrl ? 1 : 0);
}

export function normalizeFragmentTimestamps(fragment: Fragment, index = 0): Fragment {
  const createdAtTime = Date.parse(fragment.createdAt ?? "");
  const updatedAtTime = Date.parse(fragment.updatedAt ?? "");
  const createdAt = Number.isFinite(createdAtTime)
    ? new Date(createdAtTime).toISOString()
    : getFallbackCreatedAt(fragment, index);
  const attachments = getNormalizedAttachments({
    ...fragment,
    createdAt,
  });

  return {
    ...fragment,
    createdAt,
    ...(attachments.length > 0 ? { attachments } : {}),
    ...(Number.isFinite(updatedAtTime) ? { updatedAt: new Date(updatedAtTime).toISOString() } : {}),
  };
}

export const homeInterestPokachips = ["웹앱", "인테리어", "수조", "루틴", "조명", "요리"];
export const fallbackRecentPokachips = ["글쓰기", "수조", "조명", "웹앱", "블렌더"];

export function parsePokachipInput(value: string): string[] {
  return value
    .split(",")
    .map(getCleanPokachipName)
    .filter(Boolean);
}

export function getUniquePokachips(values: string[]): string[] {
  const keys = new Set<string>();
  const chips: string[] = [];

  for (const value of values) {
    const normalized = getCleanPokachipName(value);
    const key = getPokachipKey(normalized);
    if (key && !keys.has(key)) {
      keys.add(key);
      chips.push(normalized);
    }
  }

  return chips;
}

export function mergePokachips(current: string[], additions: string[]): string[] {
  return getUniquePokachips([...current, ...additions]);
}

export function normalizeSavedPokachips(values: string[]): string[] {
  const normalized = getUniquePokachips(values);
  const actualPokachips = normalized.filter((value) =>
    getPokachipKey(value) !== "임시조각"
  );

  return actualPokachips.length > 0 ? actualPokachips : ["임시조각"];
}

function collectPokachips(values: string[], excludeSet: Set<string>, chipKeys: Set<string>, chips: string[]) {
  for (const chip of values) {
    const normalized = getCleanPokachipName(chip);
    const key = getPokachipKey(normalized);
    if (key && !excludeSet.has(key) && !chipKeys.has(key)) {
      chipKeys.add(key);
      chips.push(normalized);
    }
  }
}

export function getRecentPokachips(
  fragments: Fragment[],
  options: { limit?: number; exclude?: string[]; includeFallback?: boolean } = {}
): string[] {
  const excludeSet = new Set((options.exclude ?? []).map(getPokachipKey).filter(Boolean));
  const chipKeys = new Set<string>();
  const chips: string[] = [];
  const sortedFragments = [...fragments].sort((a, b) => {
    const aTime = Date.parse(a.updatedAt ?? a.createdAt ?? "") || 0;
    const bTime = Date.parse(b.updatedAt ?? b.createdAt ?? "") || 0;
    return bTime - aTime;
  });

  for (const fragment of sortedFragments) {
    collectPokachips(fragment.pokachips ?? [], excludeSet, chipKeys, chips);
  }

  if (options.includeFallback !== false) {
    collectPokachips(fallbackRecentPokachips, excludeSet, chipKeys, chips);
  }

  return typeof options.limit === "number" ? chips.slice(0, options.limit) : chips;
}

export function getPokachipCandidates(
  fragments: Fragment[],
  options: { limit?: number; exclude?: string[] } = {}
): string[] {
  const excludeSet = new Set((options.exclude ?? []).map(getPokachipKey).filter(Boolean));
  const chipKeys = new Set<string>();
  const chips: string[] = [];

  collectPokachips(getRecentPokachips(fragments, { includeFallback: true }), excludeSet, chipKeys, chips);
  collectPokachips(homeInterestPokachips, excludeSet, chipKeys, chips);

  return typeof options.limit === "number" ? chips.slice(0, options.limit) : chips;
}

export const sampleFragments: Fragment[] = [
  {
    id: "1",
    title: "빛을 다루는 사람들 — 조명 디자이너 인터뷰",
    source: "designerspick.co",
    sourceType: "link",
    memo: "공간을 바꾸는 빛의 온도에 대해 이야기합니다. 조명 하나로 방의 분위기가 완전히 달라진다는 걸 다시 실감했다.",
    url: "https://designerspick.co/lighting-designer",
    time: "오늘",
    date: "2026년 6월 19일",
    createdAt: "2026-06-19T09:00:00.000Z",
    updatedAt: "2026-06-19T09:00:00.000Z",
    pokachips: ["조명"],
    thumbnailColor: "#f0e8d0",
  },
  {
    id: "2",
    title: "글쓰기는 생각을 발견하는 행위다",
    sourceType: "text",
    memo: "쓰기 전에는 몰랐던 내 생각을 글을 쓰면서 처음 알게 된다. 그래서 쓴다.",
    time: "어제",
    date: "2026년 6월 18일",
    createdAt: "2026-06-18T09:00:00.000Z",
    updatedAt: "2026-06-18T09:00:00.000Z",
    pokachips: ["글쓰기"],
    thumbnailColor: "#f0dce4",
  },
  {
    id: "3",
    title: "작은 수조에서 생태계 만들기",
    source: "aquascape.kr",
    sourceType: "link",
    memo: "30cm 큐브 수조로 완성한 네이처 아쿠아리움. 이끼와 새우의 균형이 핵심.",
    url: "https://aquascape.kr/nano-cube",
    time: "2일 전",
    date: "2026년 6월 17일",
    createdAt: "2026-06-17T09:00:00.000Z",
    updatedAt: "2026-06-17T09:00:00.000Z",
    pokachips: ["수조"],
    thumbnailColor: "#d4eef4",
  },
  {
    id: "4",
    title: "Blender 노드 메모",
    sourceType: "text",
    memo: "Emission 노드 + Volume Scatter = 빛 산란 효과. 강도는 0.02~0.05 사이가 자연스러움. 나중에 유리 재질에도 써보기.",
    time: "3일 전",
    date: "2026년 6월 16일",
    createdAt: "2026-06-16T09:00:00.000Z",
    updatedAt: "2026-06-16T09:00:00.000Z",
    pokachips: ["블렌더", "유리"],
    thumbnailColor: "#d8eef8",
  },
  {
    id: "5",
    title: "한국 웹앱 디자인 트렌드 2024",
    source: "brunch.co.kr",
    sourceType: "link",
    memo: "유리형 UI와 소프트 그라데이션이 주도하는 올해의 디자인 방향. 채집가방에도 참고할 만하다.",
    url: "https://brunch.co.kr/@design/webtrend2024",
    time: "4일 전",
    date: "2026년 6월 15일",
    createdAt: "2026-06-15T09:00:00.000Z",
    updatedAt: "2026-06-15T09:00:00.000Z",
    pokachips: ["웹앱"],
    thumbnailColor: "#dce8f8",
  },
  {
    id: "6",
    title: "아침 6시의 창문 빛",
    sourceType: "text",
    memo: "오늘 아침 창문으로 들어온 빛이 너무 좋았다. 황금빛 각도가 딱 15분간 지속됐다.",
    time: "5일 전",
    date: "2026년 6월 14일",
    createdAt: "2026-06-14T09:00:00.000Z",
    updatedAt: "2026-06-14T09:00:00.000Z",
    pokachips: ["사진", "조명"],
    thumbnailColor: "#dce8d0",
  },
];
