import { Link, useLocation } from "wouter";
import { getPokachipColor, normalizePokachipName, type Fragment } from "@/data/fragments";
import { useFragments } from "@/hooks/useFragments";

const HistoryCard = ({ fragment }: { fragment: Fragment }) => {
  const chip = fragment.pokachips[0] ? normalizePokachipName(fragment.pokachips[0]) : "";

  return (
    <Link href={`/fragment/${fragment.id}`}>
      <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-[0_5px_18px_rgba(74,63,48,0.06)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {chip && (
              <span
                className="mb-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium text-[#5a5248b0]"
                style={{ backgroundColor: getPokachipColor(chip) }}
              >
                {chip}
              </span>
            )}
            <h2
              className="line-clamp-2 text-[15px] font-medium leading-snug text-[#3a3228]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              {fragment.title}
            </h2>
            {fragment.memo && (
              <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-[#78706499]">
                {fragment.memo}
              </p>
            )}
          </div>
          <span className="shrink-0 text-[11px] text-[#a0988c80]">{fragment.date}</span>
        </div>
      </div>
    </Link>
  );
};

export const History = () => {
  const [, navigate] = useLocation();
  const { fragments } = useFragments();

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#f3f0ec]">
      <section className="min-h-screen w-full max-w-[390px] bg-[#FAF8F4] px-4 pb-12 pt-6">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-6 flex items-center gap-1.5 text-[#787064b2]"
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
        <p className="mt-1 text-[13px] leading-relaxed text-[#78706499]">
          내가 주워둔 조각들을 시간순으로 다시 봅니다.
        </p>

        {fragments.length > 0 ? (
          <div className="mt-6 flex flex-col gap-3">
            {fragments.map((fragment) => (
              <HistoryCard key={fragment.id} fragment={fragment} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-white/70 bg-white/55 px-5 py-10 text-center">
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
