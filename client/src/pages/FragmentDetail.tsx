import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, Pencil, Trash2, ExternalLink } from "lucide-react";
import { getPokachipColor, normalizePokachipName } from "@/data/fragments";
import { useFragments } from "@/hooks/useFragments";

const getSourceMetaLabel = (sourceType?: string, source?: string, url?: string): string => {
  const sourceText = `${source ?? ""} ${url ?? ""}`.toLocaleLowerCase("en-US");

  if (sourceType === "text") return "직접 입력";
  if (sourceType === "youtube" || sourceText.includes("youtube") || sourceText.includes("youtu.be")) return "YouTube";
  if (sourceText.includes("instagram")) return "Instagram";
  if (sourceText.includes("pinterest")) return "Pinterest";
  if (sourceType === "link" || url) return "웹사이트";

  return source || "기록";
};

export const FragmentDetail = ({ params }: { params: { id: string } }) => {
  const [, navigate] = useLocation();
  const { getFragment, deleteFragment } = useFragments();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const fragment = getFragment(params.id);

  const handleDelete = () => {
    deleteFragment(params.id);
    navigate("/");
  };

  if (!fragment) {
    return (
      <main className="flex min-h-screen w-full justify-center bg-[#FAF8F4]">
        <section className="flex min-h-screen w-full max-w-[390px] flex-col bg-[#FAF8F4]" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
          <header className="border-b border-[#F5F2ED] bg-[#FFFFFB] px-5 pt-6 pb-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-[rgba(54,58,105,0.7)]"
            >
              <ChevronLeft size={16} />
              <span className="text-sm" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
                돌아가기
              </span>
            </button>
          </header>
          <div className="px-5 pt-5">
            <p className="text-sm text-[rgba(120,112,100,0.6)]" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
              조각을 찾을 수 없어요.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const metaLabel = getSourceMetaLabel(fragment.sourceType, fragment.source, fragment.url);
  const trimmedTitle = fragment.title.trim();
  const trimmedMemo = fragment.memo?.trim() ?? "";
  const shouldShowMemo = Boolean(trimmedMemo && trimmedMemo !== trimmedTitle);

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#FAF8F4]">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex min-h-screen w-full max-w-[390px] flex-col bg-[#FAF8F4]"
        style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
      >
        {/* 헤더 */}
        <header className="flex items-center justify-between border-b border-[#F5F2ED] bg-[#FFFFFB] px-5 pt-6 pb-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-[rgba(54,58,105,0.7)]"
            aria-label="뒤로 가기"
          >
            <ChevronLeft size={22} strokeWidth={2.2} />
            <span
              className="text-[18px] font-semibold leading-[24px] text-[rgba(54,58,105,0.7)]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              조각 들여다보기
            </span>
          </button>
          <div className="-mr-3 flex items-center gap-0">
            <button
              onClick={() => navigate(`/fragment/${fragment.id}/edit`)}
              className="relative flex h-4 w-10 items-center justify-center overflow-visible text-[rgba(160,152,140,0.65)] before:absolute before:inset-x-0 before:-inset-y-3 before:content-[''] hover:text-[rgba(120,112,100,0.7)]"
              aria-label="수정"
            >
              <Pencil size={16} strokeWidth={1.8} />
            </button>
            <button
              onClick={() => setIsDeleteOpen(true)}
              className="relative flex h-4 w-10 items-center justify-center overflow-visible text-[rgba(160,152,140,0.65)] before:absolute before:inset-x-0 before:-inset-y-3 before:content-[''] hover:text-red-400"
              aria-label="삭제"
            >
              <Trash2 size={16} strokeWidth={1.8} />
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col px-5 pt-5 pb-28">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-normal leading-[17px] text-[rgba(120,112,100,0.75)]">
            {metaLabel && (
              <div className="inline-flex h-7 max-w-[160px] items-center gap-1.5 rounded-[999px] border border-[rgba(120,112,100,0.16)] bg-transparent px-3">
                <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border border-[rgba(120,112,100,0.16)]">
                  <div className="h-1.5 w-2 rounded-[1px] bg-[rgba(120,112,100,0.45)]" />
                </div>
                <span className="truncate text-[12px] font-normal leading-[17px] text-[rgba(120,112,100,0.75)]" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>{metaLabel}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="#c0b8b0" strokeWidth="1.2" />
                <path d="M6 3.5V6l1.5 1.5" stroke="#c0b8b0" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>{fragment.date}</span>
            </div>
          </div>

          {fragment.imageDataUrl && (
            <section className="mt-5 overflow-hidden rounded-[18px] border border-white/70 bg-[#FFFFFF]">
              <img
                src={fragment.imageDataUrl}
                alt=""
                className="h-[220px] w-full object-cover"
              />
            </section>
          )}

          <section className="mt-7">
            <h1
              className="text-[18px] font-medium leading-[26px] text-[rgba(50,44,34,0.8)]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              {fragment.title}
            </h1>
          </section>

          {shouldShowMemo && (
            <section className="mt-8 flex flex-col gap-3">
              <span
                className="text-[12px] font-medium leading-[17px] text-[rgba(120,112,100,0.75)]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                내 메모
              </span>
              <p
                className="text-[14px] font-normal leading-[22px] text-[rgba(50,44,34,0.8)]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                {trimmedMemo}
              </p>
            </section>
          )}

          {fragment.pokachips.length > 0 && (
            <section className="mt-8 flex flex-col gap-3">
              <span
                className="text-[12px] font-medium leading-[17px] text-[rgba(120,112,100,0.75)]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                기억 조각
              </span>
              <div className="flex flex-wrap gap-1.5">
                {fragment.pokachips.map((chip) => {
                  const normalizedChip = normalizePokachipName(chip);

                  return (
                    <span
                      key={chip}
                      className="flex h-[30px] items-center rounded-[999px] border border-[rgba(255,255,255,0.55)] px-3 text-[12px] font-medium leading-[17px] text-[rgba(50,44,34,0.7)]"
                      style={{
                        backgroundColor: getPokachipColor(normalizedChip),
                        fontFamily: "'Pretendard Variable', sans-serif",
                        boxShadow: "0 2px 4px 0 rgba(180,196,244,0.28), inset 0 1px 0 0 rgba(255,255,255,0.58)",
                      }}
                    >
                      {normalizedChip}
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          {fragment.url && (
            <>
              {fragment.pokachips.length > 0 && (
                <div className="mt-6 mb-5 h-px bg-[rgba(120,112,100,0.16)]" />
              )}
              <section className={fragment.pokachips.length > 0 ? "" : "mt-8"}>
                <span
                  className="text-[12px] font-medium leading-[17px] text-[rgba(120,112,100,0.75)]"
                  style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                >
                  원본 링크
                </span>
                <a
                  href={fragment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-2 rounded-[14px] border border-[rgba(120,112,100,0.16)] bg-[#FFFFFF] px-4 py-3"
                >
                  <ExternalLink size={13} className="shrink-0 text-[rgba(160,152,140,0.65)]" strokeWidth={1.8} />
                  <span
                    className="truncate text-[12px] font-normal leading-[17px] text-[rgba(120,112,100,0.75)]"
                    style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                  >
                    {fragment.url.replace(/^https?:\/\//, "")}
                  </span>
                </a>
              </section>
            </>
          )}
        </div>

        {/* 하단 공유 버튼 */}
        <div
          className="fixed bottom-0 left-1/2 flex w-full max-w-[390px] -translate-x-1/2 justify-center px-5 pb-8 pt-4"
          style={{
            background: "linear-gradient(to top, #FAF8F4 65%, transparent)",
          }}
        >
          <button
            className="h-[51px] w-[180px] rounded-full border-0 px-[50px] py-[14px] text-[15px] font-medium text-white"
            style={{
              background: "linear-gradient(135deg, rgba(130,207,255,0.60) 12%, rgba(90,144,255,0.60) 54%, rgba(139,112,255,0.60) 100%)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.70), 0 3px 8px 0 rgba(180,196,244,0.42)",
              fontFamily: "'Pretendard Variable', sans-serif",
            }}
          >
            공유하기
          </button>
        </div>

        {isDeleteOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a262033] px-5 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-fragment-title"
          >
            <div className="w-full max-w-[350px] rounded-2xl border border-white/80 bg-[#FFFFFF] p-5 shadow-[0_18px_50px_rgba(60,50,40,0.18)]">
              <h2
                id="delete-fragment-title"
                className="text-[18px] font-semibold text-[#3a3228]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                이 조각을 버릴까요?
              </h2>
              <p
                className="mt-2 text-[13px] leading-relaxed text-[#787064b0]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                버린 조각은 다시 주울 수 없어요.
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  className="flex-1 rounded-full border border-[#0000000a] bg-[#FAF8F4] py-3 text-[13px] font-medium text-[#787064]"
                >
                  조금 더 둘래요
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 rounded-full bg-[#d98b8b] py-3 text-[13px] font-medium text-white"
                >
                  버리기
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.section>
    </main>
  );
};
