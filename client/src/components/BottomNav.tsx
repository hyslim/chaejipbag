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
    "flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-full px-4 whitespace-nowrap";
  const itemStyle = (active: boolean) => ({
    background: active ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.88)",
    boxShadow: active
      ? "inset 0 1px 0 rgba(255,255,255,0.92), 0 5px 14px rgba(62,55,44,0.08)"
      : "inset 0 1px 0 rgba(255,255,255,0.82), 0 3px 10px rgba(62,55,44,0.045)",
  });

  return (
    <footer
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[390px] -translate-x-1/2 px-4 pb-6 pt-5"
      style={{
        background: "linear-gradient(to top, #faf8f4 68%, rgba(250,248,244,0.78) 84%, transparent)",
      }}
    >
      <nav
        className="grid min-h-[72px] grid-cols-[1fr_auto_1fr] items-center gap-3 overflow-visible rounded-full bg-[rgba(255,255,255,0.78)] px-2.5 py-2.5 backdrop-blur-[20px]"
        style={{
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.54), inset 0 1px 0 rgba(255,255,255,0.64), 0 12px 26px rgba(80,70,50,0.085), 0 3px 9px rgba(80,70,50,0.035)",
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
          className={itemBaseClass}
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

        <motion.button
          type="button"
          onClick={() => navigate("/fragment/new")}
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.03 }}
          transition={{ type: "spring", stiffness: 500, damping: 18, mass: 0.6 }}
          className="flex h-[46px] w-[46px] items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(133deg, rgba(130,207,255,0.70) 25.42%, rgba(90,144,255,0.70) 52.42%, rgba(139,112,255,0.70) 82.29%)",
            boxShadow:
              "inset 0 0 0 1.5px rgba(255,255,255,0.60), inset 0 1px 0 rgba(255,255,255,0.42), 0 4px 10px rgba(180,196,244,0.38)",
          }}
          aria-label="새 조각 담기"
        >
          <Plus size={20} strokeWidth={2.5} color="rgba(255,255,255,0.92)" className="block" aria-hidden="true" />
        </motion.button>

        <button
          type="button"
          onClick={() => navigate("/history")}
          className={itemBaseClass}
          style={itemStyle(isHistoryActive)}
        >
          <img src="/figmaAssets/heart.png" alt="기록" className="h-[26px] w-[26px]" />
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
