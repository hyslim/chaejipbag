import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, X } from "lucide-react";
import { pokachipColorMap } from "@/data/fragments";
import { useFragments } from "@/hooks/useFragments";

const recentPokachips = [
  { label: "조명", bg: "rgba(238,216,152,0.45)" },
  { label: "글쓰기", bg: "rgba(238,196,208,0.45)" },
  { label: "유리", bg: "rgba(200,220,240,0.45)" },
  { label: "파랑", bg: "rgba(180,210,255,0.45)" },
  { label: "수조", bg: "rgba(168,220,232,0.45)" },
];

export const FragmentEdit = ({ params }: { params: { id: string } }) => {
  const [, navigate] = useLocation();
  const { getFragment, updateFragment } = useFragments();
  const fragment = getFragment(params.id);

  const [title, setTitle] = useState(fragment?.title ?? "");
  const [memo, setMemo] = useState(fragment?.memo ?? "");
  const [url, setUrl] = useState(fragment?.url ?? "");
  const [selectedChips, setSelectedChips] = useState<string[]>(fragment?.pokachips ?? []);
  const [newChipInput, setNewChipInput] = useState("");
  const [isInputActive, setIsInputActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!fragment) {
    return (
      <main className="flex min-h-screen w-full justify-center bg-[#f3f0ec]">
        <section className="flex min-h-screen w-full max-w-[390px] flex-col bg-[#faf8f4] px-5 pt-12">
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-[#787064b2]">
            <ArrowLeft size={16} />
            <span className="text-sm" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>돌아가기</span>
          </button>
          <p className="mt-8 text-sm text-[#a0988c]" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
            조각을 찾을 수 없어요.
          </p>
        </section>
      </main>
    );
  }

  const toggleChip = (label: string) => {
    setSelectedChips((prev) =>
      prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]
    );
  };

  const addNewChip = () => {
    const trimmed = newChipInput.trim();
    if (trimmed && !selectedChips.includes(trimmed)) {
      setSelectedChips((prev) => [...prev, trimmed]);
    }
    setNewChipInput("");
    setIsInputActive(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addNewChip();
    }
    if (e.key === "Escape") {
      setNewChipInput("");
      setIsInputActive(false);
    }
  };

  const handleActivateInput = () => {
    setIsInputActive(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const visibleRecent = recentPokachips.filter((c) => !selectedChips.includes(c.label));

  const handleConfirm = () => {
    updateFragment(fragment.id, {
      title,
      memo,
      url: url || undefined,
      pokachips: selectedChips,
    });
    navigate(`/fragment/${fragment.id}`);
  };

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#f3f0ec]">
      <section className="flex min-h-screen w-full max-w-[390px] flex-col bg-[#faf8f4]">

        {/* 헤더 */}
        <header className="flex items-center px-5 pt-12 pb-6">
          <button
            onClick={() => navigate(`/fragment/${fragment.id}`)}
            className="flex items-center gap-1.5"
            aria-label="뒤로 가기"
          >
            <ArrowLeft size={16} strokeWidth={2} className="text-[#787064b2]" />
            <span
              className="text-[15px] font-medium text-[#353a69b2]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              조각 정리 중
            </span>
          </button>
        </header>

        <div className="flex-1 px-5 flex flex-col gap-5 pb-36">

          {/* 출처 + 날짜 */}
          <div className="flex items-center gap-3">
            {fragment.source && (
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-sm bg-[#e8e4dc] flex items-center justify-center">
                  <div className="w-2 h-1.5 rounded-[1px] bg-[#c8c0b4]" />
                </div>
                <span className="text-[12px] text-[#a0988cb0]" style={{ fontFamily: "Inter, sans-serif" }}>
                  {fragment.source}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="#c0b8b0" strokeWidth="1.2" />
                <path d="M6 3.5V6l1.5 1.5" stroke="#c0b8b0" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span className="text-[12px] text-[#a0988c80]" style={{ fontFamily: "Inter, sans-serif" }}>
                {fragment.date}
              </span>
            </div>
          </div>

          {/* 제목 입력 */}
          <div className="flex items-start gap-2 border-l-2 border-[#d8d4cc] pl-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목 수정하기"
              className="flex-1 bg-transparent text-[17px] font-medium text-[#3a3228] placeholder-[#c0b8b080] outline-none leading-snug"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            />
          </div>

          {/* 내 메모 */}
          <div className="flex flex-col gap-2">
            <label
              className="text-[11px] font-medium tracking-[0.6px] text-[#a0988c80]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              내 메모
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="지금 이 순간의 발견을 담아두세요"
              rows={4}
              className="w-full rounded-xl border border-[#0000000a] bg-white px-4 py-3 text-[13.5px] leading-relaxed text-[#4a4540] placeholder-[#c0b8b080] outline-none resize-none shadow-[0px_1px_4px_#0000000a]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            />
          </div>

          {/* 기억 조각 */}
          <div className="flex flex-col gap-2.5">
            <label
              className="text-[11px] font-medium tracking-[0.6px] text-[#a0988c80]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              기억 조각
            </label>

            <div className="rounded-xl border border-[#0000000a] bg-white shadow-[0px_1px_4px_#0000000a] overflow-hidden">
              {/* 새 포카칩 입력 행 */}
              <div
                className="flex items-center gap-2 px-4 py-3 border-b border-[#0000000a] cursor-text"
                onClick={handleActivateInput}
              >
                <span className="text-[12px] text-[#b8b0a8] shrink-0" style={{ fontFamily: "Inter, sans-serif" }}>+</span>
                {isInputActive ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newChipInput}
                      onChange={(e) => setNewChipInput(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      onBlur={() => {
                        if (!newChipInput.trim()) setIsInputActive(false);
                      }}
                      placeholder="새 조각 이름..."
                      className="flex-1 bg-transparent text-[13px] text-[#4a4540] placeholder-[#c0b8b080] outline-none"
                      style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                    />
                    {newChipInput.trim() && (
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); addNewChip(); }}
                        className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium text-white"
                        style={{ backgroundColor: "#9898d0" }}
                      >
                        추가
                      </button>
                    )}
                  </div>
                ) : (
                  <span
                    className="text-[13px] text-[#c0b8b080]"
                    style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                  >
                    새로운 조각이름 달기
                  </span>
                )}
              </div>

              {/* 최근 사용한 포카칩 — 최대 5개, 선택된 항목 제외 */}
              {visibleRecent.map((chip, idx) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => toggleChip(chip.label)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#00000004] text-left ${idx < visibleRecent.length - 1 ? "border-b border-[#0000000a]" : ""}`}
                >
                  <span className="text-[12px] text-[#c0b8b0]" style={{ fontFamily: "Inter, sans-serif" }}>+</span>
                  <span className="text-[13px] text-[#5a5248b0]" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
                    {chip.label}
                  </span>
                </button>
              ))}

              {visibleRecent.length === 0 && !isInputActive && (
                <div className="px-4 py-3 text-[12px] text-[#c0b8b060]" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
                  최근 사용한 조각이 없어요
                </div>
              )}
            </div>

            {/* 선택된 포카칩 */}
            {selectedChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedChips.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleChip(label)}
                    className="flex items-center gap-1 rounded-full px-3 py-1 border border-white/70"
                    style={{
                      backgroundColor: pokachipColorMap[label] ?? "rgba(200,196,188,0.45)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
                    }}
                  >
                    <span
                      className="text-[12px] font-medium text-[#5a5248b0]"
                      style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                    >
                      {label}
                    </span>
                    <X size={10} className="text-[#8c8478] mt-[1px]" strokeWidth={2.5} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 원본 링크 */}
          <div className="flex flex-col gap-2">
            <label
              className="text-[11px] font-medium tracking-[0.6px] text-[#a0988c80]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              원본 링크
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-[#0000000a] bg-white px-3.5 py-3 shadow-[0px_1px_4px_#0000000a]">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="shrink-0">
                <path d="M5 7.5a3 3 0 0 0 4.5.4l1.5-1.5a3 3 0 0 0-4.2-4.2L5.7 3.3" stroke="#c0b8b0" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M8 5.5a3 3 0 0 0-4.5-.4L2 6.6a3 3 0 0 0 4.2 4.2l1.1-1.1" stroke="#c0b8b0" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="youtube.com/watch?v="
                className="flex-1 bg-transparent text-[12px] text-[#787064b0] placeholder-[#c0b8b060] outline-none"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
            </div>
          </div>

        </div>

        {/* 확인 버튼 */}
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] px-5 pb-8 pt-4"
          style={{ background: "linear-gradient(to top, #faf8f4 65%, transparent)" }}
        >
          <button
            onClick={handleConfirm}
            className="w-full rounded-full py-4 text-white text-[15px] font-medium"
            style={{
              background: "linear-gradient(135deg, #b0b8e8 0%, #9898d0 100%)",
              boxShadow: "0px 4px 20px rgba(153,152,208,0.35)",
              fontFamily: "'Pretendard Variable', sans-serif",
            }}
          >
            확인
          </button>
        </div>

      </section>
    </main>
  );
};
