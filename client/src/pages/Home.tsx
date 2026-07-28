import { motion } from "framer-motion";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { Globe, Instagram, Pencil, Pin, Search, Sparkles, Youtube, type LucideIcon } from "lucide-react";
import { flushSync } from "react-dom";
import { Link, useLocation } from "wouter";
import { FavoriteHeartIcon } from "@/components/FavoriteHeartIcon";
import { getColorWithAlpha, getFragmentDisplayTime, getFragmentImageCount, getFragmentReferenceAt, getPokachipColorToken, getPokachipKey, getPokachipsInDisplayOrder, getPokachipSmallPillStyle, getRecentPokachips, normalizePokachipName, type Fragment } from "@/data/fragments";
import { useFragments } from "@/hooks/useFragments";
import { useFragmentImage } from "@/hooks/useFragmentImage";
import { BottomNav } from "@/components/BottomNav";
import { copyFragmentShareText, shareFragment, shouldOfferImageShare } from "@/lib/shareFragment";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";
import { getInstagramUsername, isInstagramUrl } from "@/lib/instagram";
import { getCardImageHeight, type CardImageHeight } from "@/lib/cardImageHeight";
import { createFragmentNavigationPath, type FragmentNavigationSource } from "@/lib/fragmentNavigation";

const IMAGE_SHARE_DELAY_MS = 700;

const delayImageShare = () => new Promise((resolve) => window.setTimeout(resolve, IMAGE_SHARE_DELAY_MS));

const isTemporaryPokachip = (label: string): boolean =>
  getPokachipKey(label) === "임시조각";

const saveToastStorageKey = "chaejip-save-toast";

const sourceIconColor = "rgba(120,112,100,0.72)";

const getInterestStyle = (label: string, count: number) => {
  const token = getPokachipColorToken(label);
  const growthStrength = Math.min(Math.max(count - 5, 0), 5) / 5;
  const [start, middle, end] = token.heroGradient;

  return {
    gradient: `radial-gradient(circle at 22% 12%, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.22) 40%, transparent 62%), linear-gradient(145deg, ${getColorWithAlpha(start, 0.78)} 0%, ${getColorWithAlpha(middle, 0.72)} 54%, ${getColorWithAlpha(end, 0.64)} 100%)`,
    shadow: `0 10px 24px ${getColorWithAlpha(token.pillColor, 0.2 + growthStrength * 0.03)}, 0 3px 10px ${getColorWithAlpha(token.border, 0.16)}, inset 0 1px 0 rgba(255,255,255,0.76), inset 0 -1px 0 rgba(255,255,255,0.2)`,
    text: token.text,
  };
};

const getFragmentDisplayPokachips = (fragment: Fragment, selectedChip?: string | null): string[] =>
  getPokachipsInDisplayOrder(fragment.pokachips, selectedChip);

const HomeCardPokachipRow = ({
  fragment,
  selectedChip,
  className = "",
}: {
  fragment: Fragment;
  selectedChip?: string | null;
  className?: string;
}) => {
  const displayPokachips = getFragmentDisplayPokachips(fragment, selectedChip).slice(0, 3);

  if (displayPokachips.length === 0) return null;

  return (
    <div
      className={`${className} pointer-events-none flex h-[30px] w-full min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden py-[3px]`}
    >
      {displayPokachips.map((chip, index) => {
        const pill = (
          <span
            className={`${index === 0 ? "max-w-full" : ""} ${index === 2 ? "min-w-max flex-none" : "shrink-0"} inline-flex h-6 w-max grow-0 items-center overflow-hidden rounded-[999px] border px-2.5 py-1 text-[11px] font-medium leading-4`}
            style={{
              ...getPokachipSmallPillStyle(
                chip,
                index === 0 && getPokachipKey(chip) === getPokachipKey(selectedChip ?? "")
                  ? "selected"
                  : "regular"
              ),
              fontFamily: "'Pretendard Variable', sans-serif",
            }}
          >
            <span className={`${index === 0 ? "min-w-0 truncate" : ""}`}>{chip}</span>
          </span>
        );

        if (index < 2) {
          return <span key={`${getPokachipKey(chip)}-${index}`} className="contents">{pill}</span>;
        }

        return (
          <span
            key={`${getPokachipKey(chip)}-${index}`}
            aria-hidden="true"
            className="pointer-events-none flex h-6 min-w-0 max-w-11 flex-1 items-center justify-start overflow-hidden"
            style={{
              maskImage: "linear-gradient(to right, black 0%, black calc(100% - 16px), transparent 100%)",
              WebkitMaskImage: "linear-gradient(to right, black 0%, black calc(100% - 16px), transparent 100%)",
            }}
          >
            {pill}
          </span>
        );
      })}
    </div>
  );
};
const shouldShowMemoPreview = (fragment: Fragment): boolean => {
  const title = fragment.title.trim();
  const memo = fragment.memo?.trim() ?? "";

  if (!memo || memo === title) return false;

  const hasEllipsizedTitle = title.endsWith("…") || title.endsWith("...");
  const titlePrefix = hasEllipsizedTitle ? title.replace(/(?:…|\.\.\.)$/, "").trim() : "";
  if (titlePrefix && memo.startsWith(titlePrefix)) return false;

  return true;
};
const getFragmentSourceIcon = (fragment: Fragment): LucideIcon => {
  const sourceText = `${fragment.source ?? ""} ${fragment.url ?? ""}`.toLocaleLowerCase("en-US");

  if (fragment.sourceType === "text") return Pencil;
  if (fragment.sourceType === "youtube" || sourceText.includes("youtube") || sourceText.includes("youtu.be")) return Youtube;
  if (sourceText.includes("instagram")) return Instagram;
  if (sourceText.includes("chatgpt") || sourceText.includes("chat.openai")) return Sparkles;

  return Globe;
};

