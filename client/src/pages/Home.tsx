import { motion } from "framer-motion";
import { useState } from "react";
import { Globe, Instagram, Pencil, Plus, Sparkles, Youtube, type LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { getPokachipColor, normalizePokachipName, type Fragment } from "@/data/fragments";
import { useFragments } from "@/hooks/useFragments";
import { BottomNav } from "@/components/BottomNav";

const interests = [
  {
    id: "webapp",
    label: "웹앱",
    gradient: "linear-gradient(145deg, #c9d9f4 0%, #c5c5ef 48%, #d7c8ed 100%)",
    shadow: "0 8px 18px rgba(112,126,153,0.18)",
  },
  {
    id: "interior",
    label: "인테리어",
    gradient: "linear-gradient(140deg, #d5bff0 0%, #dec1e8 50%, #edcfc2 100%)",
    shadow: "0 8px 18px rgba(142,113,128,0.18)",
  },
  {
    id: "aquarium",
    label: "수조",
    gradient: "linear-gradient(145deg, #bfe4db 0%, #b3ddd9 50%, #bddfeb 100%)",
    shadow: "0 8px 18px rgba(91,135,137,0.18)",
  },
  {
    id: "routine",
    label: "루틴",
    gradient: "linear-gradient(140deg, #b8ddce 0%, #c9dfc7 50%, #eadfae 100%)",
    shadow: "0 8px 18px rgba(119,132,103,0.18)",
  },
  {
    id: "lighting",
    label: "조명",
    gradient: "linear-gradient(145deg, #f3e4b8 0%, #efd28c 52%, #e9c472 100%)",
    shadow: "0 8px 18px rgba(151,126,73,0.18)",
  },
  {
    id: "cooking",
    label: "요리",
    gradient: "linear-gradient(140deg, #f0bdc4 0%, #eeaebb 50%, #efc2b3 100%)",
    shadow: "0 8px 18px rgba(148,99,96,0.18)",
  },
];

const defaultPokachips = ["유리", "파랑", "임시조각"];

const sourceIconColor = "rgba(120,112,100,0.65)";

const getColorWithAlpha = (color: string, alpha: number): string => {
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
};
const shouldShowMemoPreview = (fragment: Fragment): boolean => {
  const title = fragment.title.trim();
  const memo = fragment.memo?.trim() ?? "";

  if (!memo || memo === title) return false;

  const hasEllipsizedTitle = title.endsWith("…") || title.endsWith("...");
  const titlePrefix = hasEllipsizedTitle ? title.replace(/(?:…|\.\.\.)$/, "").trim() : "";
  if (titlePrefix && memo.startsWith(titlePrefix)) return false;

  return true;
};
const getFragmentSourceIcon = (fragment: Fragment): LucideIcon => {
  const sourceText = `${fragment.source ?? ""} ${fragment.url ?? ""}`.toLocaleLowerCase("en-US");

  if (fragment.sourceType === "text") return Pencil;
  if (fragment.sourceType === "youtube" || sourceText.includes("youtube") || sourceText.includes("youtu.be")) return Youtube;
  if (sourceText.includes("instagram")) return Instagram;
  if (sourceText.includes("chatgpt") || sourceText.includes("chat.openai")) return Sparkles;

  return Globe;
};

const FragmentCard = ({ fragment }: { fragment: Fragment }) => {
  const SourceIcon = getFragmentSourceIcon(fragment);
  const primaryChip = fragment.pokachips[0] ? normalizePokachipName(fragment.pokachips[0]) : "";
  const hasTitle = Boolean(fragment.title.trim());
  const hasMemo = shouldShowMemoPreview(fragment);
  const chipBottomSpacing = hasTitle || hasMemo ? "mb-2" : "mb-0";
  const metaTopSpacing = hasTitle || hasMemo ? "mt-1" : primaryChip ? "mt-2" : "";

  return (
    <div>
      <Link href={`/fragment/${fragment.id}`}>
        <motion.div
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="overflow-hidden rounded-[18px] border border-white/90 bg-white/90 shadow-[0px_8px_24px_rgba(74,63,48,0.08)] cursor-pointer"
        >
          {fragment.imageDataUrl && (
            <img
              src={fragment.imageDataUrl}
              alt=""
              className="h-[140px] w-full object-cover"
            />
          )}

          <div className="flex flex-col p-3">
            {primaryChip && (
              <span
                className={`${chipBottomSpacing} flex h-6 items-center self-start rounded-[999px] px-2.5 py-1 text-[11px] font-medium leading-4 text-[rgba(50,44,34,0.68)]`}
                style={{
                  backgroundColor: getPokachipColor(primaryChip),
                  fontFamily: "'Pretendard Variable', sans-serif",
                }}
              >
                {primaryChip}
              </span>
            )}

            {hasTitle && (
              <p
                className="line-clamp-2 text-[14px] font-medium leading-[20px] text-[rgba(50,44,34,0.8)]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                {fragment.title}
              </p>
            )}

            {hasMemo && (
              <p
                className="mt-1 line-clamp-1 text-[12px] font-normal leading-[17px] text-[rgba(50,44,34,0.65)]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                {fragment.memo}
              </p>
            )}

            <div className={`${metaTopSpacing} flex items-center gap-1.5 text-[12px] leading-[17px] text-[rgba(120,112,100,0.65)]`}>
              <SourceIcon size={12} color={sourceIconColor} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
              <span className="truncate" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
                {fragment.time || fragment.date}
              </span>
            </div>
          </div>
        </motion.div>
      </Link>
    </div>
  );
};
const SearchResultCard = ({ fragment }: { fragment: Fragment }) => {
  const primaryChip = fragment.pokachips[0] ? normalizePokachipName(fragment.pokachips[0]) : "";
  const SourceIcon = getFragmentSourceIcon(fragment);

  return (
    <Link href={`/fragment/${fragment.id}`}>
      <motion.div
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="min-h-[104px] rounded-[14px] border border-white/85 bg-white/90 px-3.5 py-3 shadow-[0_6px_18px_rgba(74,63,48,0.08)]"
      >
        {primaryChip && (
          <span
            className="mb-2 inline-flex h-[20px] items-center rounded-full px-2.5 text-[10px] font-medium text-[#5a5248b0]"
            style={{
              backgroundColor: getPokachipColor(primaryChip),
              fontFamily: "'Pretendard Variable', sans-serif",
            }}
          >
            {primaryChip}
          </span>
        )}
        <p
          className="line-clamp-2 text-[12px] font-semibold leading-[1.55] text-[#3a3228]"
          style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
        >
          {fragment.title}
        </p>
        {shouldShowMemoPreview(fragment) && (
          <p
            className="mt-1 line-clamp-1 text-[10px] leading-snug text-[#8f877c99]"
            style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
          >
            {fragment.memo}
          </p>
        )}
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[rgba(120,112,100,0.65)]">
          <SourceIcon size={12} color={sourceIconColor} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
          <span className="truncate" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>{fragment.time || fragment.date}</span>
        </div>
      </motion.div>
    </Link>
  );
};

export const Home = (): JSX.Element => {
  const { fragments } = useFragments();
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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
  const leftColumnFragments = visibleFragments.filter((_, index) => index % 2 === 0);
  const rightColumnFragments = visibleFragments.filter((_, index) => index % 2 === 1);
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase("ko-KR");
  const searchResults = normalizedSearchQuery
    ? fragments.filter((fragment) => {
        const searchable = [
          fragment.title,
          fragment.memo,
          fragment.source,
          fragment.url,
          ...(fragment.pokachips ?? []).map(normalizePokachipName),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("ko-KR");

        return searchable.includes(normalizedSearchQuery);
      })
    : [];

  const openSearchMode = () => {
    setSelectedChip(null);
    setIsSearchMode(true);
  };

  const closeSearchMode = () => {
    setSearchQuery("");
    setIsSearchMode(false);
  };

  const resetHomeView = () => {
    setSelectedChip(null);
    closeSearchMode();
  };

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#f3f0ec]">
      <section className="relative flex min-h-screen w-full max-w-[390px] flex-col bg-[#faf8f4]" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
        {isSearchMode ? (
          <section className="flex min-h-screen flex-1 flex-col bg-[#faf8f4] pb-[220px]">
            <header className="border-b border-[#FAF7F2] bg-[#FFFEFB] px-4 py-3">
              <div className="flex h-[42px] items-center gap-2 rounded-[14px] bg-[rgba(120,112,100,0.05)] px-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <span aria-hidden="true" className="text-[15px] text-[rgba(120,112,100,0.5)]">
                  ⌕
                </span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="기억 속에서 찾기..."
                  autoComplete="off"
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-[rgba(50,44,34,0.8)] outline-none placeholder:text-[rgba(120,112,100,0.4)]"
                  style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                />
                <button
                  type="button"
                  onClick={closeSearchMode}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[18px] font-light leading-none text-[rgba(120,112,100,0.5)]"
                  aria-label="검색 닫기"
                  >
                  ×
                </button>
              </div>
            </header>

            <div className="flex flex-1 flex-col px-4 pt-4">
              {!normalizedSearchQuery && storedPokachips.length > 0 && (
                <div>
                  <p
                    className="text-[12px] font-medium text-[#78706499]"
                    style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                  >
                    최근 기억 조각
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {storedPokachips.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setSearchQuery(chip)}
                        className="h-[29px] rounded-full border border-[rgba(255,255,255,0.55)] px-3.5 py-0 text-[11px] font-medium text-[rgba(50,44,34,0.7)]"
                        style={{
                          backgroundColor: getPokachipColor(chip),
                          boxShadow: "0 1px 4px rgba(200,196,188,0.28), inset 0 1px 1px rgba(255,255,255,0.45)",
                          fontFamily: "'Pretendard Variable', sans-serif",
                        }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {normalizedSearchQuery && (
                <p
                  className="text-[13px] font-medium text-[#8f877c99]"
                  style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                >
                  '{searchQuery.trim()}' · {searchResults.length}개
                </p>
              )}

              {normalizedSearchQuery && searchResults.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {searchResults.map((fragment) => (
                    <SearchResultCard key={fragment.id} fragment={fragment} />
                  ))}
                </div>
              )}

              {normalizedSearchQuery && searchResults.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center pb-24 text-center">
                  <div className="relative mb-4 flex h-10 w-10 items-center justify-center rounded-[12px] border-2 border-[#c9c2b8]">
                    <span className="h-2.5 w-px bg-[#c9c2b8]" />
                    <span className="ml-2 h-2.5 w-px bg-[#c9c2b8]" />
                    <span className="absolute -top-4 left-1/2 h-2 w-px -translate-x-1/2 bg-[#c9c2b8]" />
                    <span className="absolute -top-3 left-[9px] h-2 w-px -rotate-45 bg-[#c9c2b8]" />
                    <span className="absolute -top-3 right-[9px] h-2 w-px rotate-45 bg-[#c9c2b8]" />
                  </div>
                  <p
                    className="text-[16px] font-medium text-[#78706480]"
                    style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                  >
                    모아둔 기억 조각이 없어요
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <>

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
                className="text-[18px] font-semibold leading-[1.45] text-[#353a69b2]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                내 기억
              </h1>
              <button
                type="button"
                onClick={openSearchMode}
                className="text-[#78706480]"
                aria-label="조각 찾기"
                  >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M12 12L15 15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            {/* 관심사 타일 — 정돈된 3열 × 2행의 기억 조각 */}
            <div className="px-4 pb-2">
              <div className="grid grid-cols-3 gap-2">
                {interests.map((interest) => (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => setSelectedChip(interest.label)}
                    className="flex h-20 items-center justify-center rounded-[20px] px-2"
                    style={{
                      background: interest.gradient,
                      boxShadow: interest.shadow,
                    }}
                  >
                    <span
                      className="text-[13px] font-medium text-[rgba(255,255,255,0.82)]"
                      style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                    >
                      {interest.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 포카칩 영역 — 가로 드래그 가능, 우측에 + 버튼 */}
            <div className="overflow-visible px-4 pb-2">
              <div className="relative flex items-center gap-2 overflow-visible py-[3px] pr-0">
                <div
                  className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pt-0.5 pb-1.5"
                  style={{
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    WebkitOverflowScrolling: "touch",
                    maskImage: "linear-gradient(to right, black calc(100% - 36px), transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to right, black calc(100% - 36px), transparent 100%)",
                    paddingRight: "44px",
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
                        className="box-border inline-flex h-[29px] shrink-0 items-center justify-center gap-2.5 rounded-[999px] border border-[rgba(255,255,255,0.55)] px-3.5 py-[6px] text-[12px] font-medium leading-[17px] text-[rgba(50,44,34,0.7)]"
                        style={{
                          backgroundColor: getColorWithAlpha(backgroundColor, 0.5),
                          boxShadow: "0 2px 4px 0 rgba(180,196,244,0.30), inset 0 1px 0 0 rgba(255,255,255,0.58)",
                          fontFamily: "'Pretendard Variable', sans-serif",
                        }}
                      >
                        {chip}
                      </motion.button>
                    );
                  })}
                </div>

                {/* 포카칩 추가 버튼 */}
                <div className="relative z-20 flex h-11 w-11 shrink-0 items-center justify-center overflow-visible">
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    transition={{ type: "spring", stiffness: 500, damping: 18 }}
                    className="box-border inline-flex aspect-square h-[30px] min-h-[30px] w-[30px] min-w-[30px] shrink-0 items-center justify-center rounded-[71px] border-0 p-0 leading-none"
                    style={{
                      background: "linear-gradient(133deg, rgba(130,207,255,0.60) 25.42%, rgba(90,144,255,0.60) 52.42%, rgba(139,112,255,0.60) 82.29%)",
                      boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.60), 0 3px 8px 0 rgba(180,196,244,0.50)",
                    }}
                    aria-label="포카칩 추가"
                  >
                    <Plus size={16} strokeWidth={2.5} color="rgba(255,255,255,0.9)" className="block" aria-hidden="true" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 수집된 조각 피드 — 선 대신 따뜻한 배경 톤으로 부드럽게 전환 */}
        <section
          className="relative flex-1 border-t border-[#FAF7F2] pt-3"
          style={{
            backgroundColor: "#FAF8F4",
          }}
        >
          {/* 오늘 모은 조각들 헤더 */}
          <div className="px-4 mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <img src="/figmaAssets/glass.svg" alt="" className="h-[14px] w-[10px]" />
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

          {/* 2열 카드 목록 */}
          <div className="px-4 pb-[260px]">
            <div className="flex gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                {leftColumnFragments.map((fragment) => (
                  <FragmentCard key={fragment.id} fragment={fragment} />
                ))}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                {rightColumnFragments.map((fragment) => (
                  <FragmentCard key={fragment.id} fragment={fragment} />
                ))}
              </div>
            </div>
          </div>
        </section>
          </>
        )}
        <BottomNav activeTab="home" onHomeClick={resetHomeView} />

      </section>
    </main>
  );
};
