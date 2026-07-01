import { Link, useLocation } from "wouter";
import { getPokachipColor, normalizePokachipName, type Fragment } from "@/data/fragments";
import { useFragments } from "@/hooks/useFragments";

const HistoryCard = ({ fragment }: { fragment: Fragment }) => {
  const chip = fragment.pokachips[0] ? normalizePokachipName(fragment.pokachips[0]) : "";

  return (
    <Link href={`/fragment/${fragment.id}`}>
      <div className="rounded-[20px] border border-[rgba(255,255,255,0.8)] bg-[#FFFEFB] p-4 shadow-[0_8px_20px_rgba(80,65,45,0.06)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {chip && (
              <span
                className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium text-[#5a5248b0]"
                style={{ backgroundColor: getPokachipColor(chip) }}
              >
                {chip}
              </span>
            )}
          </div>
          <span className="shrink-0 text-[11px] text-[rgba(160,152,140,0.5)]">{fragment.date}</span>
        </div>
        <h2
          className="mt-2 line-clamp-2 text-[15px] font-medium leading-snug text-[#3a3228]"
          style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
        >
          {fragment.title}
        </h2>
        {fragment.memo && (
          <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-[rgba(120,112,100,0.6)]">
            {fragment.memo}
          </p>
        )}
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

export const History = () => {
  const [, navigate] = useLocation();
  const { fragments } = useFragments();
  const fragmentOrder = new Map(fragments.map((fragment, index) => [fragment.id, index]));
  const sortedFragments = [...fragments].sort(
    (a, b) =>
      getCreatedAtSortValue(b, fragmentOrder.get(b.id) ?? 0) -
      getCreatedAtSortValue(a, fragmentOrder.get(a.id) ?? 0)
  );

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#FAF8F4]">
      <section className="min-h-screen w-full max-w-[390px] bg-[#FAF8F4] px-4 pb-12 pt-6">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-6 flex items-center gap-1.5 text-[rgba(120,112,100,0.7)]"
        >
          <span aria-hidden="true">‹</span>
          <span className="text-[13px] font-medium">홈</span>
        </button>
        <h1
          className="text-[24px] font-medium text-[#353a69cc]"
          style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
        >
          기록
        </h1>
        <p className="mt-1 text-[13px] leading-relaxed text-[rgba(120,112,100,0.6)]">
          내가 주워둔 조각들을 시간순으로 다시 봅니다.
        </p>

        {sortedFragments.length > 0 ? (
          <div className="mt-6 flex flex-col gap-3">
            {sortedFragments.map((fragment) => (
              <HistoryCard key={fragment.id} fragment={fragment} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-[20px] border border-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.55)] px-5 py-10 text-center">
            <p className="text-[14px] font-medium text-[#787064]">아직 담아둔 조각이 없어요.</p>
            <p className="mt-2 text-[12px] leading-relaxed text-[#a0988c]">
              떠오른 생각이나 링크를 먼저 하나 담아보세요.
            </p>
          </div>
        )}
      </section>
    </main>
  );
};
