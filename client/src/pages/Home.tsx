import { motion } from "framer-motion";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { Globe, Instagram, Pencil, Sparkles, Youtube, type LucideIcon } from "lucide-react";
import { flushSync } from "react-dom";
import { Link, useLocation } from "wouter";
import { getFragmentDisplayTime, getPokachipColor, getRecentPokachips, normalizePokachipName, type Fragment } from "@/data/fragments";
import { useFragments } from "@/hooks/useFragments";
import { useFragmentImage } from "@/hooks/useFragmentImage";
import { BottomNav } from "@/components/BottomNav";
import { shareFragmentWithNotice } from "@/lib/shareFragment";

const interests = [
  {
    id: "webapp",
    label: "웹앱",
    gradient: "linear-gradient(145deg, #c9d9f4 0%, #c5c5ef 48%, #d7c8ed 100%)",
    shadow: "0 8px 18px rgba(112,126,153,0.18)",
  },
  {
    id: "interior",
    label: "인테리어",
    gradient: "linear-gradient(140deg, #d5bff0 0%, #dec1e8 50%, #edcfc2 100%)",
    shadow: "0 8px 18px rgba(142,113,128,0.18)",
  },
  {
    id: "aquarium",
    label: "수조",
    gradient: "linear-gradient(145deg, #bfe4db 0%, #b3ddd9 50%, #bddfeb 100%)",
    shadow: "0 8px 18px rgba(91,135,137,0.18)",
  },
  {
    id: "routine",
    label: "루틴",
    gradient: "linear-gradient(140deg, #b8ddce 0%, #c9dfc7 50%, #eadfae 100%)",
    shadow: "0 8px 18px rgba(119,132,103,0.18)",
  },
  {
    id: "lighting",
    label: "조명",
    gradient: "linear-gradient(145deg, #f3e4b8 0%, #efd28c 52%, #e9c472 100%)",
    shadow: "0 8px 18px rgba(151,126,73,0.18)",
  },
  {
    id: "cooking",
    label: "요리",
    gradient: "linear-gradient(140deg, #f0bdc4 0%, #eeaebb 50%, #efc2b3 100%)",
    shadow: "0 8px 18px rgba(148,99,96,0.18)",
  },
];

const defaultPokachips = ["유리", "파랑", "임시조각"];
const saveToastStorageKey = "chaejip-save-toast";

const sourceIconColor = "rgba(120,112,100,0.65)";

const getColorWithAlpha = (color: string, alpha: number): string => {
  const rgbaMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbaMatch) {
    const [, red, green, blue] = rgbaMatch;
    return `rgba(${red},${green},${blue},${alpha})`;
  }

  const hexMatch = color.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);
    return `rgba(${red},${green},${blue},${alpha})`;
  }

  return color;
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
  isMenuOpen,
  onOpenMenu,
  onCloseMenu,
  onDelete,
  onShare,
}: {
  fragment: Fragment;
  isMenuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onDelete: () => void;
  onShare: () => void | Promise<void>;
}) => {
  const [, navigate] = useLocation();
  const imageUrl = useFragmentImage(fragment);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const didLongPressRef = useRef(false);
  const SourceIcon = getFragmentSourceIcon(fragment);
  const primaryChip = fragment.pokachips[0] ? normalizePokachipName(fragment.pokachips[0]) : "";
  const hasTitle = Boolean(fragment.title.trim());
  const hasMemo = shouldShowMemoPreview(fragment);
  const chipBottomSpacing = hasTitle || hasMemo ? "mb-2" : "mb-0";
  const metaTopSpacing = hasTitle || hasMemo ? "mt-1" : primaryChip ? "mt-2" : "";

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

    navigate(`/fragment/${fragment.id}`);
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
              boxShadow: "0px 8px 24px rgba(74,63,48,0.08)",
            }}
        whileTap={{ scale: isMenuOpen ? 1.01 : 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="home-select-none min-w-0 select-none overflow-hidden rounded-[18px] bg-white/90 outline-none cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        onContextMenu={(event) => event.preventDefault()}
        onClick={handleCardClick}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="h-[140px] w-full object-cover"
          />
        )}

        <div className="flex flex-col p-3">
          {primaryChip && (
            <span
              className={`${chipBottomSpacing} flex h-6 max-w-full items-center self-start truncate rounded-[999px] px-2.5 py-1 text-[11px] font-medium leading-4 text-[rgba(50,44,34,0.68)]`}
              style={{
                backgroundColor: getPokachipColor(primaryChip),
                fontFamily: "'Pretendard Variable', sans-serif",
              }}
            >
              {primaryChip}
            </span>
          )}

          {hasTitle && (
            <p
              className="line-clamp-2 break-words text-[14px] font-medium leading-[20px] text-[rgba(50,44,34,0.8)]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              {fragment.title}
            </p>
          )}

          {hasMemo && (
            <p
              className="mt-1 line-clamp-1 break-words text-[12px] font-normal leading-[17px] text-[rgba(50,44,34,0.65)]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              {fragment.memo}
            </p>
          )}

          <div className={`${metaTopSpacing} flex items-center gap-1.5 text-[12px] leading-[17px] text-[rgba(120,112,100,0.65)]`}>
            <SourceIcon size={12} color={sourceIconColor} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
            <span className="truncate" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
              {getFragmentDisplayTime(fragment)}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
