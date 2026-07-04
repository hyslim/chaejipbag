import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { X } from "lucide-react";
import { getPokachipColor, normalizePokachipName } from "@/data/fragments";
import { useFragments } from "@/hooks/useFragments";

const thumbnailColors = ["#f0e8d0", "#f0dce4", "#d4eef4", "#d8eef8", "#dce8f8"];
const recentPokachips = ["글쓰기", "수조", "조명", "웹앱", "블렌더"];
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

const getPokachipShadowColor = (label: string) => {
  const color = getPokachipColor(label);
  const rgbaMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);

  if (rgbaMatch) {
    const [, red, green, blue] = rgbaMatch;
    return `rgba(${red},${green},${blue},0.32)`;
  }

  const hexMatch = color.match(/^#([0-9a-f]{6})$/i);

  if (hexMatch) {
    const hex = hexMatch[1];
    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);
    return `rgba(${red},${green},${blue},0.32)`;
  }

  return color;
};

const parseChipInput = (value: string) =>
  value
    .split(",")
    .map(normalizePokachipName)
    .filter((tag) => tag && tag !== "추가");

export const FragmentCreate = () => {
  const [, navigate] = useLocation();
  const { addFragment, fragments } = useFragments();
  const [memo, setMemo] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [isInputActive, setIsInputActive] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();
  const selectedChipsRef = useRef<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const commitSelectedChips = (nextChips: string[]) => {
    selectedChipsRef.current = nextChips;
    setSelectedChips(nextChips);
  };

  const toggleChip = (label: string) => {
    const currentChips = selectedChipsRef.current;
    const nextChips = currentChips.includes(label)
      ? currentChips.filter((chip) => chip !== label)
      : [...currentChips, label];

    commitSelectedChips(nextChips);
  };

  const removeChip = (label: string) => {
    commitSelectedChips(selectedChipsRef.current.filter((chip) => chip !== label));
  };

  const addInputChips = () => {
    const enteredTags = parseChipInput(tagInput);
    if (enteredTags.length === 0) return;

    const nextChips = Array.from(new Set([...selectedChipsRef.current, ...enteredTags]));
    commitSelectedChips(nextChips);
    setTagInput("");
    setIsInputActive(false);
  };

  const handleTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addInputChips();
    }
  };

  const handleActivateInput = () => {
    setIsInputActive(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const visibleRecentChips = recentPokachips
    .map(normalizePokachipName)
    .filter((chip) => chip && chip !== "추가" && !selectedChips.includes(chip));

  const normalizedQuery = normalizePokachipName(tagInput).toLocaleLowerCase("ko-KR");
  const autocompleteCandidates = useMemo(() => {
    if (!isInputActive || !normalizedQuery) return [];

    const selectedChipSet = new Set(
      selectedChips.map(normalizePokachipName).filter(Boolean)
    );

    return Array.from(
      new Set([
        ...recentPokachips.map(normalizePokachipName).filter(Boolean),
        ...fragments
          .flatMap((fragment) => fragment.pokachips ?? [])
          .map(normalizePokachipName)
          .filter(Boolean),
      ])
    )
      .filter((label) => {
        if (selectedChipSet.has(label) || label === "추가") return false;
        return label.toLocaleLowerCase("ko-KR").includes(normalizedQuery);
      })
      .slice(0, 5);
  }, [fragments, isInputActive, normalizedQuery, selectedChips]);

  const selectAutocompleteCandidate = (label: string) => {
    const normalized = normalizePokachipName(label);
    if (normalized && normalized !== "추가" && !selectedChipsRef.current.includes(normalized)) {
      commitSelectedChips([...selectedChipsRef.current, normalized]);
    }
    setTagInput("");
    setIsInputActive(false);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      alert("이미지는 2MB 이하로 선택해주세요.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const canSave = Boolean(memo.trim() || imageDataUrl);

  const handleSave = () => {
    const trimmedMemo = memo.trim();
    if (!canSave) return;

    const firstLine = trimmedMemo.split(/\r?\n/)[0].trim();
    const title = firstLine
      ? firstLine.length > 30 ? `${firstLine.slice(0, 30)}…` : firstLine
      : "이미지 조각";
    const enteredTags = Array.from(new Set([...selectedChipsRef.current, ...parseChipInput(tagInput)]));
    const pokachips = enteredTags.length > 0 ? [...enteredTags] : ["임시조각"];
    const now = new Date();
    const newFragment = addFragment({
      title,
      memo: trimmedMemo,
      url: undefined,
      source: "직접 입력",
      sourceType: "text",
      time: "방금",
      date: new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(now),
      pokachips,
      thumbnailColor: thumbnailColors[now.getTime() % thumbnailColors.length],
      ...(imageDataUrl ? { imageDataUrl } : {}),
    });

    navigate(`/fragment/${newFragment.id}`);
  };

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#f3f0ec]">
      <section className="flex min-h-screen w-full max-w-[390px] flex-col bg-[#FFFEFB]">
        <header className="flex flex-col border-b border-[rgba(250,247,242,0.5)] bg-[#FCFBF8] px-5 pt-6 pb-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mb-1 flex items-center gap-1.5 text-[rgba(120,112,100,0.7)]"
            aria-label="홈으로 돌아가기"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3.5 5.5 8 10 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[13px] font-medium" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
              가방으로
            </span>
          </button>
          <h1
            className="text-[22px] font-medium leading-[1.4] text-[#353a69b2]"
            style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
          >
            어떤 조각을 주웠나요?
          </h1>
        </header>

        <div className="flex flex-1 flex-col gap-4 bg-[#FFFEFB] px-5 pt-5 pb-36">
          <div className="overflow-hidden rounded-[18px] border border-[rgba(0,0,0,0.04)] bg-[#FFFFFF] shadow-[0_4px_16px_rgba(80,70,55,0.06)]">
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder={"링크, 텍스트, 짧은 생각\n지금 이 순간의 발견을 담아두세요"}
              rows={5}
              className="w-full resize-none bg-transparent px-4 py-4 text-[14px] leading-relaxed text-[#4a4540] outline-none placeholder:text-[#a8a09a99]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            />
            <div className="border-t border-[#FAF7F2] p-2.5">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FAF8F4] py-3 text-[13px] font-medium text-[rgba(120,112,100,0.6)]"
              >
                {imageDataUrl ? (
                  <img
                    src={imageDataUrl}
                    alt=""
                    className="h-[148px] w-full rounded-[14px] object-cover"
                  />
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                      <rect x="2" y="2.5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
                      <circle cx="5" cy="5.5" r="1" fill="currentColor" />
                      <path d="m3.8 10 2.3-2.3 1.7 1.6 1.4-1.2 2 1.9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    이미지
                  </>
                )}
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <label
              htmlFor="new-fragment-tags"
              className="text-[12px] font-medium text-[#787064b0]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              기억 조각
            </label>
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
                    <div
                      key={label}
                      className="flex items-center gap-1 rounded-full border border-white/70 px-3 py-1"
                      style={{
                        backgroundColor: getPokachipColor(label),
                        boxShadow: `0 1px 4px ${getPokachipShadowColor(label)}, inset 0 1px 0 rgba(255,255,255,0.8)`,
                      }}
                    >
                      <span
                        className="text-[12px] font-medium text-[#5a5248b0]"
                        style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                      >
                        {label}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeChip(label)}
                        className="-mr-1 flex h-4 w-4 items-center justify-center rounded-full text-[#8c8478]"
                        aria-label={`${label} 삭제`}
                      >
                        <X size={10} className="mt-[1px]" strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <span className="text-[11px] font-medium tracking-[0.5px] text-[#a0988c80]">
                최근 사용
              </span>
              {visibleRecentChips.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {visibleRecentChips.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleChip(label)}
                      className="h-[30px] rounded-[999px] border border-white/70 px-3 text-[12px] font-medium text-[#5a5248b0]"
                      style={{
                        backgroundColor: getPokachipColor(label),
                        boxShadow: `0 1px 4px ${getPokachipShadowColor(label)}, inset 0 1px 0 rgba(255,255,255,0.7)`,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-1 text-[12px] text-[#c0b8b060]">
                  최근 사용한 조각이 없어요
                </div>
              )}
            </div>

            {isInputActive ? (
              <div className="flex items-center gap-2 rounded-xl border border-[#0000000a] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(80,70,55,0.04)]">
                <span className="shrink-0 text-[12px] text-[#b8b0a8]">+</span>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    ref={inputRef}
                    id="new-fragment-tags"
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={() => {
                      if (!tagInput.trim()) setIsInputActive(false);
                    }}
                    autoComplete="off"
                    placeholder="새 조각 이름..."
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-[#4a4540] outline-none placeholder:text-[#a8a09a80]"
                    style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                  />
                  {tagInput.trim() && (
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        addInputChips();
                      }}
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
                className="flex w-full items-center gap-2 rounded-xl border border-[#0000000a] bg-white px-4 py-3 text-left shadow-[0_2px_8px_rgba(80,70,55,0.04)]"
              >
                <span className="text-[12px] text-[#b8b0a8]">+</span>
                <span className="text-[13px] text-[#a8a09a80]">새로운 조각이름 달기</span>
              </button>
            )}

            {autocompleteCandidates.length > 0 && (
              <div className="mt-1 overflow-hidden rounded-xl border border-[#0000000a] bg-white shadow-[0_2px_8px_rgba(80,70,55,0.04)]">
                {autocompleteCandidates.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectAutocompleteCandidate(label);
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
          </div>
        </div>

        <div
          className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 px-5 pb-8 pt-5"
          style={{ background: "linear-gradient(to top, #FFFEFB 68%, transparent)" }}
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="w-full rounded-full py-4 text-[15px] font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #9edcff 0%, #8e88ed 100%)",
              boxShadow: "0 4px 18px rgba(126,135,220,0.28)",
              fontFamily: "'Pretendard Variable', sans-serif",
            }}
          >
            기억 남기기
          </button>
        </div>
      </section>
    </main>
  );
};
