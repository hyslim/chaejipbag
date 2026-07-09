import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { X } from "lucide-react";
import { getCleanPokachipName, getPokachipColor, getPokachipCandidates, getPokachipKey, getRecentPokachips, mergePokachips, parsePokachipInput } from "@/data/fragments";
import { useFragments } from "@/hooks/useFragments";

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

const getSourceLabel = (hostname: string, hasImage = false) => {
  const lowerHostname = hostname.toLocaleLowerCase("en-US");

  if (lowerHostname.includes("instagram.com")) return "\uc778\uc2a4\ud0c0\uadf8\ub7a8 \uc870\uac01";
  if (lowerHostname.includes("youtube.com") || lowerHostname.includes("youtu.be")) return "YouTube \uc601\uc0c1";
  if (lowerHostname.includes("pinterest.com")) return "Pinterest \uc870\uac01";
  if (hostname) return "\uacf5\uc720\ubc1b\uc740 \uae00";
  if (hasImage) return "\uc774\ubbf8\uc9c0 \uc870\uac01";

  return "\uacf5\uc720\ubc1b\uc740 \uae00";
};

const isUrlLike = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return false;

  if (urlPattern.test(trimmedValue)) return true;
  try {
    new URL(normalizeSharedUrl(trimmedValue));
    return true;
  } catch {
    return false;
  }
};

const normalizeSharedLine = (value: string) => value.replace(/\s+/g, " ").trim();

const getMeaningfulLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map(normalizeSharedLine)
    .filter((line) => line && !isUrlLike(line));

const getCompactTitle = (value: string) => {
  const normalizedTitle = normalizeSharedLine(value);
  return normalizedTitle.length > 36 ? `${normalizedTitle.slice(0, 35)}\u2026` : normalizedTitle;
};

const removeDuplicateTitleLine = (value: string, title: string) => {
  const titleKey = normalizeSharedLine(title);
  if (!titleKey) return value;

  return value
    .split(/\r?\n/)
    .map(normalizeSharedLine)
    .filter((line) => line && line !== titleKey)
    .join("\n");
};

type SharedTargetPayload = {
  title?: string;
  text?: string;
  url?: string;
  imageDataUrl?: string;
  imageError?: string;
};

type QuickSaveDefaults = {
  sharedUrl: string;
  sharedHostname: string;
  fallbackTitle: string;
  initialMemo: string;
};

const getQuickSaveDefaults = (sharedTitle: string, sharedText: string, urlParam: string, hasImage = false): QuickSaveDefaults => {
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
  const sharedHostname = sharedUrl ? getUrlHostname(sharedUrl) : "";
  const sourceLabel = getSourceLabel(sharedHostname, hasImage);
  const titleCandidate = cleanSharedTitle && !isUrlLike(cleanSharedTitle)
    ? cleanSharedTitle
    : getMeaningfulLines(cleanSharedText)[0] ?? "";
  const fallbackTitle = getCompactTitle(titleCandidate || sourceLabel);
  const initialMemo = removeDuplicateTitleLine(cleanSharedText, fallbackTitle);

  return { sharedUrl, sharedHostname, fallbackTitle, initialMemo };
};

