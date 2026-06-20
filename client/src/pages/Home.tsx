import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { getPokachipColor, normalizePokachipName, type Fragment } from "@/data/fragments";
import { useFragments } from "@/hooks/useFragments";

const interests = [
  {
    id: "webapp",
    label: "웹앱",
    gradient: "linear-gradient(145deg, #dce7ef 0%, #d2dcec 48%, #ddd3e7 100%)",
    shadow: "0 5px 14px rgba(112,126,153,0.10)",
  },
  {
    id: "interior",
    label: "인테리어",
    gradient: "linear-gradient(140deg, #ded4e7 0%, #e5d3df 50%, #efd9c9 100%)",
    shadow: "0 5px 14px rgba(142,113,128,0.09)",
  },
  {
    id: "aquarium",
    label: "수조",
    gradient: "linear-gradient(145deg, #d5e9df 0%, #cfe4e2 50%, #d2e3ed 100%)",
    shadow: "0 5px 14px rgba(91,135,137,0.09)",
  },
  {
    id: "routine",
    label: "루틴",
    gradient: "linear-gradient(140deg, #d2e5da 0%, #dce7d5 50%, #eee7cf 100%)",
    shadow: "0 5px 14px rgba(119,132,103,0.09)",
  },
  {
    id: "lighting",
    label: "조명",
    gradient: "linear-gradient(145deg, #f1ead7 0%, #eee1bd 52%, #ead7a8 100%)",
    shadow: "0 5px 14px rgba(151,126,73,0.09)",
  },
  {
    id: "cooking",
    label: "요리",
    gradient: "linear-gradient(140deg, #efd5d9 0%, #efd0cf 50%, #f0d7c2 100%)",
    shadow: "0 5px 14px rgba(148,99,96,0.09)",
  },
];

const defaultPokachips = ["유리", "파랑", "임시조각"];

const thumbnailHeights = ["h-[102px]", "h-[128px]", "h-[90px]", "h-[116px]", "h-[98px]", "h-[124px]"];
const cardSpacing = ["mb-3", "mb-4", "mb-3.5", "mb-5", "mb-4", "mb-3"];

