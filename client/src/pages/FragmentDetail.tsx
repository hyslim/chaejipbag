import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Pencil, Trash2, ExternalLink } from "lucide-react";
import { pokachipColorMap } from "@/data/fragments";
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
        <section className="flex min-h-screen w-full max-w-[390px] flex-col bg-[#faf8f4] px-5 pt-12">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-[#787064b2] mb-8"
          >
            <ArrowLeft size={16} />
            <span className="text-sm" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
              돌아가기
            </span>
          </button>
          <p className="text-sm text-[#a0988c]" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
            조각을 찾을 수 없어요.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#f3f0ec]">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex min-h-screen w-full max-w-[390px] flex-col bg-[#faf8f4]"
      >
        {/* 헤더 */}
        <header className="flex items-center justify-between border-b border-[#FAF7F2] bg-[#FFFEFB] px-4 pt-5 pb-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-[#787064b2]"
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
              className="text-[#a0988c90] hover:text-[#787064]"
              aria-label="수정"
            >
              <Pencil size={16} strokeWidth={1.8} />
            </button>
            <button
              onClick={() => setIsDeleteOpen(true)}
              className="text-[#a0988c90] hover:text-red-400"
              aria-label="삭제"
            >
              <Trash2 size={16} strokeWidth={1.8} />
            </button>
          </div>
        </header>

        <div className="flex-1 px-5 pt-4 flex flex-col gap-6 pb-36">
          {/* 출처 + 날짜 */}
          <div className="flex items-center gap-3">
            {fragment.source && (
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-sm bg-[#e8e4dc] flex items-center justify-center">
                  <div className="w-2 h-1.5 rounded-[1px] bg-[#c8c0b4]" />
                </div>
                <span
                  className="text-[12px] text-[#a0988cb0]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {fragment.source}
                </span>
              </div>
            )}
            {!fragment.source && fragment.sourceType && (
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-sm bg-[#e8e4dc] flex items-center justify-center">
                  <div className="w-2 h-1.5 rounded-[1px] bg-[#c8c0b4]" />
                </div>
                <span
                  className="text-[12px] text-[#a0988cb0]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {sourceTypeLabel[fragment.sourceType] ?? "기록"}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="#c0b8b0" strokeWidth="1.2" />
                <path d="M6 3.5V6l1.5 1.5" stroke="#c0b8b0" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span
                className="text-[12px] text-[#a0988c80]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {fragment.date}
              </span>
            </div>
          </div>

          {/* 제목 */}
          <div>
            <h1
              className="text-[20px] font-medium leading-[1.45] text-[#2a2620]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              {fragment.title}
            </h1>
          </div>

          {/* 구분선 */}
          <div className="h-px bg-[#0000000a]" />

          {/* 내 메모 */}
          {fragment.memo && (
            <div className="flex flex-col gap-2">
              <span
                className="text-[11px] font-medium tracking-[0.6px] text-[#a0988c80]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                내 메모
              </span>
              <p
                className="text-[14px] leading-[1.7] text-[#4a4540]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                {fragment.memo}
              </p>
            </div>
          )}

          {/* 기억 조각 (포카칩) */}
          {fragment.pokachips.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <span
                className="text-[11px] font-medium tracking-[0.6px] text-[#a0988c80]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                기억 조각
              </span>
              <div className="flex flex-wrap gap-1.5">
                {fragment.pokachips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full px-3 py-1.5 text-[12px] font-medium text-[#5a5248b0] border border-white/70"
                    style={{
                      backgroundColor: pokachipColorMap[chip] ?? "rgba(200,196,188,0.4)",
                      fontFamily: "'Pretendard Variable', sans-serif",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
                    }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 원본 링크 */}
          {fragment.url && (
            <div className="flex flex-col gap-2.5">
              <span
                className="text-[11px] font-medium tracking-[0.6px] text-[#a0988c80]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                원본 링크
              </span>
              <a
                href={fragment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-[#0000000a] bg-white px-3.5 py-3 shadow-[0px_1px_4px_#0000000a]"
              >
                <ExternalLink size={13} className="text-[#a0988c80] shrink-0" strokeWidth={1.8} />
                <span
                  className="text-[12px] text-[#787064b0] truncate"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {fragment.url.replace(/^https?:\/\//, "")}
                </span>
              </a>
            </div>
          )}
        </div>

        {/* 하단 공유 버튼 */}
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] px-5 pb-8 pt-4"
          style={{
            background: "linear-gradient(to top, #faf8f4 65%, transparent)",
          }}
        >
          <button
            className="w-full rounded-full py-4 text-white text-[15px] font-medium"
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