export const QuickSave = () => {
  const [, navigate] = useLocation();
  const { fragments, addFragment, addFragmentWithImage } = useFragments();
  const params = new URLSearchParams(window.location.search);
  const sharedTitle = params.get("title")?.trim() ?? "";
  const sharedText = params.get("text")?.trim() ?? "";
  const urlParam = params.get("url")?.trim() ?? "";
  const shareId = params.get("shareId")?.trim() ?? "";
  const initialShare = getQuickSaveDefaults(sharedTitle, sharedText, urlParam);
  const [sharedUrl, setSharedUrl] = useState(initialShare.sharedUrl);
  const [sharedHostname, setSharedHostname] = useState(initialShare.sharedHostname);
  const [fallbackTitle, setFallbackTitle] = useState(initialShare.fallbackTitle);
  const [memo, setMemo] = useState(initialShare.initialMemo);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageError, setImageError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [chipInput, setChipInput] = useState("");
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [isInputActive, setIsInputActive] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmedMemo = memo.trim();
  const canSave = Boolean(sharedUrl || trimmedMemo || fallbackTitle || imageDataUrl);
  const [title, setTitle] = useState(fallbackTitle);

  useLayoutEffect(() => {
    titleRef.current?.blur();
  }, []);

  useEffect(() => {
    if (!shareId) return;

    let isCanceled = false;

    const loadSharedPayload = async () => {
      try {
        const payloadUrl = `/share-target-payloads/${encodeURIComponent(shareId)}`;
        const response = await fetch(payloadUrl, { cache: "no-store" });
        if (!response.ok) {
          setImageError("공유받은 내용을 불러오지 못했어요. 다시 공유해주세요.");
          return;
        }

        const payload = await response.json() as SharedTargetPayload;
        if (isCanceled) return;

        const nextShare = getQuickSaveDefaults(
          payload.title?.trim() ?? "",
          payload.text?.trim() ?? "",
          payload.url?.trim() ?? "",
          Boolean(payload.imageDataUrl)
        );

        setSharedUrl(nextShare.sharedUrl);
        setSharedHostname(nextShare.sharedHostname);
        setFallbackTitle(nextShare.fallbackTitle);
        setTitle(nextShare.fallbackTitle);
        setMemo(nextShare.initialMemo);
        setImageDataUrl(payload.imageDataUrl ?? "");
        setImageError(payload.imageError ?? "");

        void fetch(payloadUrl, { method: "DELETE" });
      } catch {
        if (!isCanceled) setImageError("\uacf5\uc720\ubc1b\uc740 \uc774\ubbf8\uc9c0\ub97c \uc77d\uc9c0 \ubabb\ud588\uc5b4\uc694.");
      }
    };

    void loadSharedPayload();

    return () => {
      isCanceled = true;
    };
  }, [shareId]);
  const visibleRecentChips = getRecentPokachips(fragments, {
    limit: 5,
    exclude: selectedChips,
  });
  const chipInputCandidates = useMemo(() => {
    const normalizedQuery = getPokachipKey(chipInput);
    if (!isInputActive || !normalizedQuery) return [];

    const selectedChipKeys = new Set(selectedChips.map(getPokachipKey).filter(Boolean));
    return getPokachipCandidates(fragments, { exclude: selectedChips })
      .filter((chip) => {
        const chipKey = getPokachipKey(chip);
        return chipKey.includes(normalizedQuery) && !selectedChipKeys.has(chipKey);
      })
      .slice(0, 5);
  }, [chipInput, fragments, isInputActive, selectedChips]);

  const toggleChip = (chip: string) => {
    const normalized = getCleanPokachipName(chip);
    if (!normalized) return;

    setSelectedChips((current) => {
      const normalizedKey = getPokachipKey(normalized);
      return current.some((item) => getPokachipKey(item) === normalizedKey)
        ? current.filter((item) => getPokachipKey(item) !== normalizedKey)
        : [...current, normalized];
    });
  };

  const removeChip = (chip: string) => {
    setSelectedChips((current) => current.filter((item) => getPokachipKey(item) !== getPokachipKey(chip)));
  };

  const addInputChips = () => {
    const inputChips = parsePokachipInput(chipInput);
    if (inputChips.length === 0) return;

    setSelectedChips((current) => mergePokachips(current, inputChips));
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

  const handleSave = async () => {
    if (!canSave || isSaving) return;

    const inputChips = parsePokachipInput(chipInput);
    const pokachips = mergePokachips(selectedChips, inputChips);
    const now = new Date();

    setSaveError("");
    setIsSaving(true);
    const fragmentInput = {
      title: title.trim() || fallbackTitle,
      memo: trimmedMemo || undefined,
      url: sharedUrl || undefined,
      source: sharedHostname || undefined,
      sourceType: sharedUrl ? ("link" as const) : ("text" as const),
      time: "\uBC29\uAE08",
      date: new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(now),
      pokachips: pokachips.length > 0 ? pokachips : ["\uC784\uC2DC\uC870\uAC01"],
      thumbnailColor: "#dce8f8",
    };
    const savedFragment = imageDataUrl
      ? await addFragmentWithImage(fragmentInput, imageDataUrl)
      : addFragment(fragmentInput);

    if (!savedFragment) {
      setIsSaving(false);
      setSaveError("\uc800\uc7a5 \uacf5\uac04\uc774 \ubd80\uc871\ud574 \uc870\uac01\uc744 \ub2f4\uc9c0 \ubabb\ud588\uc5b4\uc694. \ud070 \uc774\ubbf8\uc9c0\ub098 \uc624\ub798\ub41c \uc870\uac01\uc744 \uc815\ub9ac\ud55c \ub4a4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574\uc8fc\uc138\uc694.");
      return;
    }

    sessionStorage.setItem("chaejip-save-toast", "1");
    sessionStorage.setItem("chaejip-home-reset-view", "1");
    navigate("/");
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
            <div className="mt-3 rounded-[18px] bg-[#FAF8F4] px-4 pb-1.5 pt-2.5">
              <span className="block text-[11px] font-medium text-[rgba(120,112,100,0.52)]">제목</span>
              <textarea
                ref={titleRef}
                autoFocus={false}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                rows={1}
                placeholder="제목"
                className="mt-0.5 max-h-[46px] min-h-[23px] w-full resize-none overflow-y-auto bg-transparent text-[18px] font-medium leading-[23px] text-[rgba(54,58,105,0.72)] outline-none placeholder:text-[rgba(54,58,105,0.36)]"
              />
            </div>

            <div className="mt-2.5 rounded-[18px] border border-[#FAF7F2] bg-white px-4 pb-2.5 pt-2.5">
              <span className="block text-[11px] font-medium text-[rgba(120,112,100,0.52)]">URL</span>
              <p className="mt-1 truncate text-[13px] text-[rgba(74,69,64,0.72)]">
                {sharedUrl || "원본 링크 없음"}
              </p>
            </div>


            {imageDataUrl && (
              <div className="mt-2.5 overflow-hidden rounded-[18px] border border-white/70 bg-[#FFFEFB] shadow-[0_6px_18px_rgba(80,70,55,0.06)]">
                <img
                  src={imageDataUrl}
                  alt=""
                  onError={() => {
                    setImageDataUrl("");
                    setImageError("공유받은 이미지를 표시하지 못해 이미지 없이 열었어요.");
                  }}
                  className="h-[142px] w-full object-cover"
                />
              </div>
            )}
            {imageError && (
              <p className="mt-2 rounded-[14px] bg-[#FAF8F4] px-3 py-2 text-[12px] leading-[17px] text-[rgba(120,112,100,0.72)]">
                {imageError}
              </p>
            )}

            <label className="mt-4 block text-[12px] font-medium text-[rgba(120,112,100,0.75)]" htmlFor="quick-save-memo">
              한 줄 메모
            </label>
            <textarea
              id="quick-save-memo"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              rows={3}
              placeholder="나중에 떠올릴 힌트를 짧게 남겨두세요"
              className="mt-2 w-full resize-none rounded-[18px] border border-[#FAF7F2] bg-white px-4 pb-2.5 pt-2 text-[14px] leading-[21px] text-[rgba(50,44,34,0.82)] outline-none placeholder:text-[rgba(120,112,100,0.42)]"
            />

            {saveError && (
              <p className="mt-2 rounded-[14px] bg-[#FAF8F4] px-3 py-2 text-[12px] leading-[17px] text-[rgba(120,72,72,0.78)]">
                {saveError}
              </p>
            )}

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
                <>
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
                {chipInputCandidates.length > 0 && (
                  <div className="-mt-1 overflow-hidden rounded-[14px] border border-[#FAF7F2] bg-white shadow-[0_2px_8px_rgba(80,70,55,0.05)]">
                    {chipInputCandidates.map((chip, index) => (
                      <button
                        key={chip}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setSelectedChips((current) => mergePokachips(current, [chip]));
                          setChipInput("");
                          setIsInputActive(false);
                        }}
                        className={"flex w-full items-center px-4 py-2.5 text-left text-[13px] text-[#5a5248] " + (index > 0 ? "border-t border-[#00000008]" : "")}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
                </>
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
            disabled={!canSave || isSaving}
            aria-disabled={!canSave || isSaving}
            className="mx-auto flex h-[52px] w-full max-w-[350px] items-center justify-center rounded-full bg-[#8e88ed] text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(126,135,220,0.28),inset_0_1px_0_rgba(255,255,255,0.4)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            기억에 담기
          </button>
        </div>
      </section>
    </main>
  );
};
