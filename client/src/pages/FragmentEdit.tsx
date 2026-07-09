import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Globe, Instagram, Pencil, Sparkles, Youtube, X, type LucideIcon } from "lucide-react";
import { getCleanPokachipName, getPokachipColor, getPokachipCandidates, getPokachipKey, getRecentPokachips, getUniquePokachips, mergePokachips, normalizePokachipName } from "@/data/fragments";
import { useFragments } from "@/hooks/useFragments";
import { useFragmentImage } from "@/hooks/useFragmentImage";

const koreanInitials = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

const getKoreanInitials = (value: string) =>
  Array.from(value)
    .map((character) => {
      const code = character.charCodeAt(0);
      if (code < 0xac00 || code > 0xd7a3) return character;
      return koreanInitials[Math.floor((code - 0xac00) / 588)];
    })
    .join("");

const sourceIconColor = "rgba(120,112,100,0.65)";

const getSourceMetaIcon = (sourceType?: string, source?: string, url?: string): LucideIcon => {
  const sourceText = `${source ?? ""} ${url ?? ""}`.toLocaleLowerCase("en-US");

  if (sourceType === "text") return Pencil;
  if (sourceType === "youtube" || sourceText.includes("youtube") || sourceText.includes("youtu.be")) return Youtube;
  if (sourceText.includes("instagram")) return Instagram;
  if (sourceText.includes("chatgpt") || sourceText.includes("chat.openai")) return Sparkles;

  return Globe;
};
const getSourceMetaLabel = (sourceType?: string, source?: string, url?: string): string => {
  const sourceText = `${source ?? ""} ${url ?? ""}`.toLocaleLowerCase("en-US");

  if (sourceType === "text") return "직접 입력";
  if (sourceType === "youtube" || sourceText.includes("youtube") || sourceText.includes("youtu.be")) return "YouTube";
  if (sourceText.includes("instagram")) return "Instagram";
  if (sourceText.includes("pinterest")) return "Pinterest";
  if (sourceType === "link" || url) return "웹사이트";

  return source || "기록";
};