const SearchResultCard = ({ fragment }: { fragment: Fragment }) => {
  const primaryChip = fragment.pokachips[0] ? normalizePokachipName(fragment.pokachips[0]) : "";
  const SourceIcon = getFragmentSourceIcon(fragment);

  return (
    <Link href={`/fragment/${fragment.id}`}>
      <motion.div
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="home-select-none select-none min-h-[104px] rounded-[14px] border border-white/85 bg-white/90 px-3.5 py-3 shadow-[0_6px_18px_rgba(74,63,48,0.08)]"
      >
        {primaryChip && (
          <span
            className="mb-2 inline-flex h-[20px] items-center rounded-full px-2.5 text-[10px] font-medium text-[#5a5248b0]"
            style={{
              backgroundColor: getPokachipColor(primaryChip),
              fontFamily: "'Pretendard Variable', sans-serif",
            }}
          >
            {primaryChip}
          </span>
        )}
        <p
          className="line-clamp-2 text-[12px] font-semibold leading-[1.55] text-[#3a3228]"
          style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
        >
          {fragment.title}
        </p>
        {shouldShowMemoPreview(fragment) && (
          <p
            className="mt-1 line-clamp-1 text-[10px] leading-snug text-[#8f877c99]"
            style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
          >
            {fragment.memo}
          </p>
        )}
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[rgba(120,112,100,0.65)]">
          <SourceIcon size={12} color={sourceIconColor} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
          <span className="truncate" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>{getFragmentDisplayTime(fragment)}</span>
        </div>
      </motion.div>
    </Link>
  );
};

