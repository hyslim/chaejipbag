import { ArrowRight, ArrowUp, Link2, RotateCcw, Sparkles, type LucideIcon } from "lucide-react";
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
type HistoryEventKind = "first" | "together" | "frequent" | "again";

const HISTORY_EVENT_ICONS: Record<HistoryEventKind, LucideIcon> = {
  first: Sparkles,
  together: Link2,
  frequent: ArrowUp,
  again: RotateCcw,
};

function getHistoryEventKind(fragment: Fragment, fragments: Fragment[]): HistoryEventKind {
  const chips = fragment.pokachips.map((chip) => normalizePokachipName(chip)).filter(Boolean);
  const primaryChip = chips[0];

  if (chips.length > 1) {
    return "together";
  }

  if (!primaryChip) {
    return "again";
  }

  const sameChipCount = fragments.filter((item) =>
    item.pokachips.some((chip) => normalizePokachipName(chip) === primaryChip)
  ).length;

  if (sameChipCount >= 3) {
    return "frequent";
  }

  if (sameChipCount > 1) {
    return "again";
  }

  return "first";
}

const HistoryCard = ({ fragment, eventIcon: EventIcon }: { fragment: Fragment; eventIcon: LucideIcon }) => {
  const chips = fragment.pokachips.map((chip) => normalizePokachipName(chip));
  const primaryChip = chips[0];
  const historyText = primaryChip
    ? `${primaryChip} 조각이 처음 나타났어요`
    : `${fragment.title} 조각을 다시 꺼내봤어요`;

  return (
    <Link href={`/fragment/${fragment.id}`}>
      <div className="overflow-hidden rounded-[18px] border border-white/85 bg-white/90 px-4 py-3.5 shadow-[0_6px_18px_rgba(74,63,48,0.08)]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <EventIcon
              size={13}
              className="shrink-0 text-[rgba(120,112,100,0.68)]"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <p
              className="min-w-0 flex-1 overflow-hidden break-words line-clamp-2 text-[14px] font-medium leading-snug text-[rgba(50,44,34,0.8)]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              {historyText}
            </p>
            <ArrowRight
              size={14}
              className="shrink-0 text-[rgba(120,112,100,0.68)]"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </div>
          <div className="mt-2 flex min-w-0 flex-wrap gap-1.5 pl-[21px]">
            {chips.length > 0 ? (
              chips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex h-6 min-w-0 max-w-full items-center overflow-hidden rounded-full px-2.5 text-[12px] font-medium leading-[17px] text-[rgba(50,44,34,0.7)]"
                  style={{
                    backgroundColor: getPokachipColor(chip),
                    fontFamily: "'Pretendard Variable', sans-serif",
                  }}
                >
                  <span className="min-w-0 truncate">{chip}</span>
                </span>
              ))
            ) : (
              <span className="min-w-0 break-words text-[12px] text-[rgba(120,112,100,0.75)]">{fragment.date}</span>
            )}
          </div>
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
  allFragments,
}: {
  label: HistorySectionLabel;
  fragments: Fragment[];
  allFragments: Fragment[];
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
          <HistoryCard
            key={fragment.id}
            fragment={fragment}
            eventIcon={HISTORY_EVENT_ICONS[getHistoryEventKind(fragment, allFragments)]}
          />
        ))}
      </div>
    </section>
  );
};

const EmptyHistory = () => (
  <div className="mt-10 rounded-[18px] border border-white/85 bg-white/90 px-5 py-10 text-center shadow-[0_6px_18px_rgba(74,63,48,0.06)]">
    <p className="text-[14px] font-medium text-[rgba(50,44,34,0.8)]">아직 기록이 없어요.</p>
    <p className="mt-2 text-[12px] leading-relaxed text-[rgba(120,112,100,0.75)]">
      조각을 담으면 이곳에서 다시 들여다볼 수 있어요.
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
    <main className="flex min-h-screen w-full justify-center bg-[#FAF8F4] sm:bg-[#f3f0ec]">
      <section className="min-h-screen w-full bg-[#FAF8F4] pb-[calc(220px+env(safe-area-inset-bottom))] sm:max-w-[390px]" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
        <header className="flex flex-col border-b border-[#F5F2ED] bg-[#FFFEFB] px-5 pb-3 pt-6">
          <p className="mb-1 text-[13px] font-[550] text-[rgba(120,112,100,0.7)]">다시 꺼내보는 조각들</p>
          <h1
            className="text-[22px] font-medium leading-[1.4] text-[#353a69b2]"
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
                <span className="flex items-center gap-1 text-[12px] font-medium text-[rgba(120,112,100,0.75)]">
                  <Icon size={13} color="rgba(120,112,100,0.68)" strokeWidth={1.8} />
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {sortedFragments.length > 0 ? (
          <div className="flex flex-col gap-5 bg-[#FAF8F4] px-5 pb-4 pt-5">
            {groupedFragments.map(({ label, fragments }) => (
              <HistorySection key={label} label={label} fragments={fragments} allFragments={sortedFragments} />
            ))}
          </div>
        ) : (
          <div className="bg-[#FAF8F4] px-5 pb-4 pt-5">
            <EmptyHistory />
          </div>
        )}

        <BottomNav activeTab="history" />
      </section>
    </main>
  );
};
