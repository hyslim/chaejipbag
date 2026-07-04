import { ArrowUp, Link2, RotateCcw, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { getPokachipColor, normalizePokachipName, type Fragment } from "@/data/fragments";
import { useFragments } from "@/hooks/useFragments";
import { BottomNav } from "@/components/BottomNav";

const HISTORY_FILTERS = [
  { label: "첫 등장", Icon: Sparkles },
  { label: "함께 등장", Icon: Link2 },
  { label: "자주 사용", Icon: ArrowUp },
  { label: "재등장", Icon: RotateCcw },
];
const HISTORY_SECTIONS = ["오늘", "이번 주", "이번 달", "더 이전"] as const;

type HistorySectionLabel = (typeof HISTORY_SECTIONS)[number];

const HistoryCard = ({ fragment }: { fragment: Fragment }) => {
  const chips = fragment.pokachips.map((chip) => normalizePokachipName(chip));
  const primaryChip = chips[0];
  const historyText = primaryChip
    ? `${primaryChip} 조각이 처음 나타났어요`
    : `${fragment.title} 조각을 다시 꺼내봤어요`;

  return (
    <Link href={`/fragment/${fragment.id}`}>
      <div className="rounded-2xl border border-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.72)] px-4 py-3.5 shadow-[0_2px_8px_rgba(80,65,45,0.025)]">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p
              className="line-clamp-2 text-[14px] font-medium leading-snug text-[rgba(50,44,34,0.8)]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              {historyText}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chips.length > 0 ? (
                chips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex min-h-6 items-center rounded-full px-2.5 text-[10px] font-medium text-[#5a5248b0]"
                    style={{ backgroundColor: getPokachipColor(chip) }}
                  >
                    {chip}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-[rgba(120,112,100,0.75)]">{fragment.date}</span>
              )}
            </div>
          </div>
          <span className="shrink-0 text-[18px] leading-none text-[rgba(54,58,105,0.38)]">
            &rsaquo;
          </span>
        </div>
      </div>
    </Link>
  );
};

function getCreatedAtSortValue(fragment: Fragment, index: number): number {
  const createdAtTime = Date.parse(fragment.createdAt ?? "");

  if (!Number.isNaN(createdAtTime)) {
    return createdAtTime;
  }

  const dateParts = fragment.date.match(/\d+/g)?.map(Number);

  if (dateParts && dateParts.length >= 3) {
    const [year, month, day] = dateParts;
    return Date.UTC(year, month - 1, day) - index;
  }

  return -index;
}

function getFragmentDate(fragment: Fragment): Date | null {
  const createdAtTime = Date.parse(fragment.createdAt ?? "");

  if (!Number.isNaN(createdAtTime)) {
    return new Date(createdAtTime);
  }

  const dateParts = fragment.date.match(/\d+/g)?.map(Number);

  if (dateParts && dateParts.length >= 3) {
    const [year, month, day] = dateParts;
    return new Date(year, month - 1, day);
  }

  return null;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date): Date {
  const weekStart = startOfDay(date);
  const day = weekStart.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + mondayOffset);
  return weekStart;
}

function getHistorySection(fragment: Fragment, now = new Date()): HistorySectionLabel {
  const fragmentDate = getFragmentDate(fragment);

  if (!fragmentDate) {
    return "더 이전";
  }

  const itemDay = startOfDay(fragmentDate).getTime();
  const today = startOfDay(now);
  const thisWeek = startOfWeek(now).getTime();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  if (itemDay === today.getTime()) {
    return "오늘";
  }

  if (itemDay >= thisWeek) {
    return "이번 주";
  }

  if (itemDay >= thisMonth) {
    return "이번 달";
  }

  return "더 이전";
}

const HistorySection = ({
  label,
  fragments,
}: {
  label: HistorySectionLabel;
  fragments: Fragment[];
}) => {
  return (
    <section className="flex flex-col">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="shrink-0 px-1 text-[12px] font-medium text-[rgba(120,112,100,0.75)]">
          {label}
        </h2>
        <div className="h-px flex-1 bg-[rgba(120,112,100,0.16)]" />
      </div>
      <div className="flex flex-col gap-2.5">
        {fragments.map((fragment) => (
          <HistoryCard key={fragment.id} fragment={fragment} />
        ))}
      </div>
    </section>
  );
};

const EmptyHistory = () => (
  <div className="mt-10 rounded-2xl border border-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.55)] px-5 py-10 text-center">
    <p className="text-[14px] font-medium text-[rgba(50,44,34,0.8)]">아직 담아둔 조각이 없어요</p>
    <p className="mt-2 text-[12px] leading-relaxed text-[rgba(120,112,100,0.75)]">
      떠오른 생각이나 링크를 먼저 하나 담아보세요.
    </p>
  </div>
);

export const History = () => {
  const { fragments } = useFragments();
  const fragmentOrder = new Map(fragments.map((fragment, index) => [fragment.id, index]));
  const sortedFragments = [...fragments].sort(
    (a, b) =>
      getCreatedAtSortValue(b, fragmentOrder.get(b.id) ?? 0) -
      getCreatedAtSortValue(a, fragmentOrder.get(a.id) ?? 0)
  );
  const groupedFragments = HISTORY_SECTIONS.map((label) => ({
    label,
    fragments: sortedFragments.filter((fragment) => getHistorySection(fragment) === label),
  }));

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#f3f0ec]">
      <section className="min-h-screen w-full max-w-[390px] bg-[#FAF8F4] pb-[120px]">
        <header className="bg-[#FCFBF8] px-5 pb-[12px] pt-[20px]">
          <p className="text-[12px] font-medium text-[rgba(54,58,105,0.7)]">조각의 역사</p>
          <h1
            className="mt-1 text-[28px] font-medium text-[rgba(54,58,105,0.7)]"
            style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
          >
            기록
          </h1>
        </header>

        <div className="bg-[#FFFFFF] px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {HISTORY_FILTERS.map(({ label, Icon }, index) => (
              <div key={label} className="flex items-center gap-2">
                {index > 0 && <span className="h-3 w-px bg-[rgba(120,112,100,0.16)]" />}
                <span className="flex items-center gap-1 text-[11px] font-medium text-[rgba(120,112,100,0.75)]">
                  <Icon size={12} color="rgba(120,112,100,0.55)" strokeWidth={1.8} />
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {sortedFragments.length > 0 ? (
          <div className="flex flex-col gap-5 bg-[#FAF8F4] px-5 pt-5">
            {groupedFragments.map(({ label, fragments }) => (
              <HistorySection key={label} label={label} fragments={fragments} />
            ))}
          </div>
        ) : (
          <div className="bg-[#FAF8F4] px-5 pt-5">
            <EmptyHistory />
          </div>
        )}

        <BottomNav activeTab="history" />
      </section>
    </main>
  );
};