export const Home = (): JSX.Element => {
  const { fragments, deleteFragment } = useFragments();
  const topPokachipScrollRef = useRef<HTMLDivElement | null>(null);
  const topPokachipDragRef = useRef<{ isDragging: boolean; startX: number; scrollLeft: number }>({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
  });
  const topPokachipSnapTimerRef = useRef<number | null>(null);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuFragmentId, setOpenMenuFragmentId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const storedPokachips = getRecentPokachips(fragments, { includeFallback: false });
  const topPokachips = getRecentPokachips(fragments);
  const topPokachipKey = topPokachips.join("|");
  const visibleFragments = selectedChip
    ? fragments.filter((fragment) =>
        (fragment.pokachips ?? []).some(
          (chip) => normalizePokachipName(chip) === selectedChip
        )
      )
    : fragments;
  const leftColumnFragments = visibleFragments.filter((_, index) => index % 2 === 0);
  const rightColumnFragments = visibleFragments.filter((_, index) => index % 2 === 1);
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

  const closeLongPressMenu = () => setOpenMenuFragmentId(null);

  const closeLongPressMenuImmediately = () => {
    if (!openMenuFragmentId) return;
    flushSync(() => setOpenMenuFragmentId(null));
  };

  const selectHomeFilter = (chip: string | null) => {
    closeLongPressMenuImmediately();
    setSelectedChip(chip);
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
  };

  const closeSearchMode = () => {
    setSearchQuery("");
    setIsSearchMode(false);
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

  const handleShareFragment = async (fragment: Fragment) => {
    const result = await shareFragmentWithNotice(fragment);
    if (result === "shared-and-copied") {
      showHomeToast("이미지를 보냈어요. 글은 복사해뒀어요. 입력창에 붙여넣어 주세요.");
    } else if (result === "copied") {
      showHomeToast("\uacf5\uc720 \ub0b4\uc6a9\uc744 \ubcf5\uc0ac\ud588\uc5b4\uc694");
    } else if (result === "failed") {
      showHomeToast("\uacf5\uc720\ud560 \uc218 \uc5c6\uc5c8\uc5b4\uc694");
    }
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

  return (
    <main className="flex min-h-screen w-full justify-center bg-[#f3f0ec]">
      <section className="relative flex min-h-screen w-full max-w-[390px] flex-col bg-[#faf8f4]" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
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
          <section className="flex min-h-screen flex-1 flex-col bg-[#faf8f4] pb-[220px]">
            <header className="border-b border-[#FAF7F2] bg-[#FFFEFB] px-4 py-3">
              <div className="flex h-[42px] items-center gap-2 rounded-[14px] bg-[rgba(120,112,100,0.05)] px-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <span aria-hidden="true" className="text-[15px] text-[rgba(120,112,100,0.5)]">
                  ⌕
                </span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="기억 속에서 찾기..."
                  autoComplete="off"
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-[rgba(50,44,34,0.8)] outline-none placeholder:text-[rgba(120,112,100,0.4)]"
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
                        onClick={() => setSearchQuery(chip)}
                        className="home-select-none select-none h-[29px] rounded-full border border-[rgba(255,255,255,0.55)] px-3.5 py-0 text-[11px] font-medium text-[rgba(50,44,34,0.7)]"
                        style={{
                          backgroundColor: getPokachipColor(chip),
                          boxShadow: "0 1px 4px rgba(200,196,188,0.28), inset 0 1px 1px rgba(255,255,255,0.45)",
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
                    <SearchResultCard key={fragment.id} fragment={fragment} />
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

        {/* 상단 memory section */}
        <section
          className="relative min-h-[272px] overflow-hidden"
          style={{
            background: "radial-gradient(circle at 32% 10%, rgba(224,217,242,0.24), transparent 38%), radial-gradient(circle at 88% 78%, rgba(244,220,194,0.22), transparent 42%), #FFFEFB",
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-14 z-0 h-[178px] w-[330px] opacity-[0.32] blur-[3px]"
            style={{
              background: "linear-gradient(110deg, rgba(255,254,251,0.06) 0%, rgba(226,216,244,0.72) 46%, rgba(255,253,249,0.16) 100%)",
              clipPath: "polygon(16% 0, 100% 0, 84% 100%, 0 100%)",
              transform: "rotate(-13deg)",
            }}
          />

          <div className="relative z-10">
            <header className="flex items-center justify-between px-4 pt-5 pb-3">
              <h1
                className="text-[18px] font-semibold leading-[1.45] text-[#353a69b2]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                {"\uB0B4 \uAE30\uC5B5"}
              </h1>
              <button
                type="button"
                onClick={openSearchMode}
                className="text-[#78706480]"
                aria-label="조각 찾기"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M12 12L15 15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            {/* 관심사 타일 - 정돈된 3열 x 2행의 기억 조각 */}
            <div className="px-4 pb-2">
              <div className="grid grid-cols-3 gap-2">
                {interests.map((interest) => (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => selectHomeFilter(interest.label)}
                    className="home-select-none select-none flex h-20 items-center justify-center rounded-[20px] px-2"
                    style={{
                      background: interest.gradient,
                      boxShadow: interest.shadow,
                    }}
                  >
                    <span
                      className="text-[13px] font-medium text-[rgba(255,255,255,0.82)]"
                      style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                    >
                      {interest.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 포카칩 영역 - 가로 드래그 가능 */}
            <div className="w-full overflow-hidden pb-2">
              <div className="relative flex w-full min-w-0 items-center gap-2 overflow-hidden py-[3px]">
                <div
                  ref={topPokachipScrollRef}
                  onPointerDown={handleTopPokachipPointerDown}
                  onPointerMove={handleTopPokachipPointerMove}
                  onPointerUp={stopTopPokachipDrag}
                  onPointerCancel={stopTopPokachipDrag}
                  onPointerLeave={stopTopPokachipDrag}
                  className="home-select-none flex w-full min-w-0 snap-x snap-proximity cursor-grab touch-pan-x flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap overscroll-x-contain pr-6 pt-0.5 pb-1.5 select-none active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  style={{
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    WebkitOverflowScrolling: "touch",
                  }}
                >
                  <span aria-hidden="true" className="w-2 shrink-0 snap-start" />
                  {topPokachips.map((chip) => {
                    const backgroundColor = getPokachipColor(chip);
                    return (
                      <motion.button
                        key={chip}
                        onClick={() => selectHomeFilter(chip)}
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        className="home-select-none select-none box-border inline-flex h-[29px] shrink-0 snap-start items-center justify-center gap-2.5 rounded-[999px] border border-[rgba(255,255,255,0.55)] px-3.5 py-[6px] text-[12px] font-medium leading-[17px] text-[rgba(50,44,34,0.7)]"
                        style={{
                          backgroundColor: getColorWithAlpha(backgroundColor, 0.5),
                          boxShadow: "0 2px 4px 0 rgba(180,196,244,0.30), inset 0 1px 0 0 rgba(255,255,255,0.58)",
                          fontFamily: "'Pretendard Variable', sans-serif",
                        }}
                      >
                        {chip}
                      </motion.button>
                    );
                  })}
                  <span aria-hidden="true" className="w-[calc(100%-64px)] shrink-0" />
                </div>
                {/* TODO: MVP 이후 새 기억묶음/포카칩 생성 기능으로 재검토 */}
              </div>
            </div>
          </div>
        </section>
        {/* 수집된 조각 피드 — 선 대신 따뜻한 배경 톤으로 부드럽게 전환 */}
        <section
          className="relative flex-1 border-t border-[#FAF7F2] pt-3"
          style={{
            backgroundColor: "#FAF8F4",
          }}
        >
          {/* 오늘 모은 조각들 헤더 */}
          <div className="px-4 mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <img src="/figmaAssets/glass.svg" alt="" className="h-[14px] w-[10px]" />
              <span
                className="text-sm font-semibold text-[#787064bf]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                {selectedChip ? `${selectedChip} · ${visibleFragments.length}개` : "오늘 모은 조각들"}
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

          {/* 2열 카드 목록 */}
          <div className="px-4 pb-[260px]">
            <div className="flex gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                {leftColumnFragments.map((fragment) => (
                  <FragmentCard
                    key={fragment.id}
                    fragment={fragment}
                    isMenuOpen={openMenuFragmentId === fragment.id}
                    onOpenMenu={() => setOpenMenuFragmentId(fragment.id)}
                    onCloseMenu={() => setOpenMenuFragmentId(null)}
                    onDelete={() => handleDeleteFragment(fragment.id)}
                    onShare={() => handleShareFragment(fragment)}
                  />
                ))}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                {rightColumnFragments.map((fragment) => (
                  <FragmentCard
                    key={fragment.id}
                    fragment={fragment}
                    isMenuOpen={openMenuFragmentId === fragment.id}
                    onOpenMenu={() => setOpenMenuFragmentId(fragment.id)}
                    onCloseMenu={() => setOpenMenuFragmentId(null)}
                    onDelete={() => handleDeleteFragment(fragment.id)}
                    onShare={() => handleShareFragment(fragment)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
          </>
        )}
        <BottomNav activeTab="home" onHomeClick={resetHomeView} />

      </section>
    </main>
  );
};
