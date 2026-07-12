import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, Pencil, Trash2, ExternalLink, Globe, Instagram, Sparkles, Youtube, X, type LucideIcon } from "lucide-react";
import { getPokachipColor, normalizePokachipName } from "@/data/fragments";
import { useFragments } from "@/hooks/useFragments";
import { useFragmentImage } from "@/hooks/useFragmentImage";
import { copyFragmentShareText, shareFragment, shouldOfferImageShare } from "@/lib/shareFragment";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";
import { getInstagramUsername, isInstagramUrl } from "@/lib/instagram";

const sourceIconColor = "rgba(120,112,100,0.65)";
const IMAGE_SHARE_DELAY_MS = 700;
const temporaryPokachipColor = "rgba(120,112,100,0.18)";

const getColorWithAlpha = (color: string, alpha: number): string => {
  const rgbaMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbaMatch) {
    const [, red, green, blue] = rgbaMatch;
    return `rgba(${red},${green},${blue},${alpha})`;
  }

  const hexMatch = color.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    return `rgba(${parseInt(hex.slice(0, 2), 16)},${parseInt(hex.slice(2, 4), 16)},${parseInt(hex.slice(4, 6), 16)},${alpha})`;
  }

  return color;
};

const getDisplayPokachipKey = (label: string): string =>
  normalizePokachipName(label).toLocaleLowerCase("ko-KR");
const isTemporaryPokachip = (label: string): boolean =>
  getDisplayPokachipKey(label).replace(/\s+/g, "") === "임시조각";

const delayImageShare = () => new Promise((resolve) => window.setTimeout(resolve, IMAGE_SHARE_DELAY_MS));

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

