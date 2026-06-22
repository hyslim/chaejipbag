import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, X } from "lucide-react";
import { getPokachipColor, normalizePokachipName } from "@/data/fragments";
import { useFragments } from "@/hooks/useFragments";

const recentPokachips = [
  { label: "조명", bg: "rgba(238,216,152,0.45)" },
  { label: "글쓰기", bg: "rgba(238,196,208,0.45)" },
  { label: "유리", bg: "rgba(200,220,240,0.45)" },
  { label: "파랑", bg: "rgba(180,210,255,0.45)" },
  { label: "수조", bg: "rgba(168,220,232,0.45)" },
];

const koreanInitials = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

const getKoreanInitials = (value: string) =>
  Array.from(value)
    .map((character) => {
      const code = character.charCodeAt(0);
      if (code < 0xac00 || code > 0xd7a3) return character;
      return koreanInitials[Math.floor((code - 0xac00) / 588)];
    })
    .join("");

export const FragmentEdit = ({ params }: { params: { id: string } }) => {
  const [, navigate] = useLocation();
  const { fragments, getFragment, updateFragment } = useFragments();
  const fragment = getFragment(params.id);

  const [title, setTitle] = useState(fragment?.title ?? "");
  const [memo, setMemo] = useState(fragment?.memo ?? "");
  const [url, setUrl] = useState(fragment?.url ?? "");
  const [selectedChips, setSelectedChips] = useState<string[]>(
    Array.from(
      new Set((fragment?.pokachips ?? []).map(normalizePokachipName).filter(Boolean))
    )
  );
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
    const trimmed = normalizePokachipName(newChipInput);
    if (trimmed && !selectedChips.includes(trimmed)) {
      setSelectedChips((prev) => [...prev, trimmed]);
    }
    setNewChipInput("");
    setIsInputActive(false);
  };

  const selectCandidate = (label: string) => {
    const normalized = normalizePokachipName(label);
    if (normalized && normalized !== "추가" && !selectedChips.includes(normalized)) {
      setSelectedChips((prev) => [...prev, normalized]);
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
  const normalizedQuery = normalizePokachipName(newChipInput).toLocaleLowerCase("ko-KR");
  const autocompleteCandidates = isInputActive && normalizedQuery
    ? Array.from(
        new Set([
          ...recentPokachips.map((chip) => chip.label),
          ...fragments.flatMap((item) => item.pokachips ?? []).map(normalizePokachipName).filter(Boolean),
        ])
      )
        .filter((label) => {
          if (selectedChips.includes(label)) return false;
          const normalizedLabel = label.toLocaleLowerCase("ko-KR");
          return normalizedLabel.includes(normalizedQuery)
            || getKoreanInitials(label).includes(normalizedQuery);
        })
        .slice(0, 5)
    : [];

  const handleConfirm = () => {
    const pendingChip = normalizePokachipName(newChipInput);
    const nextChips = Array.from(
      new Set([
        ...selectedChips.map(normalizePokachipName).filter(Boolean),
        ...(pendingChip && pendingChip !== "추가" ? [pendingChip] : []),
      ])
    );

    updateFragment(fragment.id, {
      title,
      memo,
      url: url || undefined,
      pokachips: nextChips.length > 0 ? nextChips : ["임시조각"],
    });
    navigate(`/fragment/${fragment.id}`);
  };

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#f3f0ec]">
      <section className="flex min-h-screen w-full max-w-[390px] flex-col bg-[#faf8f4]">

        {/* 헤더 */}
        <header className="flex items-center border-b border-[#FAF7F2] bg-[#FFFEFB] px-4 pt-5 pb-4">
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

        <div className="flex-1 px-5 pt-4 flex flex-col gap-5 pb-36">

          {/* 출처 + 날짜 */}
          <div className="mb-1 flex items-center gap-3">
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
          <div className="flex flex-col gap-2">
            <label
              className="text-[11px] font-medium tracking-[0.6px] text-[#a0988c80]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 적어주세요"
              className="w-full rounded-xl border border-[#0000000a] bg-white px-4 py-3 text-[13.5px] leading-relaxed text-[#4a4540] placeholder-[#c0b8b080] outline-none shadow-[0px_1px_4px_#0000000a]"
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

            {/* 선택된 포카칩 */}
            {selectedChips.length > 0 && (
              <div className="flex flex-col gap-2 pt-1">
                <span
                  className="text-[11px] font-medium tracking-[0.5px] text-[#a0988c80]"
                  style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                >
                  선택한 조각
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedChips.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleChip(label)}
                      className="flex items-center gap-1 rounded-full border border-white/70 px-3 py-1"
                      style={{
                        backgroundColor: getPokachipColor(label),
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
                      }}
                    >
                      <span
                        className="text-[12px] font-medium text-[#5a5248b0]"
                        style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                      >
                        {label}
                      </span>
                      <X size={10} className="mt-[1px] text-[#8c8478]" strokeWidth={2.5} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isInputActive ? (
              <div className="flex items-center gap-2 rounded-xl border border-[#0000000a] bg-white px-4 py-3 shadow-[0px_1px_4px_#0000000a]">
                <span className="shrink-0 text-[12px] text-[#b8b0a8]">+</span>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newChipInput}
                    onChange={(e) => setNewChipInput(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    onBlur={() => {
                      if (!newChipInput.trim()) setIsInputActive(false);
                    }}
                    autoComplete="off"
                    placeholder="새 조각 이름..."
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-[#4a4540] placeholder-[#c0b8b080] outline-none"
                    style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                  />
                  {newChipInput.trim() && (
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); addNewChip(); }}
                      className="shrink-0 rounded-full bg-[#9898d0] px-2.5 py-0.5 text-[11px] font-medium text-white"
                    >
                      추가
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleActivateInput}
                className="flex w-full items-center gap-2 rounded-xl border border-[#0000000a] bg-white px-4 py-3 text-left shadow-[0px_1px_4px_#0000000a]"
              >
                <span className="text-[12px] text-[#b8b0a8]">+</span>
                <span className="text-[13px] text-[#c0b8b080]">새로운 조각이름 달기</span>
              </button>
            )}

            {autocompleteCandidates.length > 0 && (
              <div className="mt-1 overflow-hidden rounded-xl border border-[#0000000a] bg-white shadow-[0px_2px_8px_#0000000a]">
                {autocompleteCandidates.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectCandidate(label);
                    }}
                    className={`flex w-full items-center px-4 py-2.5 text-left text-[13px] text-[#5a5248] ${
                      index > 0 ? "border-t border-[#00000008]" : ""
                    }`}
                    style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <span
                className="text-[11px] font-medium tracking-[0.5px] text-[#a0988c80]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                최근 사용
              </span>
              {visibleRecent.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {visibleRecent.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => toggleChip(chip.label)}
                      className="h-[30px] rounded-full border border-white/70 px-3 text-[12px] font-medium text-[#5a5248b0]"
                      style={{
                        backgroundColor: getPokachipColor(chip.label),
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-1 text-[12px] text-[#c0b8b060]">
                  최근 사용한 조각이 없어요
                </div>
              )}
            </div>

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
