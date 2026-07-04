import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Pencil, Trash2, ExternalLink } from "lucide-react";
import { getPokachipColor, normalizePokachipName } from "@/data/fragments";
import { useFragments } from "@/hooks/useFragments";

const sourceTypeLabel: Record<string, string> = {
  link: "링크",
  text: "텍스트",
  youtube: "YouTube",
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
      <main className="flex min-h-screen w-full justify-center bg-[#f3f0ec]">
        <section className="flex min-h-screen w-full max-w-[390px] flex-col bg-[#FFFEFB]">
          <header className="border-b border-[rgba(250,247,242,0.5)] bg-[#FCFBF8] px-5 pt-6 pb-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-[rgba(120,112,100,0.7)]"
            >
              <ArrowLeft size={16} />
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

  const metaLabel = fragment.source || (fragment.sourceType ? sourceTypeLabel[fragment.sourceType] ?? "기록" : "");

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#f3f0ec]">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex min-h-screen w-full max-w-[390px] flex-col bg-[#FFFEFB]"
      >
        {/* 헤더 */}
        <header className="flex items-center justify-between border-b border-[rgba(250,247,242,0.5)] bg-[#FCFBF8] px-5 pt-6 pb-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-[rgba(120,112,100,0.7)]"
            aria-label="뒤로 가기"
          >
            <ArrowLeft size={16} strokeWidth={2} />
            <span
              className="text-[15px] font-medium text-[#353a69b2]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              조각 들여다보기
            </span>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/fragment/${fragment.id}/edit`)}
              className="text-[rgba(160,152,140,0.65)] hover:text-[rgba(120,112,100,0.7)]"
              aria-label="수정"
            >
              <Pencil size={16} strokeWidth={1.8} />
            </button>
            <button
              onClick={() => setIsDeleteOpen(true)}
              className="text-[rgba(160,152,140,0.65)] hover:text-red-400"
              aria-label="삭제"
            >
              <Trash2 size={16} strokeWidth={1.8} />
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col px-5 pt-5 pb-28">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[rgba(120,112,100,0.6)]">
            {metaLabel && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFEFB] pr-2">
                <div className="flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-[#e8e4dc]">
                  <div className="h-1.5 w-2 rounded-[1px] bg-[#c8c0b4]" />
                </div>
                <span style={{ fontFamily: "Inter, sans-serif" }}>{metaLabel}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="#c0b8b0" strokeWidth="1.2" />
                <path d="M6 3.5V6l1.5 1.5" stroke="#c0b8b0" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span style={{ fontFamily: "Inter, sans-serif" }}>{fragment.date}</span>
            </div>
          </div>

          {fragment.imageDataUrl && (
            <section className="mt-5 overflow-hidden rounded-[18px] border border-white/70 bg-[#FAF8F4]">
              <img
                src={fragment.imageDataUrl}
                alt=""
                className="h-[220px] w-full object-cover"
              />
            </section>
          )}

          <section className="mt-7">
            <h1
              className="text-[21px] font-medium leading-[1.45] text-[#3a3228]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              {fragment.title}
            </h1>
          </section>

          {fragment.memo && (
            <section className="mt-8 flex flex-col gap-3">
              <span
                className="text-[11px] font-medium tracking-[0.6px] text-[rgba(120,112,100,0.65)]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                내 메모
              </span>
              <p
                className="text-[14px] leading-[1.7] text-[rgba(74,69,64,0.85)]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                {fragment.memo}
              </p>
            </section>
          )}

          {fragment.pokachips.length > 0 && (
            <section className="mt-8 flex flex-col gap-3">
              <span
                className="text-[11px] font-medium tracking-[0.6px] text-[rgba(120,112,100,0.65)]"
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
                      className="flex h-[30px] items-center rounded-[999px] border border-white/70 px-3 text-[12px] font-medium text-[#5a5248b0]"
                      style={{
                        backgroundColor: getPokachipColor(normalizedChip),
                        fontFamily: "'Pretendard Variable', sans-serif",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
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
                <div className="mt-6 mb-5 h-px bg-[rgba(120,112,100,0.18)]" />
              )}
              <section className={fragment.pokachips.length > 0 ? "" : "mt-8"}>
                <span
                  className="text-[11px] font-medium tracking-[0.6px] text-[rgba(120,112,100,0.65)]"
                  style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                >
                  원본 링크
                </span>
                <a
                  href={fragment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-2 rounded-[14px] border border-[rgba(120,112,100,0.16)] bg-[#FFFEFB] px-4 py-3"
                >
                  <ExternalLink size={13} className="shrink-0 text-[rgba(160,152,140,0.65)]" strokeWidth={1.8} />
                  <span
                    className="truncate text-[12px] text-[rgba(120,112,100,0.6)]"
                    style={{ fontFamily: "Inter, sans-serif" }}
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
          className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 px-5 pb-8 pt-4"
          style={{
            background: "linear-gradient(to top, #FFFEFB 65%, transparent)",
          }}
        >
          <button
            className="w-full rounded-full py-4 text-[15px] font-medium text-white"
            style={{
              background: "linear-gradient(135deg, #b0b8e8 0%, #9898d0 100%)",
              boxShadow: "0px 4px 20px rgba(153,152,208,0.35)",
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
            <div className="w-full max-w-[350px] rounded-2xl border border-white/80 bg-[#FFFEFB] p-5 shadow-[0_18px_50px_rgba(60,50,40,0.18)]">
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