const FragmentCard = ({ fragment, index }: { fragment: Fragment; index: number }) => (
  <div className={`${cardSpacing[index % cardSpacing.length]} break-inside-avoid`}>
    <Link href={`/fragment/${fragment.id}`}>
      <motion.div
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="overflow-hidden rounded-[18px] border border-white/90 bg-white/90 shadow-[0px_8px_24px_rgba(74,63,48,0.08)] cursor-pointer"
      >
      {/* 썸네일 */}
      <div
        className={`${thumbnailHeights[index % thumbnailHeights.length]} relative w-full overflow-hidden`}
        style={{
          background: `linear-gradient(145deg, ${fragment.thumbnailColor} 0%, rgba(255,255,255,0.5) 54%, ${fragment.thumbnailColor} 100%)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background: "radial-gradient(circle at 24% 18%, rgba(255,255,255,0.78), transparent 42%), radial-gradient(circle at 82% 86%, rgba(150,160,220,0.12), transparent 48%)",
          }}
        />
      </div>

      {/* 본문 */}
      <div className="flex flex-col px-3.5 pt-2.5 pb-3.5">
        {/* 포카칩 */}
        {fragment.pokachips[0] && (
          <span
            className="mb-2 self-start rounded-full px-2.5 py-1 text-[10px] font-medium leading-none text-[#5a5248b0]"
            style={{
              backgroundColor: getPokachipColor(fragment.pokachips[0]),
              fontFamily: "'Pretendard Variable', sans-serif",
            }}
          >
            {normalizePokachipName(fragment.pokachips[0])}
          </span>
        )}

        {/* 제목 — 주인공 */}
        <p
          className="line-clamp-2 text-[13px] font-medium leading-[1.45] text-[#3a3228cc]"
          style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
        >
          {fragment.title}
        </p>

        {/* 출처 — 조용한 단서 */}
        {fragment.source && (
          <p
            className="mt-1.5 text-[10px] text-[#aaa29a99]"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {fragment.source}
          </p>
        )}

        {/* 시간 */}
        <div className="mt-2 flex items-center justify-end">
          <span
            className="text-[10px] text-[#b8b0a8] ml-auto"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {fragment.time}
          </span>
        </div>
        </div>
      </motion.div>
    </Link>
  </div>
);

export const Home = (): JSX.Element => {
  const { fragments } = useFragments();
  const [, navigate] = useLocation();
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const storedPokachips = Array.from(
    new Set(
      fragments
        .flatMap((fragment) => fragment.pokachips ?? [])
        .map(normalizePokachipName)
        .filter(Boolean)
    )
  ).slice(0, 5);
  const topPokachips = storedPokachips.length > 0 ? storedPokachips : defaultPokachips;
  const visibleFragments = selectedChip
    ? fragments.filter((fragment) =>
        (fragment.pokachips ?? []).some(
          (chip) => normalizePokachipName(chip) === selectedChip
        )
      )
    : fragments;

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#f3f0ec]">
      <section className="relative flex min-h-screen w-full max-w-[390px] flex-col bg-[#faf8f4]">

        {/* 상단 memory section */}
        <section
          className="relative min-h-[272px] overflow-hidden"
          style={{
            background: "radial-gradient(circle at 32% 10%, rgba(224,217,242,0.24), transparent 38%), radial-gradient(circle at 88% 78%, rgba(244,220,194,0.22), transparent 42%), #FFFEFB",
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-14 z-0 h-[178px] w-[330px] opacity-[0.32] blur-[3px]"
            style={{
              background: "linear-gradient(110deg, rgba(255,254,251,0.06) 0%, rgba(226,216,244,0.72) 46%, rgba(255,253,249,0.16) 100%)",
              clipPath: "polygon(16% 0, 100% 0, 84% 100%, 0 100%)",
              transform: "rotate(-13deg)",
            }}
          />

          <div className="relative z-10">
            <header className="flex items-center justify-between px-4 pt-5 pb-3">
              <h1
                className="text-[18px] font-medium leading-[1.45] text-[#353a69b2]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                내 기억
              </h1>
              <span aria-hidden="true" className="text-[#78706480]">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M12 12L15 15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </span>
            </header>

            {/* 관심사 타일 — 정돈된 3열 × 2행의 기억 조각 */}
            <div className="px-4 pb-2">
              <div className="grid grid-cols-3 gap-2">
                {interests.map((interest) => (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => setSelectedChip(interest.label)}
                    className="flex h-20 items-center justify-center rounded-[20px] border border-white/15 px-2"
                    style={{
                      background: interest.gradient,
                      boxShadow: interest.shadow,
                    }}
                  >
                    <span
                      className="text-[13px] font-medium text-[#554d48b8]"
                      style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                    >
                      {interest.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 포카칩 영역 — 가로 드래그 가능, 우측에 + 버튼 */}
            <div className="px-4 pb-2">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex min-w-0 flex-1 gap-2 overflow-x-auto"
                  style={{
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    WebkitOverflowScrolling: "touch",
                    maskImage: "linear-gradient(to right, black 82%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to right, black 82%, transparent 100%)",
                    paddingRight: "16px",
                  }}
                >
                  {topPokachips.map((chip) => {
                    const backgroundColor = getPokachipColor(chip);
                    return (
                      <motion.button
                        key={chip}
                        onClick={() => setSelectedChip(chip)}
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        className="h-[29px] shrink-0 rounded-full border border-[rgba(255,255,255,0.55)] px-3.5 py-0 text-[11px] font-medium text-[rgba(50,44,34,0.7)]"
                        style={{
                          backgroundColor,
                          boxShadow: "0 1px 4px rgba(200,196,188,0.28), inset 0 1px 1px rgba(255,255,255,0.45)",
                          fontFamily: "'Pretendard Variable', sans-serif",
                        }}
                      >
                        {chip}
                      </motion.button>
                    );
                  })}
                </div>

                {/* 포카칩 추가 버튼 */}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/70"
                  style={{
                    background: "linear-gradient(135deg, rgba(205,221,255,0.82), rgba(191,182,242,0.76))",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75), 0 2px 7px rgba(116,130,210,0.16)",
                  }}
                  aria-label="포카칩 추가"
                >
                  <span className="text-[12px] font-light leading-none text-[#6f74a8]">+</span>
                </motion.button>
              </div>
            </div>
          </div>
        </section>

        {/* 수집된 조각 피드 — 선 대신 따뜻한 배경 톤으로 부드럽게 전환 */}
        <section
          className="relative flex-1 border-t border-[#FAF7F2] pt-6"
          style={{
            backgroundColor: "#FAF8F4",
          }}
        >
          {/* 오늘 모은 조각들 헤더 */}
          <div className="px-4 mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <img src="/figmaAssets/glass.svg" alt="" className="w-3 h-4 opacity-50" />
              <span
                className="text-sm font-semibold text-[#787064bf]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                {selectedChip ? `${selectedChip} · ${visibleFragments.length}개` : "오늘 모은 조각들"}
              </span>
            </div>
            {selectedChip && (
              <button
                type="button"
                onClick={() => setSelectedChip(null)}
                className="shrink-0 text-[12px] font-medium text-[#78706480]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                가방으로
              </button>
            )}
          </div>

          {/* 2열 카드 그리드 */}
          <div className="px-4 pb-[120px]">
            <div className="columns-2 gap-3">
              {visibleFragments.map((fragment, index) => (
                <FragmentCard key={fragment.id} fragment={fragment} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* 하단 네비게이션 */}
        <footer
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] px-5 pb-6 pt-4 z-40"
          style={{
            background: "linear-gradient(to top, #faf8f4 65%, transparent)",
          }}
        >
          <nav
            className="flex items-center justify-between rounded-full border border-white/75 bg-white/50 px-3 py-2 backdrop-blur-[18px]"
            style={{
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.86), 0 8px 24px rgba(62,54,46,0.10)",
              backdropFilter: "blur(18px) saturate(125%)",
              WebkitBackdropFilter: "blur(18px) saturate(125%)",
            }}
          >
            <button className="flex items-center gap-2 rounded-full px-3 py-2 bg-white/70 shadow-[0px_1px_4px_rgba(0,0,0,0.06)]">
              <img src="/figmaAssets/chart-pie-portfolio-no-coral.svg" alt="탐색" className="w-5 h-5" />
              <span
                className="text-[12px] font-medium text-[#353a69cc]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                탐색
              </span>
            </button>

            {/* 중앙 + 버튼 — 새 조각 담기 */}
            <motion.button
              onClick={() => navigate("/fragment/new")}
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.06 }}
              transition={{ type: "spring", stiffness: 500, damping: 18, mass: 0.6 }}
              className="flex h-12 w-12 items-center justify-center rounded-full ring-1 ring-white/70"
              style={{
                background: "linear-gradient(135deg, #8fe8ff 0%, #6f96ff 48%, #a277ff 100%)",
                boxShadow: "0 0 0 6px rgba(130,158,255,0.10), 0 7px 24px rgba(105,125,255,0.55)",
              }}
              aria-label="새 조각 담기"
            >
              <span className="text-white text-xl font-light leading-none">+</span>
            </motion.button>

            <button className="flex items-center gap-2 rounded-full px-3 py-2">
              <img src="/figmaAssets/heart.png" alt="기록" className="w-5 h-5" />
              <span
                className="text-[12px] font-medium text-[#a0988c90]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                기록
              </span>
            </button>
          </nav>
        </footer>

      </section>
    </main>
  );
};
