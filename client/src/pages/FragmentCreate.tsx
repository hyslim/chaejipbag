import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { X } from "lucide-react";
import { getCleanPokachipName, getPokachipColor, getPokachipCandidates, getPokachipKey, getRecentPokachips, mergePokachips, normalizePokachipName, parsePokachipInput } from "@/data/fragments";
import { useFragments } from "@/hooks/useFragments";
import { processSelectedImage } from "@/data/imageProcessing";

const thumbnailColors = ["#f0e8d0", "#f0dce4", "#d4eef4", "#d8eef8", "#dce8f8"];
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

type ParsedFragmentInput = {
  title: string;
  memo: string;
  url?: string;
  source: string;
  sourceType: "link" | "text" | "youtube";
};

const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;

const normalizeUrl = (value: string) =>
  value.startsWith("www.") ? `https://${value}` : value;

const getSourceFromUrl = (url: string) => {
  try {
    const hostname = new URL(normalizeUrl(url)).hostname.replace(/^www\./, "");
    const lowerHostname = hostname.toLocaleLowerCase("en-US");

    if (lowerHostname.includes("youtube.com") || lowerHostname.includes("youtu.be")) return "YouTube";
    if (lowerHostname.includes("instagram.com")) return "Instagram";
    if (lowerHostname.includes("pinterest.")) return "Pinterest";

    return hostname;
  } catch {
    return "웹사이트";
  }
};

const getSourceTypeFromUrl = (url: string): "link" | "youtube" => {
  const normalizedUrl = normalizeUrl(url).toLocaleLowerCase("en-US");
  return normalizedUrl.includes("youtube.com") || normalizedUrl.includes("youtu.be") ? "youtube" : "link";
};