export const FragmentEdit = ({ params }: { params: { id: string } }) => {
  const [, navigate] = useLocation();
  const { fragments, getFragment, updateFragment, updateFragmentImage } = useFragments();
  const fragment = getFragment(params.id);

  const [title, setTitle] = useState(fragment?.title ?? "");
  const [memo, setMemo] = useState(fragment?.memo ?? "");
  const [url, setUrl] = useState(fragment?.url ?? "");
  const storedImageUrl = useFragmentImage(fragment);
  const [pendingImageDataUrl, setPendingImageDataUrl] = useState<string | undefined>();
  const [isImageRemoved, setIsImageRemoved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedChips, setSelectedChips] = useState<string[]>(
    Array.from(
      new Set((fragment?.pokachips ?? []).map(normalizePokachipName).filter(Boolean))
    )
  );
  const [newChipInput, setNewChipInput] = useState("");
  const [isInputActive, setIsInputActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  if (!fragment) {
    return (
      <main className="flex min-h-screen w-full justify-center bg-[#f3f0ec]">
        <section className="flex min-h-screen w-full max-w-[390px] flex-col bg-[#FAF8F4] px-5 pt-12" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-[#787064b2]">
            <ChevronLeft size={16} />
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
    const normalized = getCleanPokachipName(label);
    if (!normalized) return;

    setSelectedChips((prev) => {
      const normalizedKey = getPokachipKey(normalized);
      return prev.some((chip) => getPokachipKey(chip) === normalizedKey)
        ? prev.filter((chip) => getPokachipKey(chip) !== normalizedKey)
        : [...prev, normalized];
    });
  };

  const removeChip = (label: string) => {
    setSelectedChips((prev) => prev.filter((chip) => getPokachipKey(chip) !== getPokachipKey(label)));
  };

  const addNewChip = () => {
    const trimmed = getCleanPokachipName(newChipInput);
    if (trimmed) {
      setSelectedChips((prev) => mergePokachips(prev, [trimmed]));
    }
    setNewChipInput("");
    setIsInputActive(false);
  };

  const selectCandidate = (label: string) => {
    const normalized = getCleanPokachipName(label);
    if (normalized) {
      setSelectedChips((prev) => mergePokachips(prev, [normalized]));
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
        setPendingImageDataUrl(reader.result);
        setIsImageRemoved(false);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleRemoveImage = () => {
    setPendingImageDataUrl(undefined);
    setIsImageRemoved(true);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const visibleRecent = getRecentPokachips(fragments, {
    limit: 5,
    exclude: selectedChips,
  });
  const normalizedQuery = getPokachipKey(newChipInput);
  const autocompleteCandidates = isInputActive && normalizedQuery
    ? getPokachipCandidates(fragments, { exclude: selectedChips })
      .filter((label) => {
          const chipKey = getPokachipKey(label);
          return chipKey.includes(normalizedQuery)
            && !selectedChips.some((chip) => getPokachipKey(chip) === chipKey);
        })
        .slice(0, 5)
    : [];

  const initialChips = Array.from(
    getUniquePokachips(fragment.pokachips ?? [])
  );
  const nextChips = Array.from(
    getUniquePokachips(selectedChips)
  );
  const hasChipChanges = initialChips.length !== nextChips.length
    || initialChips.some((chip, index) => chip !== nextChips[index]);
  const trimmedUrl = url.trim();
  const imageUrl = isImageRemoved ? undefined : pendingImageDataUrl ?? storedImageUrl;
  const hasImageChanges = isImageRemoved || Boolean(pendingImageDataUrl);
  const hasImage = !isImageRemoved && Boolean(pendingImageDataUrl || fragment.imageKey || fragment.imageDataUrl);
  const hasChanges = title !== fragment.title
    || memo !== (fragment.memo ?? "")
    || trimmedUrl !== (fragment.url ?? "")
    || hasImageChanges
    || hasChipChanges;
  const canSave = hasChanges && Boolean(title.trim() || memo.trim() || trimmedUrl || hasImage);
  const metaLabel = getSourceMetaLabel(fragment.sourceType, fragment.source, fragment.url);
  const SourceIcon = getSourceMetaIcon(fragment.sourceType, fragment.source, fragment.url);

  const handleConfirm = async () => {
    if (!canSave || isSaving) return;

    setSaveError("");
    setIsSaving(true);
    const patch = {
      title,
      memo,
      url: trimmedUrl || undefined,
      pokachips: nextChips.length > 0 ? nextChips : ["임시조각"],
    };
    const updatedFragment = hasImageChanges
      ? await updateFragmentImage(fragment.id, patch, pendingImageDataUrl ?? null)
      : updateFragment(fragment.id, patch);

    if (!updatedFragment) {
      setIsSaving(false);
      setSaveError("이미지 또는 조각 저장 공간이 부족해 저장하지 못했어요.");
      return;
    }

    navigate(`/fragment/${fragment.id}`);
  };

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#f3f0ec]">
      <section className="flex min-h-screen w-full max-w-[390px] flex-col bg-[#FAF8F4]" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>

        {/* 헤더 */}
        <header className="flex items-center border-b border-[#F5F2ED] bg-[#FFFFFB] px-4 pt-5 pb-4">
          <button
            onClick={() => navigate(`/fragment/${fragment.id}`)}
            className="flex items-center gap-1.5 text-[rgba(54,58,105,0.7)]"
            aria-label="뒤로 가기"
          >
            <ChevronLeft size={22} strokeWidth={2.2} />
            <span
              className="text-[18px] font-semibold leading-[24px] text-[rgba(54,58,105,0.7)]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              조각 정리 중
            </span>
          </button>
        </header>

        <div className="flex-1 px-5 pt-4 flex flex-col gap-5 pb-36">

          {/* 출처 + 날짜 */}
          <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-normal leading-[17px] text-[rgba(120,112,100,0.75)]">
            {metaLabel && (
              <div className="inline-flex h-7 max-w-[160px] items-center gap-1.5 rounded-[999px] border border-[rgba(120,112,100,0.16)] bg-transparent px-3">
                <SourceIcon size={14} color={sourceIconColor} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                <span className="truncate text-[12px] font-normal leading-[17px] text-[rgba(120,112,100,0.75)]" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
                  {metaLabel}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="#c0b8b0" strokeWidth="1.2" />
                <path d="M6 3.5V6l1.5 1.5" stroke="#c0b8b0" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span className="text-[12px] font-normal leading-[17px] text-[rgba(120,112,100,0.75)]" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
                {fragment.date}
              </span>
            </div>
          </div>

          {/* 제목 입력 */}
          <div className="flex flex-col gap-2">
            <label
              className="text-[12px] font-medium leading-[17px] text-[rgba(120,112,100,0.75)]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              제목
            </label>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 적어주세요"
              rows={2}
              className="w-full resize-none rounded-xl border border-[#0000000a] bg-white px-4 py-3 text-[17px] font-medium leading-[24px] text-[rgba(50,44,34,0.8)] placeholder:text-[rgba(120,112,100,0.6)] outline-none shadow-[0px_1px_4px_#0000000a]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            />
          </div>

          {/* 내 메모 */}
          <div className="flex flex-col gap-2">
            <label
              className="text-[12px] font-medium leading-[17px] text-[rgba(120,112,100,0.75)]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              내 메모
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="지금 이 순간의 발견을 담아두세요"
              rows={4}
              className="w-full rounded-xl border border-[#0000000a] bg-white px-4 py-3 text-[13.5px] leading-relaxed text-[rgba(50,44,34,0.8)] placeholder:text-[rgba(120,112,100,0.6)] outline-none resize-none shadow-[0px_1px_4px_#0000000a]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            />
          </div>

          {/* 이미지 */}
          <div className="flex flex-col gap-2">
            <label
              className="text-[12px] font-medium leading-[17px] text-[rgba(120,112,100,0.75)]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              이미지
            </label>

            {imageUrl ? (
              <div className="overflow-hidden rounded-2xl border border-white/70 bg-[#FFFEFB] shadow-[0_6px_18px_rgba(80,70,55,0.06)]">
                <img
                  src={imageUrl}
                  alt="선택된 이미지 미리보기"
                  className="h-[168px] w-full object-cover"
                />
                <div className="flex items-center justify-between gap-2 border-t border-[rgba(120,112,100,0.08)] bg-[#FAF8F4]/70 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="flex h-9 w-[74px] items-center justify-center rounded-xl text-[12px] font-semibold text-[rgba(50,44,34,0.68)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.60),inset_0_1px_0_rgba(255,255,255,0.24)]"
                    style={{ background: "linear-gradient(135deg, rgba(244,224,216,0.54), rgba(224,196,190,0.42))", fontFamily: "'Pretendard Variable', sans-serif" }}
                  >
                    삭제
                  </button>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
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
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#0000000a] bg-white px-4 py-3 text-[13px] font-medium text-[rgba(120,112,100,0.6)] shadow-[0px_1px_4px_#0000000a]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                  <rect x="2" y="2.5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="5" cy="5.5" r="1" fill="currentColor" />
                  <path d="m3.8 10 2.3-2.3 1.7 1.6 1.4-1.2 2 1.9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                이미지 추가
              </button>
            )}

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* 기억 조각 */}
          <div className="flex flex-col gap-2.5">
            <label
              className="text-[12px] font-medium leading-[17px] text-[rgba(120,112,100,0.75)]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              기억 조각
            </label>

            {/* 선택된 포카칩 */}
            {selectedChips.length > 0 && (
              <div className="flex flex-col gap-2 pt-1">
                <span
                  className="text-[12px] font-medium leading-[17px] text-[rgba(120,112,100,0.62)]"
                  style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                >
                  선택한 조각
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedChips.map((label) => (
                    <div
                      key={label}
                      className="flex h-[30px] items-center gap-1 rounded-[999px] border border-[rgba(255,255,255,0.55)] px-3 py-1"
                      style={{
                        backgroundColor: getPokachipColor(label),
                        boxShadow: "0 2px 4px 0 rgba(180,196,244,0.28), inset 0 1px 0 0 rgba(255,255,255,0.58)",
                      }}
                    >
                      <span
                        className="text-[12px] font-medium leading-[17px] text-[rgba(50,44,34,0.7)]"
                        style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                      >
                        {label}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeChip(label)}
                        className="-mr-1 flex h-4 w-4 items-center justify-center rounded-full text-[rgba(120,112,100,0.75)]"
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
              <span
                className="text-[12px] font-medium leading-[17px] text-[rgba(120,112,100,0.62)]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                최근 사용
              </span>
              {visibleRecent.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {visibleRecent.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleChip(label)}
                      className="h-[30px] rounded-[999px] border border-[rgba(255,255,255,0.55)] px-3 text-[12px] font-medium leading-[17px] text-[rgba(50,44,34,0.7)]"
                      style={{
                        backgroundColor: getPokachipColor(label),
                        boxShadow: "0 2px 4px 0 rgba(180,196,244,0.24), inset 0 1px 0 0 rgba(255,255,255,0.58)",
                      }}
                    >
                      <span
                        className="text-[12px] font-medium leading-[17px] text-[rgba(50,44,34,0.7)]"
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
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-[rgba(50,44,34,0.8)] placeholder:text-[rgba(120,112,100,0.6)] outline-none"
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
                <span className="text-[13px] text-[rgba(120,112,100,0.6)]">새로운 조각이름 달기</span>
              </button>
            )}

            {autocompleteCandidates.length > 0 && (
              <div className="-mt-0.5 overflow-hidden rounded-xl border border-[#0000000a] bg-[rgba(120,112,100,0.05)] shadow-[0px_2px_8px_#0000000a]">
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

          </div>

          {/* 원본 링크 */}
          <div className="mt-2 flex flex-col gap-2 border-t border-[rgba(120,112,100,0.16)] pt-5">
            <label
              className="text-[12px] font-medium leading-[17px] text-[rgba(120,112,100,0.75)]"
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
                className="flex-1 bg-transparent text-[12px] font-normal leading-[17px] text-[rgba(50,44,34,0.8)] placeholder:text-[rgba(120,112,100,0.6)] outline-none"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              />
            </div>
          </div>

        </div>

        {saveError && (
          <p className="mx-5 mb-2 rounded-[14px] bg-[#FAF8F4] px-3 py-2 text-[12px] leading-[17px] text-[rgba(120,72,72,0.78)]">
            {saveError}
          </p>
        )}

        {/* 확인 버튼 */}
        <div
          className="fixed bottom-0 left-1/2 flex w-full max-w-[390px] -translate-x-1/2 justify-center px-5 pb-8 pt-4"
          style={{ background: "linear-gradient(to top, #FAF8F4 65%, transparent)" }}
        >
          <button
            onClick={handleConfirm}
            disabled={!canSave || isSaving}
            className="h-[51px] w-[180px] rounded-full border-0 px-[50px] py-[14px] text-[15px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, rgba(130,207,255,0.60) 12%, rgba(90,144,255,0.60) 54%, rgba(139,112,255,0.60) 100%)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.70), 0 3px 8px 0 rgba(180,196,244,0.42)",
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
