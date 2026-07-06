import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { X } from "lucide-react";
import { getPokachipColor, normalizePokachipName } from "@/data/fragments";
import { useFragments } from "@/hooks/useFragments";

const defaultQuickChips = ["글쓰기", "수조", "조명", "웹앱", "블렌더"];
const urlPattern = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/i;
const trailingUrlPunctuationPattern = /[),.;!?]+$/;

const normalizeSharedUrl = (url: string) => {
  const trimmedUrl = url.trim().replace(trailingUrlPunctuationPattern, "");
  return trimmedUrl.startsWith("www.") ? `https://${trimmedUrl}` : trimmedUrl;
};

const getFirstUrl = (value: string) => {
  const matchedUrl = value.match(urlPattern)?.[0];
  if (!matchedUrl) return undefined;

  return {
    raw: matchedUrl,
    normalized: normalizeSharedUrl(matchedUrl),
  };
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const removeRepeatedUrl = (value: string, urls: string[]) => {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));

  return uniqueUrls
    .reduce((memo, url) => memo.replace(new RegExp(escapeRegExp(url), "g"), " "), value)
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
};

const getUrlHostname = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const getSourceLabel = (hostname: string) => {
  const lowerHostname = hostname.toLocaleLowerCase("en-US");

  if (lowerHostname.includes("instagram.com")) return "인스타그램 조각";
  if (lowerHostname.includes("youtube.com") || lowerHostname.includes("youtu.be")) return "YouTube 조각";
  if (lowerHostname.includes("pinterest.com")) return "Pinterest 조각";
  if (hostname) return `${hostname} 조각`;

  return "링크 조각";
};