export const FragmentDetail = ({ params }: { params: { id: string } }) => {
  const [, navigate] = useLocation();
  const { fragments, getFragment, deleteFragment } = useFragments();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [shareSheetStatus, setShareSheetStatus] = useState<"idle" | "copying" | "copied">("idle");
  const fragment = getFragment(params.id);
  const imageUrl = useFragmentImage(fragment);
  const [failedYouTubeThumbnailUrl, setFailedYouTubeThumbnailUrl] = useState<string | null>(null);
  const youtubeThumbnailUrl = getYouTubeThumbnailUrl(fragment?.url);
  const hasStoredImage = Boolean(fragment?.imageKey || fragment?.imageDataUrl);
  const displayImageUrl = imageUrl || (!hasStoredImage && youtubeThumbnailUrl !== failedYouTubeThumbnailUrl ? youtubeThumbnailUrl : null);
  const instagramUsername = getInstagramUsername(fragment?.title, fragment?.url);
  const showInstagramPlaceholder = !hasStoredImage && !youtubeThumbnailUrl && isInstagramUrl(fragment?.url);

  const handleDelete = () => {
    if (deleteFragment(params.id)) navigate("/");
  };

  if (!fragment) {
    return (
      <main className="flex min-h-screen w-full justify-center bg-[#FAF8F4]">
        <section className="flex min-h-screen w-full flex-col sm:max-w-[390px] bg-[#FAF8F4]" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
          <header className="border-b border-[#F5F2ED] bg-[#FFFEFB] px-5 pb-4 pt-6">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-[rgba(54,58,105,0.7)]"
            >
              <ChevronLeft size={16} />
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

  const pokachipUsageCounts = new Map<string, number>();
  fragments.forEach((storedFragment) => {
    const fragmentPokachipKeys = new Set(
      (storedFragment.pokachips ?? [])
        .map(getDisplayPokachipKey)
        .filter(Boolean)
    );
    fragmentPokachipKeys.forEach((key) => {
      pokachipUsageCounts.set(key, (pokachipUsageCounts.get(key) ?? 0) + 1);
    });
  });

  const metaLabel = getSourceMetaLabel(fragment.sourceType, fragment.source, fragment.url);
  const SourceIcon = getSourceMetaIcon(fragment.sourceType, fragment.source, fragment.url);
  const trimmedTitle = fragment.title.trim();
  const trimmedMemo = fragment.memo?.trim() ?? "";
  const shouldShowMemo = Boolean(trimmedMemo && trimmedMemo !== trimmedTitle);

  const showDetailToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 2000);
  };

  const handleShareResult = (result: Awaited<ReturnType<typeof shareFragment>>) => {
    if (result === "shared-and-copied") {
      showDetailToast("이미지를 보냈어요. 글은 복사해뒀어요. 입력창에 붙여넣어 주세요.");
    } else if (result === "copied") {
      showDetailToast("글을 복사했어요. 원하는 곳에 붙여넣어 주세요.");
    } else if (result === "failed") {
      showDetailToast("공유할 수 없었어요");
    }
  };

  const performShare = async () => {
    handleShareResult(await shareFragment(fragment));
  };

  const handleImageShareWithTextCopy = async () => {
    if (shareSheetStatus !== "idle") return;

    setShareSheetStatus("copying");
    const copyResult = await copyFragmentShareText(fragment);
    if (copyResult !== "copied") {
      setShareSheetStatus("idle");
      showDetailToast("글 복사에 실패했어요. 글만 복사를 다시 시도해 주세요.");
      return;
    }

    setShareSheetStatus("copied");
    await delayImageShare();
    setIsShareSheetOpen(false);
    setShareSheetStatus("idle");

    const shareResult = await shareFragment(fragment);
    if (shareResult === "shared" || shareResult === "shared-and-copied") {
      const postCopyResult = await copyFragmentShareText(fragment);
      handleShareResult(postCopyResult === "copied" ? "shared-and-copied" : shareResult);
      return;
    }
    handleShareResult(shareResult);
  };

  const handleShare = () => {
    if (shouldOfferImageShare(fragment)) {
      setShareSheetStatus("idle");
      setIsShareSheetOpen(true);
      return;
    }
    void performShare();
  };

  const handleCopyShareText = async () => {
    handleShareResult(await copyFragmentShareText(fragment));
  };

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#FAF8F4]">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative flex min-h-screen w-full flex-col sm:max-w-[390px] bg-[#FAF8F4]"
        style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-[31px] z-[70] flex justify-center px-4">
          <motion.div
            aria-live="polite"
            initial={false}
            animate={toastMessage ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`${toastMessage ? "pointer-events-auto" : "pointer-events-none"} flex min-h-9 max-w-full min-w-[164px] items-center justify-center rounded-[8px] py-2 text-center leading-[18px] border border-[rgba(255,255,255,0.78)] bg-[#FFFEFB]/95 px-6 text-[13px] font-semibold text-[rgba(54,58,105,0.66)] shadow-[0_4px_14px_rgba(74,63,48,0.09),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-[12px]`}
            style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
          >
            {toastMessage}
          </motion.div>
        </div>
        {/* 헤더 */}
        <header className="flex items-center justify-between border-b border-[#F5F2ED] bg-[#FFFEFB] px-5 pb-4 pt-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-[rgba(54,58,105,0.7)]"
            aria-label="뒤로 가기"
          >
            <ChevronLeft size={22} strokeWidth={2.2} />
            <span
              className="text-[18px] font-semibold leading-[24px] text-[rgba(54,58,105,0.7)]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              조각 들여다보기
            </span>
          </button>
          <div className="-mr-3 flex items-center gap-0">
            <button
              onClick={() => navigate(`/fragment/${fragment.id}/edit`)}
              className="relative flex h-4 w-10 items-center justify-center overflow-visible text-[rgba(160,152,140,0.65)] before:absolute before:inset-x-0 before:-inset-y-3 before:content-[''] hover:text-[rgba(120,112,100,0.7)]"
              aria-label="수정"
            >
              <Pencil size={16} strokeWidth={1.8} />
            </button>
            <button
              onClick={() => setIsDeleteOpen(true)}
              className="relative flex h-4 w-10 items-center justify-center overflow-visible text-[rgba(160,152,140,0.65)] before:absolute before:inset-x-0 before:-inset-y-3 before:content-[''] hover:text-red-400"
              aria-label="삭제"
            >
              <Trash2 size={16} strokeWidth={1.8} />
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col px-5 pt-5 pb-28">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-normal leading-[17px] text-[rgba(120,112,100,0.75)]">
            {metaLabel && (
              <div className="inline-flex h-7 max-w-[160px] items-center gap-1.5 rounded-[999px] border border-[rgba(120,112,100,0.16)] bg-transparent px-3">
                <SourceIcon size={14} color={sourceIconColor} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate text-[12px] font-normal leading-[17px] text-[rgba(120,112,100,0.75)]" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>{metaLabel}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="#c0b8b0" strokeWidth="1.2" />
                <path d="M6 3.5V6l1.5 1.5" stroke="#c0b8b0" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>{fragment.date}</span>
            </div>
          </div>


          <section className="mt-7">
            <h1
              className="break-words text-[18px] font-medium leading-[26px] text-[rgba(50,44,34,0.8)]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              {fragment.title}
            </h1>
          </section>

          {shouldShowMemo && (
            <section className="mt-8 flex flex-col gap-3">
              <span
                className="text-[12px] font-medium leading-[17px] text-[rgba(120,112,100,0.75)]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                내 메모
              </span>
              <p
                className="break-words text-[14px] font-normal leading-[22px] text-[rgba(50,44,34,0.8)]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                {trimmedMemo}
              </p>
            </section>
          )}
          {displayImageUrl && (
            <section className="mt-8">
              <button
                type="button"
                onClick={() => setIsImageViewerOpen(true)}
                className="group block w-full overflow-hidden rounded-[18px] border border-[rgba(120,112,100,0.08)] bg-transparent"
                aria-label="이미지 전체보기 열기"
              >
                <img
                  src={displayImageUrl}
                  alt=""
                  onError={() => {
                    if (!imageUrl) setFailedYouTubeThumbnailUrl(youtubeThumbnailUrl);
                  }}
                  className="h-[236px] w-full object-cover transition-transform duration-200 group-active:scale-[0.99]"
                />
              </button>
            </section>
          )}
          {showInstagramPlaceholder && (
            <section className="mt-8 flex h-[236px] w-full flex-col items-center justify-center rounded-[18px] border border-[rgba(120,112,100,0.08)] bg-[#FAF8F4] px-4 text-center">
              <span className="text-[12px] font-medium text-[rgba(120,112,100,0.66)]">Instagram</span>
              <span className="mt-2 max-w-full truncate text-[14px] font-medium text-[rgba(50,44,34,0.72)]">
                {instagramUsername ? `@${instagramUsername}` : "저장한 게시물"}
              </span>
            </section>
          )}

          {fragment.pokachips.length > 0 && (
            <section className="mt-8 flex flex-col gap-3">
              <span
                className="text-[12px] font-medium leading-[17px] text-[rgba(120,112,100,0.75)]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                기억 조각
              </span>
              <div className="flex min-w-0 flex-wrap gap-1.5">
                {fragment.pokachips.map((chip) => {
                  const normalizedChip = normalizePokachipName(chip);
                  const usageCount = pokachipUsageCounts.get(getDisplayPokachipKey(normalizedChip)) ?? 0;
                  const isTemporary = isTemporaryPokachip(normalizedChip);
                  const backgroundColor = isTemporary
                    ? getColorWithAlpha(temporaryPokachipColor, 0.28)
                    : getColorWithAlpha(getPokachipColor(normalizedChip), usageCount <= 2 ? 0.48 : 0.6);

                  return (
                    <span
                      key={chip}
                      className={`flex h-[30px] min-w-0 max-w-full items-center overflow-hidden rounded-[999px] border border-[rgba(255,255,255,0.55)] px-3 text-[12px] font-medium leading-[17px] ${isTemporary ? "text-[rgba(120,112,100,0.68)]" : "text-[rgba(50,44,34,0.7)]"}`}
                      style={{
                        backgroundColor,
                        fontFamily: "'Pretendard Variable', sans-serif",
                        boxShadow: "0 2px 4px 0 rgba(180,196,244,0.28), inset 0 1px 0 0 rgba(255,255,255,0.58)",
                      }}
                    >
                      <span className="min-w-0 truncate">{normalizedChip}</span>
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          {fragment.url && (
            <>
              {fragment.pokachips.length > 0 && (
                <div className="mt-6 mb-5 h-px bg-[rgba(120,112,100,0.16)]" />
              )}
              <section className={fragment.pokachips.length > 0 ? "" : "mt-8"}>
                <span
                  className="text-[12px] font-medium leading-[17px] text-[rgba(120,112,100,0.75)]"
                  style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                >
                  원본 링크
                </span>
                <a
                  href={fragment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex min-w-0 items-center gap-2 rounded-[14px] border border-[rgba(120,112,100,0.16)] bg-[#FFFFFF] px-4 py-3"
                >
                  <ExternalLink size={13} className="shrink-0 text-[rgba(160,152,140,0.65)]" strokeWidth={1.8} />
                  <span
                    className="min-w-0 truncate text-[12px] font-normal leading-[17px] text-[rgba(120,112,100,0.75)]"
                    style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
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
          className="fixed bottom-0 left-1/2 flex w-full -translate-x-1/2 justify-center px-5 sm:max-w-[390px] pb-8 pt-4"
          style={{
            background: "linear-gradient(to top, #FAF8F4 65%, transparent)",
            paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
          }}
        >
          <button
            type="button"
            onClick={handleShare}
            className="h-[51px] w-[180px] rounded-full border-0 px-[50px] py-[14px] text-[15px] font-medium text-white"
            style={{
              background: "linear-gradient(135deg, rgba(130,207,255,0.60) 12%, rgba(90,144,255,0.60) 54%, rgba(139,112,255,0.60) 100%)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.70), 0 3px 8px 0 rgba(180,196,244,0.42)",
              fontFamily: "'Pretendard Variable', sans-serif",
            }}
          >
            공유하기
          </button>
        </div>
        {isImageViewerOpen && displayImageUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(32,28,24,0.72)] px-4 py-8 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-label="이미지 전체보기"
            onClick={() => setIsImageViewerOpen(false)}
          >
            <div className="relative flex h-full w-full items-center sm:max-w-[390px] justify-center" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                onClick={() => setIsImageViewerOpen(false)}
                className="absolute right-0 top-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#FFFEFB]/90 text-[rgba(50,44,34,0.72)] shadow-[0_6px_18px_rgba(0,0,0,0.18)] backdrop-blur-[8px]"
                aria-label="전체보기 닫기"
              >
                <X size={18} strokeWidth={2} />
              </button>
              {/* TODO: If single-image storage expands to images[], add n/n counter and prev/next controls here. */}
              <img
                src={displayImageUrl}
                alt=""
                className="max-h-full max-w-full rounded-[18px] object-contain shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
              />
            </div>
          </div>
        )}

        {isShareSheetOpen && (
          <div
            className="fixed inset-y-0 left-1/2 z-[80] flex w-full -translate-x-1/2 items-end sm:max-w-[390px] bg-[rgba(32,28,24,0.32)] backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-image-share-title"
            onClick={() => {
              if (shareSheetStatus === "idle") setIsShareSheetOpen(false);
            }}
          >
            <div
              className="w-full rounded-t-[24px] bg-[#FFFFFF] px-5 pb-6 pt-5 shadow-[0_-16px_48px_rgba(60,50,40,0.16)]"
              style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="detail-image-share-title" className="text-[18px] font-semibold text-[#3a3228]">이미지와 글을 같이 보낼게요</h2>
              <p className="mt-3 text-[13px] leading-[20px] text-[#787064b0]">
                카톡/노션은 이미지만 받고 글을 빼먹을 수 있어요.<br />
                그래서 제목·메모·원본 링크는 먼저 복사해둘게요.
              </p>
              <p className="mt-2 text-[13px] leading-[20px] text-[#787064b0]">이미지를 보낸 뒤, 입력창에 붙여넣어 주세요.</p>
              {shareSheetStatus === "copied" && (
                <p className="mt-3 rounded-[14px] bg-[#F1F0FF] px-4 py-3 text-center text-[13px] font-semibold leading-[19px] text-[#6f68d8]">
                  글이 복사됐어요. 이미지를 보낸 뒤 입력창에 붙여넣어 주세요.
                </p>
              )}
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={shareSheetStatus !== "idle"}
                  onClick={() => {
                    void handleImageShareWithTextCopy();
                  }}
                  className={`h-12 rounded-full bg-[#8e88ed] text-[14px] font-semibold text-white transition ${shareSheetStatus !== "idle" ? "opacity-80" : ""}`}
                >
                  {shareSheetStatus === "copied" ? "글 복사 완료! 이미지를 보낼게요" : shareSheetStatus === "copying" ? "글 복사 중..." : "글 먼저 복사하고 이미지 공유"}
                </button>
                <button
                  type="button"
                  disabled={shareSheetStatus !== "idle"}
                  onClick={() => {
                    setIsShareSheetOpen(false);
                    setShareSheetStatus("idle");
                    void handleCopyShareText();
                  }}
                  className="h-12 rounded-full border border-[#0000000a] bg-[#FAF8F4] text-[14px] font-semibold text-[#787064] disabled:opacity-60"
                >
                  글만 복사
                </button>
                <button type="button" disabled={shareSheetStatus !== "idle"} onClick={() => { setIsShareSheetOpen(false); setShareSheetStatus("idle"); }} className="h-11 text-[13px] font-medium text-[#a0988c] disabled:opacity-60">취소</button>
              </div>
            </div>
          </div>
        )}

        {isDeleteOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a262033] px-5 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-fragment-title"
          >
            <div className="w-full max-w-[350px] rounded-2xl border border-white/80 bg-[#FFFFFF] p-5 shadow-[0_18px_50px_rgba(60,50,40,0.18)]">
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