const FragmentCard = ({
  fragment,
  selectedChip,
  isMenuOpen,
  onOpenMenu,
  onCloseMenu,
  onTogglePin,
  onDelete,
  onShare,
  navigationIds,
  navigationReturnTo,
  navigationSource,
}: {
  fragment: Fragment;
  selectedChip?: string | null;
  isMenuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onShare: () => void | Promise<void>;
  navigationIds: string[];
  navigationReturnTo: string;
  navigationSource: FragmentNavigationSource;
}) => {
  const [, navigate] = useLocation();
  const imageUrl = useFragmentImage(fragment);
  const [failedYouTubeThumbnailUrl, setFailedYouTubeThumbnailUrl] = useState<string | null>(null);
  const youtubeThumbnailUrl = getYouTubeThumbnailUrl(fragment.url);
  const imageCount = getFragmentImageCount(fragment);
  const hasStoredImage = imageCount > 0;
  const displayImageUrl = imageUrl || (!hasStoredImage && youtubeThumbnailUrl !== failedYouTubeThumbnailUrl ? youtubeThumbnailUrl : null);
  const isYouTubeThumbnail = Boolean(displayImageUrl && !hasStoredImage && displayImageUrl === youtubeThumbnailUrl);
  const [imageHeightState, setImageHeightState] = useState<{ src: string; height: CardImageHeight } | null>(null);
  const imageHeight = isYouTubeThumbnail
    ? 160
    : imageHeightState?.src === displayImageUrl
      ? imageHeightState.height
      : 200;
  const instagramUsername = getInstagramUsername(fragment.title, fragment.url);
  const showInstagramPlaceholder = !hasStoredImage && !youtubeThumbnailUrl && isInstagramUrl(fragment.url);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const didLongPressRef = useRef(false);
  const SourceIcon = getFragmentSourceIcon(fragment);
  const displayPokachips = getFragmentDisplayPokachips(fragment, selectedChip);
  const hasTitle = Boolean(fragment.title.trim());
  const hasMemo = shouldShowMemoPreview(fragment);
  const chipBottomSpacing = hasTitle || hasMemo ? "mb-2" : "mb-0";
  const metaTopSpacing = hasTitle || hasMemo ? "mt-1" : displayPokachips.length > 0 ? "mt-2" : "";

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => clearLongPressTimer, []);

  useEffect(() => {
    if (isMenuOpen) return;

    didLongPressRef.current = false;
    clearLongPressTimer();
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleOutsidePointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) return;

      onCloseMenu();
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown, true);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
  }, [isMenuOpen, onCloseMenu]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    didLongPressRef.current = false;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      didLongPressRef.current = true;
      onOpenMenu();
    }, 520);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const pointerStart = pointerStartRef.current;
    if (!pointerStart) return;

    const movedX = Math.abs(event.clientX - pointerStart.x);
    const movedY = Math.abs(event.clientY - pointerStart.y);
    if (movedX > 8 || movedY > 8) {
      clearLongPressTimer();
    }
  };

  const handlePointerEnd = () => {
    pointerStartRef.current = null;
    clearLongPressTimer();
  };

  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    if (didLongPressRef.current || isMenuOpen) {
      event.preventDefault();
      event.stopPropagation();
      didLongPressRef.current = false;
      return;
    }

    navigate(createFragmentNavigationPath({
      fragmentId: fragment.id,
      fragmentIds: navigationIds,
      returnTo: navigationReturnTo,
      source: navigationSource,
    }));
  };

  const handleTogglePin = () => {
    onTogglePin();
    onCloseMenu();
  };

  const handleSend = () => {
    onCloseMenu();
    void onShare();
  };

  const handleDelete = () => {
    if (window.confirm("이 조각을 지울까요?")) {
      onDelete();
    }
    onCloseMenu();
  };

  return (
    <div ref={rootRef} className="relative min-w-0 home-select-none select-none">
      {isMenuOpen && (
      <motion.div
        role="menu"
        aria-hidden={!isMenuOpen}
        animate={isMenuOpen ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 6 }}
        transition={{ type: "spring", stiffness: 560, damping: 25, mass: 0.5 }}
        className={`${isMenuOpen ? "pointer-events-auto" : "pointer-events-none"} absolute right-[-10px] top-[-16px] z-50 flex w-[92px] origin-top-right flex-col gap-1 overflow-hidden rounded-[22px] home-select-none select-none bg-[rgba(255,255,255,0.20)] p-1.5 text-left backdrop-blur-[20px]`}
        style={{
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.54), inset 0 1px 0 rgba(255,255,255,0.64), 0 3px 8px rgba(180,196,244,0.50)",
          backdropFilter: "blur(20px) saturate(116%)",
          WebkitBackdropFilter: "blur(20px) saturate(116%)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          role="menuitem"
          tabIndex={isMenuOpen ? 0 : -1}
          className="flex h-11 min-h-11 items-center justify-center rounded-full text-[11px] font-semibold text-[rgba(54,58,105,0.72)] home-select-none select-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.60),inset_0_1px_0_rgba(255,255,255,0.24)] outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          style={{
            background: "linear-gradient(135deg, rgba(225,221,255,0.72), rgba(204,218,255,0.62))",
            fontFamily: "'Pretendard Variable', sans-serif",
          }}
          onClick={handleTogglePin}
        >
          {fragment.pinnedAt ? "즐겨찾기 해제" : "즐겨찾기에 추가"}
        </button>
        <button
          type="button"
          role="menuitem"
          tabIndex={isMenuOpen ? 0 : -1}
          className="flex h-11 min-h-11 items-center justify-center rounded-full text-[11px] font-semibold text-white/70 home-select-none select-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.60),inset_0_1px_0_rgba(255,255,255,0.22)] outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          style={{
            background: "linear-gradient(135deg, rgba(130,207,255,0.58), rgba(116,137,255,0.58), rgba(139,112,255,0.54))",
            fontFamily: "'Pretendard Variable', sans-serif",
          }}
          onClick={handleSend}
        >
          보내기
        </button>
        <button
          type="button"
          role="menuitem"
          tabIndex={isMenuOpen ? 0 : -1}
          className="flex h-11 min-h-11 items-center justify-center rounded-full text-[11px] font-semibold text-[rgba(50,44,34,0.68)] home-select-none select-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.60),inset_0_1px_0_rgba(255,255,255,0.24)] outline-none focus-visible:ring-2 focus-visible:ring-white/65"
          style={{
            background: "linear-gradient(135deg, rgba(244,224,216,0.54), rgba(224,196,190,0.42))",
            fontFamily: "'Pretendard Variable', sans-serif",
          }}
          onClick={handleDelete}
        >
          지우기
        </button>
      </motion.div>
      )}
      <motion.div
        animate={isMenuOpen
          ? {
              scale: 1.012,
              y: -2,
              boxShadow: "0px 14px 30px rgba(130,207,255,0.13), 0px 8px 22px rgba(139,112,255,0.09), 0px 0px 24px rgba(139,112,255,0.08)",
            }
          : {
              scale: 1,
              y: 0,
              boxShadow: "0px 6px 18px rgba(74,63,48,0.09)",
            }}
        whileTap={{ scale: isMenuOpen ? 1.01 : 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="home-select-none relative min-w-0 select-none overflow-hidden rounded-[18px] border border-[rgba(120,112,100,0.14)] bg-white outline-none cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        onContextMenu={(event) => event.preventDefault()}
        onClick={handleCardClick}
      >
        {displayImageUrl && (
          <div className="relative">
            <img
              src={displayImageUrl}
              alt=""
              onLoad={(event) => {
                setImageHeightState({
                  src: displayImageUrl,
                  height: isYouTubeThumbnail
                    ? 160
                    : getCardImageHeight(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight),
                });
              }}
              onError={() => {
                if (!imageUrl) setFailedYouTubeThumbnailUrl(youtubeThumbnailUrl);
              }}
              className="w-full object-cover"
              style={{ height: imageHeight }}
            />
            {imageCount > 1 && (
              <span className="pointer-events-none absolute right-2.5 top-2.5 z-10 rounded-full bg-[rgba(32,28,24,0.58)] px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-white shadow-[0_1px_4px_rgba(0,0,0,0.14)] ring-1 ring-white/35">
                +{imageCount - 1}
              </span>
            )}
          </div>
        )}
        {showInstagramPlaceholder && (
          <div className="flex h-[140px] w-full flex-col items-center justify-center bg-[#FAF8F4] px-3 text-center">
            <span className="text-[11px] font-medium text-[rgba(120,112,100,0.66)]">Instagram</span>
            <span className="mt-1.5 max-w-full truncate text-[13px] font-medium text-[rgba(50,44,34,0.72)]">
              {instagramUsername ? `@${instagramUsername}` : "저장한 게시물"}
            </span>
          </div>
        )}

        <div className="flex min-w-0 flex-col p-3">
          <HomeCardPokachipRow
            fragment={fragment}
            selectedChip={selectedChip}
            className={chipBottomSpacing}
          />

          {hasTitle && (
            <p
              className="min-w-0 overflow-hidden break-words line-clamp-2 text-[14px] font-medium leading-[20px] text-[rgba(50,44,34,0.86)]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              {fragment.title}
            </p>
          )}

          {hasMemo && (
            <p
              className="mt-1 min-w-0 overflow-hidden break-words line-clamp-1 text-[12px] font-normal leading-[17px] text-[rgba(50,44,34,0.7)]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              {fragment.memo}
            </p>
          )}

          <div className={`${metaTopSpacing} flex min-w-0 items-center gap-1.5 text-[12px] leading-[17px] text-[rgba(120,112,100,0.72)]`}>
            <SourceIcon size={12} color={sourceIconColor} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
              {getFragmentDisplayTime(fragment)}
            </span>
            {fragment.pinnedAt && (
              <FavoriteHeartIcon
                active
                className="pointer-events-none ml-auto h-auto w-[15px] shrink-0"
                aria-label="즐겨찾기됨"
                role="img"
              />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
const SearchResultCard = ({
  fragment,
  navigationIds,
  navigationReturnTo,
}: {
  fragment: Fragment;
  navigationIds: string[];
  navigationReturnTo: string;
}) => {
  const [, navigate] = useLocation();
  const imageUrl = useFragmentImage(fragment);
  const imageCount = getFragmentImageCount(fragment);
  const SourceIcon = getFragmentSourceIcon(fragment);

  return (
    <Link
      href={`/fragment/${fragment.id}`}
      onClick={(event) => {
        event.preventDefault();
        navigate(createFragmentNavigationPath({
          fragmentId: fragment.id,
          fragmentIds: navigationIds,
          returnTo: navigationReturnTo,
          source: "home-search",
        }));
      }}
    >
      <motion.div
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="home-select-none min-h-[104px] min-w-0 select-none overflow-hidden rounded-[14px] border border-[rgba(120,112,100,0.14)] bg-white shadow-[0_6px_18px_rgba(74,63,48,0.09)]"
      >
        {imageUrl && (
          <div className="relative">
            <img src={imageUrl} alt="" className="h-[112px] w-full object-cover" />
            {imageCount > 1 && (
              <span className="pointer-events-none absolute right-2 top-2 z-10 rounded-full bg-[rgba(32,28,24,0.58)] px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-white shadow-[0_1px_4px_rgba(0,0,0,0.14)] ring-1 ring-white/35">
                +{imageCount - 1}
              </span>
            )}
          </div>
        )}
        <div className="px-3.5 py-3">
        <HomeCardPokachipRow fragment={fragment} className="mb-2" />
        <p
          className="min-w-0 overflow-hidden break-words line-clamp-2 text-[14px] font-semibold leading-[20px] text-[#3a3228]"
          style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
        >
          {fragment.title}
        </p>
        {shouldShowMemoPreview(fragment) && (
          <p
            className="mt-1 min-w-0 overflow-hidden break-words line-clamp-1 text-[12px] leading-[17px] text-[rgba(50,44,34,0.7)]"
            style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
          >
            {fragment.memo}
          </p>
        )}
        <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[12px] leading-[17px] text-[rgba(120,112,100,0.72)]">
          <SourceIcon size={12} color={sourceIconColor} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>{getFragmentDisplayTime(fragment)}</span>
          {fragment.pinnedAt && (
            <FavoriteHeartIcon
              active
              className="pointer-events-none ml-auto h-auto w-[15px] shrink-0"
              aria-label="즐겨찾기됨"
              role="img"
            />
          )}
        </div>
        </div>
      </motion.div>
    </Link>
  );
};

const HomeEmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="flex min-h-[220px] flex-col items-center justify-center px-5 pb-[calc(18rem+env(safe-area-inset-bottom))] pt-8 text-center">
    <p
      className="text-[15px] font-medium leading-[22px] text-[rgba(50,44,34,0.72)]"
      style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
    >
      {title}
    </p>
    <p
      className="mt-2 text-[12px] leading-relaxed text-[rgba(120,112,100,0.75)]"
      style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
    >
      {description}
    </p>
  </div>
);

export const Home = (): JSX.Element => {
  const { fragments, toggleFragmentPin, deleteFragment } = useFragments();
  const topPokachipScrollRef = useRef<HTMLDivElement | null>(null);
  const topPokachipDragRef = useRef<{ isDragging: boolean; startX: number; scrollLeft: number }>({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
  });
  const topPokachipSnapTimerRef = useRef<number | null>(null);
  const [selectedChip, setSelectedChip] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get("chip")
  );
  const [isSearchMode, setIsSearchMode] = useState(
    () => new URLSearchParams(window.location.search).has("search")
  );
  const [searchQuery, setSearchQuery] = useState(
    () => new URLSearchParams(window.location.search).get("search") ?? ""
  );
  const [openMenuFragmentId, setOpenMenuFragmentId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [shareSheetFragment, setShareSheetFragment] = useState<Fragment | null>(null);
  const [shareSheetStatus, setShareSheetStatus] = useState<"idle" | "copying" | "copied">("idle");
  const storedPokachips = getRecentPokachips(fragments, { includeFallback: false });
  const pokachipUsage = new Map<string, { label: string; count: number; lastUsedAt: number }>();
  fragments.forEach((fragment, fragmentIndex) => {
    const lastUsedAt = Date.parse(getFragmentReferenceAt(fragment, fragmentIndex)) || 0;
    const fragmentPokachips = new Map<string, string>();
    (fragment.pokachips ?? []).forEach((value) => {
      const label = normalizePokachipName(value);
      const key = getPokachipKey(label);
      if (label && !fragmentPokachips.has(key)) fragmentPokachips.set(key, label);
    });
    fragmentPokachips.forEach((label, key) => {
      const current = pokachipUsage.get(key);
      pokachipUsage.set(key, { label: current?.label ?? label, count: (current?.count ?? 0) + 1, lastUsedAt: Math.max(current?.lastUsedAt ?? 0, lastUsedAt) });
    });
  });
  const pokachipUsages = Array.from(pokachipUsage.values());

  const topPokachips = [...pokachipUsages].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  const interestCandidates = [...pokachipUsages]
    .filter(({ label, count }) => count >= 5 && !isTemporaryPokachip(label))
    .sort((a, b) => b.count - a.count || b.lastUsedAt - a.lastUsedAt)
    .slice(0, 6);
  const interests = interestCandidates.length >= 3 ? interestCandidates : [];
  const hasInterests = interests.length >= 3;
  const displayPokachips = topPokachips.map((pokachip) => {
    const isTemporary = isTemporaryPokachip(pokachip.label);
    const token = getPokachipColorToken(pokachip.label);
    return { ...pokachip, token, isTemporary };
  });
  const topPokachipKey = displayPokachips.map(({ label, count, token }) => `${label}:${count}:${token.name}`).join("|");
  const visibleFragments = selectedChip
    ? fragments.filter((fragment) =>
        (fragment.pokachips ?? []).some(
          (chip) => getPokachipKey(chip) === getPokachipKey(selectedChip)
        )
      )
    : fragments;
  const isDefaultHomeList = selectedChip === null;
  const pinnedFragments = isDefaultHomeList
    ? visibleFragments
        .filter((fragment) => Boolean(fragment.pinnedAt))
        .sort(
          (a, b) =>
            (Date.parse(b.pinnedAt ?? "") || 0) -
            (Date.parse(a.pinnedAt ?? "") || 0)
        )
    : [];
  const regularFragments = isDefaultHomeList
    ? visibleFragments.filter((fragment) => !fragment.pinnedAt)
    : visibleFragments;
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase("ko-KR");
  const searchResults = normalizedSearchQuery
    ? fragments.filter((fragment) => {
        const searchable = [
          fragment.title,
          fragment.memo,
          fragment.source,
          fragment.url,
          ...(fragment.pokachips ?? []).map(normalizePokachipName),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("ko-KR");

        return searchable.includes(normalizedSearchQuery);
      })
    : [];
  const homeNavigationIds = [...pinnedFragments, ...regularFragments].map((fragment) => fragment.id);
  const searchResultIds = searchResults.map((fragment) => fragment.id);
  const homeReturnTo = selectedChip ? `/?chip=${encodeURIComponent(selectedChip)}` : "/";
  const homeNavigationSource: FragmentNavigationSource = selectedChip ? "home-filter" : "home";
  const homeSearchReturnTo = `/?search=${encodeURIComponent(searchQuery)}`;

  const replaceHomeUrl = (params: URLSearchParams) => {
    const search = params.toString();
    window.history.replaceState(window.history.state, "", search ? `/?${search}` : "/");
  };

  const closeLongPressMenu = () => setOpenMenuFragmentId(null);

  const closeLongPressMenuImmediately = () => {
    if (!openMenuFragmentId) return;
    flushSync(() => setOpenMenuFragmentId(null));
  };

  const selectHomeFilter = (chip: string | null) => {
    closeLongPressMenuImmediately();
    setSelectedChip(chip);
    const params = new URLSearchParams();
    if (chip) params.set("chip", chip);
    replaceHomeUrl(params);
  };

  const snapTopPokachipRowToNearest = () => {
    const scrollContainer = topPokachipScrollRef.current;
    if (!scrollContainer) return;

    const chips = Array.from(scrollContainer.querySelectorAll<HTMLButtonElement>("button"));
    if (chips.length === 0) return;

    const containerLeft = scrollContainer.getBoundingClientRect().left;
    const currentScrollLeft = scrollContainer.scrollLeft;
    const maxScrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
    const snapTarget = chips.reduce((nearest, chip, index) => {
      const chipLeft = chip.getBoundingClientRect().left;
      const chipScrollLeft = index === 0 ? 0 : currentScrollLeft + chipLeft - containerLeft;
      const clampedScrollLeft = Math.min(maxScrollLeft, Math.max(0, chipScrollLeft));
      const distance = Math.abs(clampedScrollLeft - currentScrollLeft);

      return distance < nearest.distance
        ? { scrollLeft: clampedScrollLeft, distance }
        : nearest;
    }, { scrollLeft: currentScrollLeft, distance: Number.POSITIVE_INFINITY });

    scrollContainer.scrollTo({ left: snapTarget.scrollLeft, behavior: "smooth" });
  };

  const scheduleTopPokachipSnap = () => {
    if (topPokachipSnapTimerRef.current) {
      window.clearTimeout(topPokachipSnapTimerRef.current);
    }

    topPokachipSnapTimerRef.current = window.setTimeout(() => {
      topPokachipSnapTimerRef.current = null;
      snapTopPokachipRowToNearest();
    }, 120);
  };

  const scrollTopPokachipRow = (delta: number): boolean => {
    const scrollContainer = topPokachipScrollRef.current;
    if (!scrollContainer) return false;

    const maxScrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
    if (maxScrollLeft <= 0 || delta === 0) return false;

    const currentScrollLeft = scrollContainer.scrollLeft;
    const nextScrollLeft = Math.min(
      maxScrollLeft,
      Math.max(0, currentScrollLeft + delta)
    );
    if (nextScrollLeft === currentScrollLeft) return false;

    scrollContainer.scrollLeft = nextScrollLeft;
    scheduleTopPokachipSnap();
    return true;
  };

  const handleTopPokachipPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;

    if (topPokachipSnapTimerRef.current) {
      window.clearTimeout(topPokachipSnapTimerRef.current);
      topPokachipSnapTimerRef.current = null;
    }

    topPokachipDragRef.current = {
      isDragging: true,
      startX: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleTopPokachipPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = topPokachipDragRef.current;
    if (!dragState.isDragging) return;

    event.preventDefault();
    event.currentTarget.scrollLeft = dragState.scrollLeft - (event.clientX - dragState.startX);
  };

  const stopTopPokachipDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!topPokachipDragRef.current.isDragging) return;

    topPokachipDragRef.current.isDragging = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    snapTopPokachipRowToNearest();
  };

  const openSearchMode = () => {
    closeLongPressMenu();
    setSelectedChip(null);
    setIsSearchMode(true);
    const params = new URLSearchParams();
    params.set("search", searchQuery);
    replaceHomeUrl(params);
  };

  const closeSearchMode = () => {
    setSearchQuery("");
    setIsSearchMode(false);
    replaceHomeUrl(new URLSearchParams());
  };

  const resetHomeView = () => {
    closeLongPressMenu();
    setSelectedChip(null);
    closeSearchMode();
  };

  const handleDeleteFragment = (id: string) => {
    deleteFragment(id);
    setOpenMenuFragmentId(null);
  };

  const showHomeToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 2000);
  };

  const handleToggleFragmentPin = (fragment: Fragment) => {
    const updatedFragment = toggleFragmentPin(fragment.id);

    setOpenMenuFragmentId(null);
    showHomeToast(
      updatedFragment
        ? updatedFragment.pinnedAt
          ? "기억 조각을 상단에 고정했어요"
          : "상단 고정을 해제했어요"
        : "상단 고정을 바꾸지 못했어요"
    );
  };

  const handleShareResult = (result: Awaited<ReturnType<typeof shareFragment>>) => {
    if (result === "shared-and-copied") {
      showHomeToast("이미지를 보냈어요. 글은 복사해뒀어요. 입력창에 붙여넣어 주세요.");
    } else if (result === "copied") {
      showHomeToast("글을 복사했어요. 원하는 곳에 붙여넣어 주세요.");
    } else if (result === "failed") {
      showHomeToast("공유할 수 없었어요");
    }
  };

  const performShare = async (fragment: Fragment) => {
    handleShareResult(await shareFragment(fragment));
  };

  const handleImageShareWithTextCopy = async (fragment: Fragment) => {
    if (shareSheetStatus !== "idle") return;

    setShareSheetStatus("copying");
    const copyResult = await copyFragmentShareText(fragment);
    if (copyResult !== "copied") {
      setShareSheetStatus("idle");
      showHomeToast("글 복사에 실패했어요. 글만 복사를 다시 시도해 주세요.");
      return;
    }

    setShareSheetStatus("copied");
    await delayImageShare();
    setShareSheetFragment(null);
    setShareSheetStatus("idle");

    const shareResult = await shareFragment(fragment);
    if (shareResult === "shared" || shareResult === "shared-and-copied") {
      const postCopyResult = await copyFragmentShareText(fragment);
      handleShareResult(postCopyResult === "copied" ? "shared-and-copied" : shareResult);
      return;
    }
    handleShareResult(shareResult);
  };

  const handleShareFragment = (fragment: Fragment) => {
    if (shouldOfferImageShare(fragment)) {
      setShareSheetStatus("idle");
      setShareSheetFragment(fragment);
      return;
    }
    void performShare(fragment);
  };

  const handleCopyShareText = async (fragment: Fragment) => {
    handleShareResult(await copyFragmentShareText(fragment));
  };

  useEffect(() => {
    const shouldResetHomeView = sessionStorage.getItem("chaejip-home-reset-view") === "1";
    const shouldShowSaveToast = sessionStorage.getItem(saveToastStorageKey) === "1";

    if (shouldResetHomeView) {
      sessionStorage.removeItem("chaejip-home-reset-view");
      setSelectedChip(null);
      closeSearchMode();
    }
    if (!shouldShowSaveToast) return;

    sessionStorage.removeItem(saveToastStorageKey);
    setToastMessage("\uAC00\uBC29\uC5D0 \uB2F4\uC558\uC5B4\uC694");

    const toastTimer = window.setTimeout(() => setToastMessage(""), 2000);
    return () => window.clearTimeout(toastTimer);
  }, []);
  useEffect(() => {
    const scrollContainer = topPokachipScrollRef.current;
    if (!scrollContainer) return;

    scrollContainer.scrollLeft = 0;
  }, [topPokachipKey]);

  useEffect(() => {
    closeLongPressMenu();
  }, [selectedChip]);

  useEffect(() => {
    const scrollContainer = topPokachipScrollRef.current;
    if (!scrollContainer) return;

    const handleWheel = (event: globalThis.WheelEvent) => {
      const delta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
      if (scrollTopPokachipRow(delta)) {
        event.preventDefault();
      }
    };

    scrollContainer.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      scrollContainer.removeEventListener("wheel", handleWheel);
      if (topPokachipSnapTimerRef.current) {
        window.clearTimeout(topPokachipSnapTimerRef.current);
        topPokachipSnapTimerRef.current = null;
      }
    };
  }, [topPokachipKey]);

  useEffect(() => {
    if (!openMenuFragmentId) return;

    const closeMenuOnScroll = () => setOpenMenuFragmentId(null);

    document.addEventListener("scroll", closeMenuOnScroll, true);
    return () => document.removeEventListener("scroll", closeMenuOnScroll, true);
  }, [openMenuFragmentId]);

  useEffect(() => {
    if (!openMenuFragmentId) return;

    const isOpenMenuFragmentVisible = visibleFragments.some(
      (fragment) => fragment.id === openMenuFragmentId
    );
    if (!isOpenMenuFragmentVisible) {
      closeLongPressMenu();
    }
  }, [openMenuFragmentId, visibleFragments]);

  const renderFragmentColumns = (items: Fragment[]) => {
    const columns = [
      { id: "left", fragments: items.filter((_, index) => index % 2 === 0) },
      { id: "right", fragments: items.filter((_, index) => index % 2 === 1) },
    ];

    return (
      <div className="flex gap-3">
        {columns.map(({ id, fragments: column }) => (
          <div key={id} className="flex min-w-0 flex-1 flex-col gap-3">
            {column.map((fragment) => (
              <FragmentCard
                key={fragment.id}
                fragment={fragment}
                selectedChip={selectedChip}
                isMenuOpen={openMenuFragmentId === fragment.id}
                onOpenMenu={() => setOpenMenuFragmentId(fragment.id)}
                onCloseMenu={() => setOpenMenuFragmentId(null)}
                onTogglePin={() => handleToggleFragmentPin(fragment)}
                onDelete={() => handleDeleteFragment(fragment.id)}
                onShare={() => handleShareFragment(fragment)}
                navigationIds={homeNavigationIds}
                navigationReturnTo={homeReturnTo}
                navigationSource={homeNavigationSource}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#faf8f4] sm:bg-[#f3f0ec]">
      <section className="relative flex min-h-screen w-full flex-col bg-[#faf8f4] sm:max-w-[390px]" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
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
        {isSearchMode ? (
          <section className="flex min-h-screen flex-1 flex-col bg-[#faf8f4] pb-[calc(15rem+env(safe-area-inset-bottom))]">
            <header className="border-b border-[#F5F2ED] bg-[#FFFEFB] px-4 py-3">
              <div className="flex h-10 items-center gap-2 rounded-[14px] bg-[rgba(120,112,100,0.05)] px-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <span aria-hidden="true" className="flex h-full w-5 shrink-0 items-center justify-center text-[rgba(120,112,100,0.5)]">
                  <Search className="h-[18px] w-[18px] shrink-0 -translate-y-px" strokeWidth={2} />
                </span>
                <input
                  value={searchQuery}
                  onChange={(event) => {
                    const nextQuery = event.target.value;
                    setSearchQuery(nextQuery);
                    const params = new URLSearchParams();
                    params.set("search", nextQuery);
                    replaceHomeUrl(params);
                  }}
                  placeholder="기억 속에서 찾기..."
                  autoComplete="off"
                  autoFocus
                  className="h-full min-h-0 min-w-0 flex-1 bg-transparent py-0 text-[14px] font-medium leading-normal text-[rgba(50,44,34,0.8)] outline-none placeholder:text-[rgba(120,112,100,0.4)]"
                  style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                />
                <button
                  type="button"
                  onClick={closeSearchMode}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[18px] font-light leading-none text-[rgba(120,112,100,0.5)]"
                  aria-label="검색 닫기"
                  >
                  ×
                </button>
              </div>
            </header>

            <div className="flex flex-1 flex-col px-4 pt-4">
              {!normalizedSearchQuery && storedPokachips.length > 0 && (
                <div>
                  <p
                    className="text-[12px] font-medium text-[#78706499]"
                    style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                  >
                    최근 기억 조각
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {storedPokachips.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          setSearchQuery(chip);
                          const params = new URLSearchParams();
                          params.set("search", chip);
                          replaceHomeUrl(params);
                        }}
                        className="home-select-none select-none h-[29px] rounded-full border border-[rgba(255,255,255,0.55)] px-3.5 py-0 text-[11px] font-medium text-[rgba(50,44,34,0.7)]"
                        style={{
                          ...getPokachipSmallPillStyle(chip),
                          fontFamily: "'Pretendard Variable', sans-serif",
                        }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {normalizedSearchQuery && (
                <p
                  className="text-[13px] font-medium text-[#8f877c99]"
                  style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                >
                  '{searchQuery.trim()}' · {searchResults.length}개
                </p>
              )}

              {normalizedSearchQuery && searchResults.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {searchResults.map((fragment) => (
                    <SearchResultCard
                      key={fragment.id}
                      fragment={fragment}
                      navigationIds={searchResultIds}
                      navigationReturnTo={homeSearchReturnTo}
                    />
                  ))}
                </div>
              )}

              {normalizedSearchQuery && searchResults.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center pb-24 text-center">
                  <div className="relative mb-4 flex h-10 w-10 items-center justify-center rounded-[12px] border-2 border-[#c9c2b8]">
                    <span className="h-2.5 w-px bg-[#c9c2b8]" />
                    <span className="ml-2 h-2.5 w-px bg-[#c9c2b8]" />
                    <span className="absolute -top-4 left-1/2 h-2 w-px -translate-x-1/2 bg-[#c9c2b8]" />
                    <span className="absolute -top-3 left-[9px] h-2 w-px -rotate-45 bg-[#c9c2b8]" />
                    <span className="absolute -top-3 right-[9px] h-2 w-px rotate-45 bg-[#c9c2b8]" />
                  </div>
                  <p
                    className="text-[16px] font-medium text-[#78706480]"
                    style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                  >
                    모아둔 기억 조각이 없어요
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <>

        {/* Home top area: Header, 조건부 Hero, 작은 포카칩의 연속된 상단 흐름 */}
        <section className="bg-[#FFFEFB]">
        {/* Header: 관심사 장식과 분리된 고정 Surface */}
        <header className="flex items-center justify-between bg-[#FFFEFB] px-4 pb-3 pt-5">
          <h1
            className="text-[18px] font-semibold leading-[1.45] text-[#353a69b2]"
            style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
          >
            {"\uB0B4 \uAE30\uC5B5"}
          </h1>
          <button
            type="button"
            onClick={openSearchMode}
            className="-my-[9px] flex h-11 w-11 items-center justify-center text-[#78706480] outline-none transition-colors duration-150 hover:text-[#787064b3] focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-[rgba(110,103,207,0.28)] active:text-[#787064cc]"
            aria-label="조각 찾기"
          >
            <svg width="24" height="24" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.3" />
              <path d="M12 12L15 15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {/* Hero: 큰 관심사가 충분히 자랐을 때만 장식과 함께 표시 */}
        {hasInterests && (
          <section className="relative overflow-hidden px-4 pb-2 pt-2">
            <div className="relative z-10 grid grid-cols-3 gap-2">
              {interests.map((interest) => {
                const interestStyle = getInterestStyle(interest.label, interest.count);
                return (
                  <button
                    key={interest.label}
                    type="button"
                    onClick={() => selectHomeFilter(interest.label)}
                    className="home-select-none select-none flex h-20 items-center justify-center rounded-[20px] px-2"
                    style={{ background: interestStyle.gradient, boxShadow: interestStyle.shadow }}
                  >
                    <span
                      className="text-[13px] font-medium"
                      style={{ color: interestStyle.text, fontFamily: "'Pretendard Variable', sans-serif" }}
                    >
                      {interest.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Small chips: Hero gradient 밖에서 Header 흐름을 마무리하는 독립 row */}
        {displayPokachips.length > 0 && (
          <section className="w-full overflow-hidden pb-3 pt-2">
            <div className="relative flex w-full min-w-0 items-center gap-2 overflow-hidden py-[3px]">
              <div
                ref={topPokachipScrollRef}
                onPointerDown={handleTopPokachipPointerDown}
                onPointerMove={handleTopPokachipPointerMove}
                onPointerUp={stopTopPokachipDrag}
                onPointerCancel={stopTopPokachipDrag}
                onPointerLeave={stopTopPokachipDrag}
                className="home-select-none flex w-full min-w-0 snap-x snap-proximity cursor-grab touch-pan-x flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap overscroll-x-contain py-2 pr-6 select-none active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                <span aria-hidden="true" className="w-2 shrink-0 snap-start" />
                {displayPokachips.map(({ label }) => {
                  const isSelected = getPokachipKey(label) === getPokachipKey(selectedChip ?? "");
                  return (
                    <motion.button
                      key={label}
                      onClick={() => selectHomeFilter(label)}
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      className="home-select-none select-none box-border inline-flex h-[29px] min-w-0 max-w-[calc(100%-32px)] shrink-0 snap-start items-center justify-center gap-2.5 overflow-hidden rounded-[999px] border px-3.5 py-[6px] text-[12px] font-medium leading-[17px]"
                      style={{
                        ...getPokachipSmallPillStyle(
                          label,
                          isSelected ? "selected" : "regular"
                        ),
                        fontFamily: "'Pretendard Variable', sans-serif",
                      }}
                    >
                      <span className="min-w-0 truncate">{label}</span>
                    </motion.button>
                  );
                })}
                <span aria-hidden="true" className="w-[calc(100%-64px)] shrink-0" />
              </div>
            </div>
          </section>
        )}
        </section>

        {/* 수집된 조각 피드 — 선 대신 따뜻한 배경 톤으로 부드럽게 전환 */}
        <section
          className="relative flex-1 pt-4"
          style={{
            backgroundColor: "#FAF8F4",
          }}
        >
          {/* 오늘 모은 조각들 헤더 */}
          <div className="px-4 mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              {!selectedChip && pinnedFragments.length > 0 ? (
                <Pin size={13} strokeWidth={2.4} className="shrink-0 text-[rgba(110,103,207,0.68)]" aria-hidden="true" />
              ) : (
                <img src="/figmaAssets/glass.svg" alt="" className="h-[14px] w-[10px]" />
              )}
              <span
                className="min-w-0 truncate text-sm font-semibold text-[#787064bf]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                {selectedChip
                  ? `${selectedChip} · ${visibleFragments.length}개`
                  : pinnedFragments.length > 0
                    ? `상단 고정 · ${pinnedFragments.length}개`
                    : "오늘 모은 조각들"}
              </span>
            </div>
            {selectedChip && (
              <button
                type="button"
                onClick={() => selectHomeFilter(null)}
                className="shrink-0 text-[12px] font-medium text-[#78706480]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                가방으로
              </button>
            )}
          </div>

          {/* 고정된 조각을 일반 카드 목록보다 먼저 표시 */}
          {visibleFragments.length > 0 ? (
            <div className="px-4 pb-[calc(18rem+env(safe-area-inset-bottom))]">
              {selectedChip && pinnedFragments.length > 0 && (
                <div className="mb-3 flex items-center gap-1.5">
                  <Pin size={13} strokeWidth={2.4} className="shrink-0 text-[rgba(110,103,207,0.68)]" aria-hidden="true" />
                  <span className="text-[12px] font-semibold text-[rgba(120,112,100,0.72)]">
                    상단 고정
                  </span>
                </div>
              )}
              {pinnedFragments.length > 0 && renderFragmentColumns(pinnedFragments)}
              {regularFragments.length > 0 && (
                <section className={pinnedFragments.length > 0 ? "mt-6" : ""}>
                  {pinnedFragments.length > 0 && (
                    <div className="mb-3 flex items-center gap-1.5">
                      <img src="/figmaAssets/glass.svg" alt="" className="h-[14px] w-[10px]" />
                      <span className="text-[12px] font-semibold text-[rgba(120,112,100,0.72)]">
                        모아둔 조각들
                      </span>
                    </div>
                  )}
                  {renderFragmentColumns(regularFragments)}
                </section>
              )}
            </div>
          ) : selectedChip ? (
            <HomeEmptyState
              title="이 기억 조각에 담긴 조각이 아직 없어요."
              description="다른 조각을 보거나 가방으로 돌아가보세요."
            />
          ) : (
            <HomeEmptyState
              title="아직 담긴 조각이 없어요."
              description="마음에 걸린 것부터 하나씩 담아보세요."
            />
          )}
        </section>
          </>
        )}
        {shareSheetFragment && (
          <div
            className="fixed inset-y-0 left-1/2 z-[80] flex w-full max-w-[390px] -translate-x-1/2 items-end bg-[rgba(32,28,24,0.32)] backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-image-share-title"
            onClick={() => {
              if (shareSheetStatus === "idle") setShareSheetFragment(null);
            }}
          >
            <div
              className="w-full rounded-t-[24px] bg-[#FFFFFF] px-5 pb-6 pt-5 shadow-[0_-16px_48px_rgba(60,50,40,0.16)]"
              style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="home-image-share-title" className="text-[18px] font-semibold text-[#3a3228]">이미지와 글을 같이 보낼게요</h2>
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
                    void handleImageShareWithTextCopy(shareSheetFragment);
                  }}
                  className={`h-12 rounded-full bg-[#8e88ed] text-[14px] font-semibold text-white transition ${shareSheetStatus !== "idle" ? "opacity-80" : ""}`}
                >
                  {shareSheetStatus === "copied" ? "글 복사 완료! 이미지를 보낼게요" : shareSheetStatus === "copying" ? "글 복사 중..." : "글 먼저 복사하고 이미지 공유"}
                </button>
                <button
                  type="button"
                  disabled={shareSheetStatus !== "idle"}
                  onClick={() => {
                    const fragment = shareSheetFragment;
                    setShareSheetFragment(null);
                    setShareSheetStatus("idle");
                    void handleCopyShareText(fragment);
                  }}
                  className="h-12 rounded-full border border-[#0000000a] bg-[#FAF8F4] text-[14px] font-semibold text-[#787064] disabled:opacity-60"
                >
                  글만 복사
                </button>
                <button type="button" disabled={shareSheetStatus !== "idle"} onClick={() => { setShareSheetFragment(null); setShareSheetStatus("idle"); }} className="h-11 text-[13px] font-medium text-[#a0988c] disabled:opacity-60">취소</button>
              </div>
            </div>
          </div>
        )}
        <BottomNav activeTab="home" onHomeClick={resetHomeView} />

      </section>
    </main>
  );
};
