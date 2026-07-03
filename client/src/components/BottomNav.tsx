import { motion } from "framer-motion";
import { useLocation } from "wouter";

type BottomNavProps = {
  activeTab: "home" | "history";
};

export const BottomNav = ({ activeTab }: BottomNavProps) => {
  const [, navigate] = useLocation();
  const isHomeActive = activeTab === "home";
  const isHistoryActive = activeTab === "history";

  return (
    <footer
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[390px] -translate-x-1/2 px-5 pb-6 pt-4"
      style={{
        background: "linear-gradient(to top, #faf8f4 65%, transparent)",
      }}
    >
      <nav
        className="flex items-center justify-between rounded-full border border-white/75 bg-[rgba(255,255,255,0.62)] px-3 py-2 backdrop-blur-[18px]"
        style={{
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.86), 0 8px 24px rgba(80,65,45,0.10)",
          backdropFilter: "blur(18px) saturate(125%)",
          WebkitBackdropFilter: "blur(18px) saturate(125%)",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/")}
          className={`flex items-center gap-2 rounded-full px-3 py-2 ${
            isHomeActive ? "bg-white/70 shadow-[0px_1px_4px_rgba(0,0,0,0.06)]" : ""
          }`}
        >
          <img src="/figmaAssets/chart-pie-portfolio-no-coral.svg" alt="탐색" className="h-5 w-5" />
          <span
            className={`text-[12px] font-medium ${isHomeActive ? "text-[#353a69cc]" : "text-[#a0988c90]"}`}
            style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
          >
            탐색
          </span>
        </button>

        <motion.button
          type="button"
          onClick={() => navigate("/fragment/new")}
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.06 }}
          transition={{ type: "spring", stiffness: 500, damping: 18, mass: 0.6 }}
          className="flex h-12 w-12 items-center justify-center rounded-full ring-1 ring-white/70"
          style={{
            background: "linear-gradient(135deg, #8fe8ff 0%, #6f96ff 48%, #a277ff 100%)",
            boxShadow: "0 0 0 6px rgba(130,158,255,0.10), 0 7px 24px rgba(105,125,255,0.55)",
          }}
          aria-label="새 조각 담기"
        >
          <span className="text-xl font-light leading-none text-white">+</span>
        </motion.button>

        <button
          type="button"
          onClick={() => navigate("/history")}
          className={`flex items-center gap-2 rounded-full px-3 py-2 ${
            isHistoryActive ? "bg-white/70 shadow-[0px_1px_4px_rgba(0,0,0,0.06)]" : ""
          }`}
        >
          <img src="/figmaAssets/heart.png" alt="기록" className="h-5 w-5" />
          <span
            className={`text-[12px] font-medium ${isHistoryActive ? "text-[#353a69cc]" : "text-[#a0988c90]"}`}
            style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
          >
            기록
          </span>
        </button>
      </nav>
    </footer>
  );
};