const parseFragmentInput = (value: string, hasImage: boolean): ParsedFragmentInput => {
  const trimmedValue = value.trim();
  const matchedUrl = trimmedValue.match(urlPattern)?.[0];
  const originalUrl = matchedUrl ? normalizeUrl(matchedUrl) : undefined;
  const textWithoutUrl = matchedUrl
    ? trimmedValue.replace(matchedUrl, "").trim()
    : trimmedValue;
  const textLines = textWithoutUrl
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const isYoutube = originalUrl ? getSourceTypeFromUrl(originalUrl) === "youtube" : false;

  if (originalUrl && textLines.length === 0) {
    return {
      title: isYoutube ? "YouTube 링크" : "웹사이트",
      memo: "",
      url: originalUrl,
      source: getSourceFromUrl(originalUrl),
      sourceType: getSourceTypeFromUrl(originalUrl),
    };
  }

  const title = textLines[0] || (hasImage ? "이미지 조각" : "새 조각");
  const isLongSingleLineText = textLines.length === 1 && title.length >= 36;

  if (isLongSingleLineText) {
    return {
      title: `${title.slice(0, 30)}…`,
      memo: title,
      url: originalUrl,
      source: originalUrl ? getSourceFromUrl(originalUrl) : "직접 입력",
      sourceType: originalUrl ? getSourceTypeFromUrl(originalUrl) : "text",
    };
  }

  return {
    title,
    memo: textLines.slice(1).join("\n"),
    url: originalUrl,
    source: originalUrl ? getSourceFromUrl(originalUrl) : "직접 입력",
    sourceType: originalUrl ? getSourceTypeFromUrl(originalUrl) : "text",
  };
};
export const FragmentCreate = () => {
  const [, navigate] = useLocation();
  const { addFragment, addFragmentWithImage, fragments } = useFragments();
  const [memo, setMemo] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [isInputActive, setIsInputActive] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();
  const [imageError, setImageError] = useState("");
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const selectedChipsRef = useRef<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const commitSelectedChips = (nextChips: string[]) => {
    selectedChipsRef.current = nextChips;
    setSelectedChips(nextChips);
  };

  const toggleChip = (label: string) => {
    const currentChips = selectedChipsRef.current;
    const labelKey = getPokachipKey(label);
    const nextChips = currentChips.some((chip) => getPokachipKey(chip) === labelKey)
      ? currentChips.filter((chip) => getPokachipKey(chip) !== labelKey)
      : [...currentChips, label];

    commitSelectedChips(nextChips);
  };

  const removeChip = (label: string) => {
    commitSelectedChips(selectedChipsRef.current.filter((chip) => getPokachipKey(chip) !== getPokachipKey(label)));
  };

  const addInputChips = () => {
    const enteredTags = parsePokachipInput(tagInput);
    if (enteredTags.length === 0) return;

    const nextChips = mergePokachips(selectedChipsRef.current, enteredTags);
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

  const visibleRecentChips = getRecentPokachips(fragments, {
    limit: 5,
    exclude: selectedChips,
  });

  const autocompleteCandidates = useMemo(() => {
    const normalizedQuery = getPokachipKey(tagInput);
    if (!isInputActive || !normalizedQuery) return [];

    const selectedChipKeys = new Set(selectedChips.map(getPokachipKey).filter(Boolean));
    return getPokachipCandidates(fragments, { exclude: selectedChips })
      .filter((label) => {
        const chipKey = getPokachipKey(label);
        return chipKey.includes(normalizedQuery) && !selectedChipKeys.has(chipKey);
      })
      .slice(0, 5);
  }, [fragments, isInputActive, selectedChips, tagInput]);

  const selectAutocompleteCandidate = (label: string) => {
    const normalized = getCleanPokachipName(label);
    if (normalized && !selectedChipsRef.current.includes(normalized)) {
      commitSelectedChips(mergePokachips(selectedChipsRef.current, [normalized]));
    }
    setTagInput("");
    setIsInputActive(false);
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImageError("");
    setIsProcessingImage(true);
    try {
      setImageDataUrl(await processSelectedImage(file));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "이미지를 줄이거나 불러오지 못했어요.");
    } finally {
      setIsProcessingImage(false);
    }
  };

  const canSave = Boolean(memo.trim() || imageDataUrl);

  const handleSave = async () => {
    if (!canSave || isSaving || isProcessingImage) return;

    const parsedInput = parseFragmentInput(memo, Boolean(imageDataUrl));
    const enteredTags = mergePokachips(selectedChipsRef.current, parsePokachipInput(tagInput));
    const pokachips = enteredTags.length > 0 ? [...enteredTags] : ["임시조각"];
    const now = new Date();
    setSaveError("");
    setIsSaving(true);
    const fragmentInput = {
      title: parsedInput.title,
      memo: parsedInput.memo,
      url: parsedInput.url,
      source: parsedInput.source,
      sourceType: parsedInput.sourceType,
      time: "방금",
      date: new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(now),
      pokachips,
      thumbnailColor: thumbnailColors[now.getTime() % thumbnailColors.length],
    };
    const savedFragment = imageDataUrl
      ? await addFragmentWithImage(fragmentInput, imageDataUrl)
      : addFragment(fragmentInput);

    if (!savedFragment) {
      setIsSaving(false);
      setSaveError("이미지 또는 조각 저장 공간이 부족해 저장하지 못했어요.");
      return;
    }

    sessionStorage.setItem("chaejip-save-toast", "1");
    navigate("/");
  };

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#FAF8F4] sm:bg-[#f3f0ec]">
      <section className="flex min-h-screen w-full flex-col bg-[#FAF8F4] sm:max-w-[390px]" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
        <header className="flex flex-col border-b border-[#F5F2ED] bg-[#FFFEFB] px-5 pb-3 pt-6">
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

        <div className="flex flex-1 flex-col gap-4 bg-[#FAF8F4] px-5 pb-36 pt-5">
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
              {imageDataUrl ? (
                <div className="overflow-hidden rounded-[16px] border border-white/70 bg-[#FFFFFF] shadow-[0_6px_18px_rgba(80,70,55,0.06)]">
                  <img
                    src={imageDataUrl}
                    alt=""
                    className="h-[148px] w-full object-cover"
                  />
                  <div className="flex items-center justify-between gap-2 border-t border-[rgba(120,112,100,0.08)] bg-[#FAF8F4]/70 px-2.5 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        setImageDataUrl(undefined);
                        setImageError("");
                      }}
                      disabled={isProcessingImage}
                      className="flex h-9 w-[74px] items-center justify-center rounded-xl text-[12px] font-semibold text-[rgba(50,44,34,0.68)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.60),inset_0_1px_0_rgba(255,255,255,0.24)]"
                      style={{ background: "linear-gradient(135deg, rgba(244,224,216,0.54), rgba(224,196,190,0.42))", fontFamily: "'Pretendard Variable', sans-serif" }}
                    >
                      삭제
                    </button>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isProcessingImage}
                      className="flex h-9 flex-1 items-center justify-center rounded-xl border border-[rgba(120,112,100,0.16)] bg-[#FAF8F4] text-[12px] font-medium text-[rgba(120,112,100,0.75)]"
                      style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                    >
                      이미지 바꾸기
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isProcessingImage}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FAF8F4] py-3 text-[13px] font-medium text-[rgba(120,112,100,0.6)]"
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                    <rect x="2" y="2.5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="5" cy="5.5" r="1" fill="currentColor" />
                    <path d="m3.8 10 2.3-2.3 1.7 1.6 1.4-1.2 2 1.9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  이미지
                </button>
              )}
              <input
                ref={imageInputRef}
              disabled={isProcessingImage}
              type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              {isProcessingImage && (
                <p className="mt-2 px-1 text-[12px] leading-[17px] text-[rgba(120,112,100,0.72)]">이미지를 줄이고 있어요…</p>
              )}
              {imageError && (
                <p className="mt-2 rounded-[12px] bg-[#FAF8F4] px-3 py-2 text-[12px] leading-[17px] text-[rgba(120,72,72,0.78)]">{imageError}</p>
              )}
            </div>
          </div>

          {saveError && (
            <p className="rounded-[14px] bg-[#FAF8F4] px-3 py-2 text-[12px] leading-[17px] text-[rgba(120,72,72,0.78)]">
              {saveError}
            </p>
          )}

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
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  {selectedChips.map((label) => (
                    <div
                      key={label}
                      className="flex min-w-0 max-w-full items-center gap-1 rounded-full border border-white/70 px-3 py-1"
                      style={{
                        backgroundColor: getPokachipColor(label),
                        boxShadow: `0 1px 4px ${getPokachipShadowColor(label)}, inset 0 1px 0 rgba(255,255,255,0.8)`,
                      }}
                    >
                      <span
                        className="min-w-0 truncate text-[12px] font-medium leading-[17px] text-[rgba(50,44,34,0.7)]"
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

            <div className="-mb-0.5 flex flex-col gap-2 pt-1">
              <span className="text-[11px] font-medium tracking-[0.5px] text-[#a0988c80]">
                최근 사용
              </span>
              {visibleRecentChips.length > 0 ? (
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  {visibleRecentChips.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleChip(label)}
                      className="flex h-[30px] min-w-0 max-w-full items-center rounded-[999px] border border-white/70 px-3"
                      style={{
                        backgroundColor: getPokachipColor(label),
                        boxShadow: `0 1px 4px ${getPokachipShadowColor(label)}, inset 0 1px 0 rgba(255,255,255,0.7)`,
                      }}
                    >
                      <span
                        className="inline-flex h-[17px] min-w-0 items-center truncate text-[12px] font-medium leading-[17px] text-[rgba(50,44,34,0.7)]"
                        style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                      >
                        {label}
                      </span>
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
                    className={`flex w-full min-w-0 items-center overflow-hidden px-4 py-2.5 text-left text-[13px] text-[#5a5248] ${
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
          className="fixed bottom-0 left-1/2 w-full -translate-x-1/2 px-5 sm:max-w-[390px] pb-8 pt-5"
          style={{ background: "linear-gradient(to top, #FAF8F4 68%, transparent)", paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || isSaving || isProcessingImage}
            className="mx-auto flex h-[51px] w-[180px] items-center justify-center rounded-[999px] border-0 text-[15px] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: "linear-gradient(133deg, rgba(130,207,255,0.60) 12%, rgba(90,144,255,0.60) 54%, rgba(139,112,255,0.60) 100%)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.7), 0 3px 6px 0 rgba(180,196,244,0.40)",
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