export const QuickSave = () => {
  const [, navigate] = useLocation();
  const { fragments, addFragment } = useFragments();
  const params = new URLSearchParams(window.location.search);
  const sharedTitle = params.get("title")?.trim() ?? "";
  const sharedText = params.get("text")?.trim() ?? "";
  const urlParam = params.get("url")?.trim() ?? "";
  const titleUrl = getFirstUrl(sharedTitle);
  const textUrl = getFirstUrl(sharedText);
  const sharedUrl = urlParam ? normalizeSharedUrl(urlParam) : textUrl?.normalized ?? titleUrl?.normalized ?? "";
  const urlCandidates = [
    sharedUrl,
    urlParam,
    titleUrl?.raw ?? "",
    titleUrl?.normalized ?? "",
    textUrl?.raw ?? "",
    textUrl?.normalized ?? "",
  ];
  const cleanSharedTitle = removeRepeatedUrl(sharedTitle, urlCandidates);
  const cleanSharedText = removeRepeatedUrl(sharedText, urlCandidates);
  const initialMemo = cleanSharedText;
  const [memo, setMemo] = useState(initialMemo);
  const [chipInput, setChipInput] = useState("");
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [isInputActive, setIsInputActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmedMemo = memo.trim();
  const canSave = Boolean(sharedUrl || trimmedMemo || cleanSharedTitle || cleanSharedText);
  const sharedHostname = sharedUrl ? getUrlHostname(sharedUrl) : "";
  const sourceLabel = getSourceLabel(sharedHostname);
  const sharedTextTitle = cleanSharedText.split(/\r?\n/)[0].trim();
  const displayTitle = (
    cleanSharedTitle ||
    sharedTextTitle ||
    sourceLabel
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

    const newFragment = addFragment({
      title: displayTitle,
      memo: trimmedMemo || undefined,
      url: sharedUrl || undefined,
      source: sharedHostname || undefined,
      sourceType: sharedUrl ? "link" : "text",
      time: "방금",
      date: new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(now),
      pokachips: pokachips.length > 0 ? pokachips : ["임시조각"],
      thumbnailColor: "#dce8f8",
    });
    navigate(`/fragment/${newFragment.id}`);
  };

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#eee9e1]">
      <section
        className="relative min-h-screen w-full max-w-[390px] overflow-hidden bg-[#FAF8F4] px-4 pb-32 pt-5"
        style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[160px] bg-[#FFFEFB]" />
        <div className="relative mx-auto flex w-full max-w-[350px] flex-col">
          <header className="flex items-center justify-between py-2">
            <p className="text-[12px] font-medium text-[rgba(120,112,100,0.66)]">QuickSave</p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex h-8 items-center rounded-full px-2.5 text-[13px] font-medium text-[rgba(120,112,100,0.75)]"
            >
              닫기
            </button>
          </header>

          <div className="mt-5 rounded-[24px] border border-white/80 bg-[#FFFEFB] px-4 pb-5 pt-4 shadow-[0_14px_42px_rgba(80,70,55,0.13)]">
            <p className="text-[12px] font-medium text-[rgba(120,112,100,0.72)]">외부에서 주운 조각</p>
            <div className="mt-3 rounded-[18px] bg-[#FAF8F4] px-4 py-3">
              <span className="block text-[11px] font-medium text-[rgba(120,112,100,0.52)]">제목</span>
              <h1 className="mt-1 line-clamp-2 text-[20px] font-medium leading-snug text-[rgba(54,58,105,0.72)]">
                {displayTitle}
              </h1>
            </div>

            <div className="mt-2.5 rounded-[18px] border border-[#FAF7F2] bg-white px-4 py-3">
              <span className="block text-[11px] font-medium text-[rgba(120,112,100,0.52)]">URL</span>
              <p className="mt-1 truncate text-[13px] text-[rgba(74,69,64,0.72)]">
                {sharedUrl || "원본 링크 없음"}
              </p>
            </div>

            <label className="mt-4 block text-[12px] font-medium text-[rgba(120,112,100,0.75)]" htmlFor="quick-save-memo">
              한 줄 메모
            </label>
            <textarea
              id="quick-save-memo"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              rows={3}
              placeholder="나중에 떠올릴 힌트를 짧게 남겨두세요"
              className="mt-2 w-full resize-none rounded-[18px] border border-[#FAF7F2] bg-white px-4 py-3 text-[14px] leading-relaxed text-[rgba(50,44,34,0.82)] outline-none placeholder:text-[rgba(120,112,100,0.42)]"
            />

            <div className="mt-5 flex flex-col gap-2.5">
              <label className="text-[12px] font-medium text-[rgba(120,112,100,0.75)]">기억 조각</label>
              {selectedChips.length > 0 && (
                <div className="flex flex-col gap-2 pt-1">
                  <span className="text-[11px] font-medium tracking-[0.5px] text-[rgba(120,112,100,0.55)]">
                    선택한 조각
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedChips.map((chip) => (
                      <div
                        key={chip}
                        className="flex items-center gap-1 rounded-full border border-white/70 px-3 py-1 text-[12px] font-medium text-[#5a5248b0] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                        style={{ backgroundColor: getPokachipColor(chip) }}
                      >
                        <span>{chip}</span>
                        <button
                          type="button"
                          onClick={() => removeChip(chip)}
                          className="-mr-1 flex h-4 w-4 items-center justify-center rounded-full text-[#8c8478]"
                          aria-label={`${chip} 삭제`}
                        >
                          <X size={10} className="mt-[1px]" strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <span className="text-[11px] font-medium tracking-[0.5px] text-[rgba(120,112,100,0.55)]">
                  최근 사용
                </span>
                {visibleRecentChips.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {visibleRecentChips.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => toggleChip(chip)}
                        className="h-[30px] rounded-[999px] border border-white/70 px-3 text-[12px] font-medium text-[#5a5248b0] shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]"
                        style={{ backgroundColor: getPokachipColor(chip) }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-1 text-[12px] text-[rgba(120,112,100,0.45)]">
                    최근 사용한 조각이 없어요
                  </div>
                )}
              </div>

              {isInputActive ? (
                <div className="flex items-center gap-2 rounded-[16px] border border-[#FAF7F2] bg-white px-4 py-3">
                  <span className="shrink-0 text-[12px] text-[rgba(120,112,100,0.55)]">+</span>
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
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-[rgba(50,44,34,0.8)] outline-none placeholder:text-[rgba(120,112,100,0.45)]"
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
                  className="flex w-full items-center gap-2 rounded-[16px] border border-[#FAF7F2] bg-white px-4 py-3 text-left"
                >
                  <span className="text-[12px] text-[rgba(120,112,100,0.55)]">+</span>
                  <span className="text-[13px] text-[rgba(120,112,100,0.55)]">직접 입력</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 px-4 pb-8 pt-5" style={{ background: "linear-gradient(to top, #FAF8F4 70%, rgba(250,248,244,0))" }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            aria-disabled={!canSave}
            className="mx-auto flex h-[52px] w-full max-w-[350px] items-center justify-center rounded-full bg-[#8e88ed] text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(126,135,220,0.28),inset_0_1px_0_rgba(255,255,255,0.4)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            기억에 담기
          </button>
        </div>
      </section>
    </main>
  );
};
