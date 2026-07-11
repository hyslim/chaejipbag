import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useLocation } from "wouter";

type BottomNavProps = {
  activeTab: "home" | "history";
  onHomeClick?: () => void;
};

export const BottomNav = ({ activeTab, onHomeClick }: BottomNavProps) => {
  const [, navigate] = useLocation();
  const isHomeActive = activeTab === "home";
  const isHistoryActive = activeTab === "history";
  const itemBaseClass =
    "relative z-10 flex h-[58px] w-full min-w-0 items-center justify-center rounded-full px-4 whitespace-nowrap";
  const itemStyle = (active: boolean) => ({
    background: active ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.52)",
    boxShadow: active
      ? "inset 0 0 0 1px rgba(120,112,100,0.08), inset 0 1px 0 rgba(255,255,255,0.92), 0 4px 10px rgba(80,70,50,0.09)"
      : "inset 0 0 0 1px rgba(120,112,100,0.07), inset 0 1px 0 rgba(255,255,255,0.82), 0 4px 10px rgba(80,70,50,0.075)",
  });

  return (
    <footer
      className="fixed bottom-0 left-1/2 z-40 w-full -translate-x-1/2 px-4 sm:max-w-[390px] pb-6 pt-5"
      style={{
        background: "transparent",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <nav
        className="relative grid min-h-[72px] grid-cols-2 items-center gap-[58px] overflow-visible rounded-full bg-[rgba(255,255,255,0.20)] px-2.5 py-2.5 backdrop-blur-[20px]"
        style={{
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.54), inset 0 1px 0 rgba(255,255,255,0.64), 0 3px 8px rgba(180,196,244,0.50)",
          backdropFilter: "blur(20px) saturate(116%)",
          WebkitBackdropFilter: "blur(20px) saturate(116%)",
        }}
      >
        <button
          type="button"
          onClick={() => {
            onHomeClick?.();
            navigate("/");
          }}
          className={`${itemBaseClass} gap-2.5`}
          style={itemStyle(isHomeActive)}
        >
          <img src="/figmaAssets/chart-pie-portfolio-no-coral.svg" alt="가방" className="h-5 w-5" />
          <span
            className={`text-[14px] font-medium leading-5 ${isHomeActive ? "text-[#353a69d9]" : "text-[#787064b5]"}`}
            style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
          >
            가방
          </span>
        </button>

        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex h-[46px] w-[46px] -translate-x-1/2 -translate-y-1/2 items-center justify-center">
          <motion.button
            type="button"
            onClick={() => navigate("/fragment/new")}
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.03 }}
            transition={{ type: "spring", stiffness: 500, damping: 18, mass: 0.6 }}
            className="pointer-events-auto flex h-full w-full origin-center items-center justify-center rounded-full"
            style={{
              background: "linear-gradient(133deg, rgba(130,207,255,0.70) 25.42%, rgba(90,144,255,0.70) 52.42%, rgba(139,112,255,0.70) 82.29%)",
              boxShadow:
                "inset 0 0 0 1.5px rgba(255,255,255,0.60), inset 0 1px 0 rgba(255,255,255,0.42), 0 4px 10px rgba(180,196,244,0.38)",
            }}
            aria-label="새 조각 담기"
          >
            <Plus size={20} strokeWidth={2.5} color="rgba(255,255,255,0.92)" className="block" aria-hidden="true" />
          </motion.button>
        </div>

        <button
          type="button"
          onClick={() => navigate("/history")}
          className={`${itemBaseClass} gap-1.5`}
          style={itemStyle(isHistoryActive)}
        >
          <img src="/figmaAssets/heart.png" alt="기록" className="h-[30px] w-[30px]" />
          <span
            className={`text-[14px] font-medium leading-5 ${isHistoryActive ? "text-[#353a69d9]" : "text-[#787064b5]"}`}
            style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
          >
            기록
          </span>
        </button>
      </nav>
    </footer>
  );
};
