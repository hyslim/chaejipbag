import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { X } from "lucide-react";
import { getPokachipColor, normalizePokachipName } from "@/data/fragments";
import { useFragments } from "@/hooks/useFragments";

const defaultQuickChips = ["글쓰기", "수조", "조명", "웹앱", "블렌더"];

const getUrlHostname = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};

export const QuickSave = () => {
  const [, navigate] = useLocation();
  const { fragments, addFragment } = useFragments();
  const params = new URLSearchParams(window.location.search);
  const sharedTitle = params.get("title")?.trim() ?? "";
  const sharedText = params.get("text")?.trim() ?? "";
  const sharedUrl = params.get("url")?.trim() ?? "";
  const [memo, setMemo] = useState(sharedText);
  const [chipInput, setChipInput] = useState("");
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [isInputActive, setIsInputActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmedMemo = memo.trim();
  const canSave = Boolean(sharedUrl.trim() || trimmedMemo || sharedText.trim());
  const sharedHostname = sharedUrl ? getUrlHostname(sharedUrl) : "";
  const fallbackTitleSource = trimmedMemo || sharedText;
  const displayTitle = (
    sharedTitle ||
    fallbackTitleSource.split(/\r?\n/)[0].trim() ||
    sharedHostname ||
    "링크 조각"
  ).slice(0, 30);

  const getCleanChipName = (value: string) => {
    const normalized = normalizePokachipName(value);
    return normalized && normalized !== "추가" ? normalized : "";
  };

  const parseChipInput = (value: string) =>
    value
      .split(",")
      .map(getCleanChipName)
      .filter(Boolean);

  const recentChips = Array.from(
    new Set(
      fragments
        .flatMap((fragment) => fragment.pokachips ?? [])
        .map(getCleanChipName)
        .filter(Boolean)
    )
  ).slice(0, 5);
  const visibleRecentChips = Array.from(
    new Set((recentChips.length > 0 ? recentChips : defaultQuickChips).map(getCleanChipName).filter(Boolean))
  ).filter((chip) => !selectedChips.includes(chip));

  const toggleChip = (chip: string) => {
    const normalized = getCleanChipName(chip);
    if (!normalized) return;

    setSelectedChips((current) =>
      current.includes(normalized)
        ? current.filter((item) => item !== normalized)
        : [...current, normalized]
    );
  };

  const removeChip = (chip: string) => {
    setSelectedChips((current) => current.filter((item) => item !== chip));
  };

  const addInputChips = () => {
    const inputChips = parseChipInput(chipInput);
    if (inputChips.length === 0) return;

    setSelectedChips((current) => Array.from(new Set([...current, ...inputChips])));
    setChipInput("");
    setIsInputActive(false);
  };

  const handleChipKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addInputChips();
    }
  };

  const handleActivateInput = () => {
    setIsInputActive(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSave = () => {
    if (!canSave) return;

    const inputChips = parseChipInput(chipInput);
    const pokachips = Array.from(new Set([...selectedChips, ...inputChips]));
    const now = new Date();

    addFragment({
      title: displayTitle,
      memo: trimmedMemo || sharedText || undefined,
      url: sharedUrl || undefined,
      source: sharedHostname || undefined,
      sourceType: sharedUrl ? "link" : "text",
      time: "방금",
      date: new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(now),
      pokachips: pokachips.length > 0 ? pokachips : ["임시조각"],
      thumbnailColor: "#dce8f8",
    });
    navigate("/");
  };

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#f3f0ec]">
      <section className="min-h-screen w-full max-w-[390px] bg-[#FFFEFB] px-4 pb-28 pt-6">
        <button type="button" onClick={() => navigate("/")} className="text-[13px] text-[#787064b2]">닫기</button>
        <p className="mt-6 text-[12px] font-medium text-[#78706499]">외부 공유에서 주운 조각</p>
        <h1 className="mt-1 text-[22px] font-medium leading-snug text-[#353a69cc]">{displayTitle}</h1>
        <p className="mt-2 truncate text-[12px] text-[#a0988c]">{sharedUrl}</p>

        <label className="mt-7 block text-[12px] font-medium text-[#78706499]">한 줄 메모</label>
        <input
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-[#FAF7F2] bg-white px-4 py-3 text-[14px] text-[#3a3228] outline-none"
        />

        <label className="mt-5 block text-[12px] font-medium text-[#78706499]">기억 조각</label>
        {selectedChips.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-[11px] font-medium text-[#a0988c80]">선택한 조각</p>
            <div className="flex flex-wrap gap-2">
              {selectedChips.map((chip) => (
                <div
                  key={chip}
                  className="flex items-center gap-1 rounded-full border border-white/70 px-3.5 py-1.5 text-[12px] font-medium text-[#5a5248b0]"
                  style={{ backgroundColor: getPokachipColor(chip) }}
                >
                  <span>{chip}</span>
                  <button
                    type="button"
                    onClick={() => removeChip(chip)}
                    className="-mr-1 flex h-4 w-4 items-center justify-center rounded-full text-[#8c8478]"
                    aria-label={`${chip} 삭제`}
                  >
                    <X size={10} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-4 text-[11px] font-medium text-[#a0988c80]">최근 사용 조각</p>
        {visibleRecentChips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {visibleRecentChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => toggleChip(chip)}
                className="rounded-full border border-white/70 px-3.5 py-1.5 text-[12px] font-medium text-[#5a5248b0]"
                style={{ backgroundColor: getPokachipColor(chip) }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {isInputActive ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#FAF7F2] bg-white px-4 py-3">
            <span className="shrink-0 text-[12px] text-[#b8b0a8]">+</span>
            <input
              ref={inputRef}
              value={chipInput}
              onChange={(event) => setChipInput(event.target.value)}
              onKeyDown={handleChipKeyDown}
              onBlur={() => {
                if (!chipInput.trim()) setIsInputActive(false);
              }}
              placeholder="쉼표로 여러 조각 입력"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[#3a3228] outline-none placeholder:text-[#a0988c80]"
            />
            {chipInput.trim() && (
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
        ) : (
          <button
            type="button"
            onClick={handleActivateInput}
            className="mt-4 flex w-full items-center gap-2 rounded-2xl border border-[#FAF7F2] bg-white px-4 py-3 text-left"
          >
            <span className="text-[12px] text-[#b8b0a8]">+</span>
            <span className="text-[13px] text-[#a0988c80]">새로운 조각이름 달기</span>
          </button>
        )}

        <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-gradient-to-t from-[#FFFEFB] px-4 pb-8 pt-5">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            aria-disabled={!canSave}
            className="w-full rounded-full bg-[#8e88ed] py-4 text-[15px] font-medium text-white shadow-[0_4px_18px_rgba(126,135,220,0.24)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            기억에 담기
          </button>
        </div>
      </section>
    </main>
  );
};
