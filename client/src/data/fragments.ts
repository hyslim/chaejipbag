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
  pokachips: string[];
  thumbnailColor: string;
}

export const pokachipColorMap: Record<string, string> = {
  글쓰기: "rgba(238,196,208,0.55)",
  수조: "rgba(168,220,232,0.55)",
  조명: "rgba(238,216,152,0.55)",
  웹앱: "rgba(184,204,242,0.55)",
  블렌더: "rgba(178,226,248,0.55)",
  사진: "rgba(200,216,168,0.55)",
  유리: "rgba(200,220,240,0.55)",
  파랑: "rgba(180,210,255,0.55)",
  임시조각: "rgba(220,210,240,0.55)",
};

const generatedPokachipPalette = [
  "#EEC4D0",
  "#CDEAF3",
  "#DCD9F3",
  "#F1DFA7",
  "#CDEBE4",
  "#D8E7FA",
];

export function normalizePokachipName(value: string): string {
  return value
    .trim()
    .replace(/^[+\-#]\s*/, "")
    .replace(/\s*×$/, "")
    .trim();
}

export function getPokachipColor(value: string): string {
  const name = normalizePokachipName(value);
  const mappedColor = pokachipColorMap[name];
  if (mappedColor) return mappedColor;

  let hash = 0;
  for (const character of name) {
    hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  }

  return generatedPokachipPalette[hash % generatedPokachipPalette.length];
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
