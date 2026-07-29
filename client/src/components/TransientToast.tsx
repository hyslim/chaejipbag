import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

const TRANSIENT_TOAST_DURATION_MS = 1800;

export const useTransientToast = () => {
  const [message, setMessage] = useState("");
  const timerRef = useRef<number | null>(null);

  const showToast = useCallback((nextMessage: string) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    setMessage(nextMessage);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setMessage("");
    }, TRANSIENT_TOAST_DURATION_MS);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
  }, []);

  return { message, showToast };
};

export const TransientToast = ({
  message,
  bottom,
}: {
  message: string;
  bottom: string;
}) => (
  <div
    className="pointer-events-none fixed left-1/2 z-[70] flex w-full -translate-x-1/2 justify-center px-4 sm:max-w-[390px]"
    style={{ bottom }}
  >
    <motion.div
      aria-live="polite"
      aria-atomic="true"
      initial={false}
      animate={message ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="pointer-events-none flex h-9 min-w-0 max-w-full items-center justify-center overflow-hidden whitespace-nowrap rounded-[8px] border border-[rgba(255,255,255,0.78)] bg-[#FFFEFB]/95 px-4 py-2 text-center text-[14px] font-semibold leading-5 text-[rgba(54,58,105,0.72)] shadow-[0_4px_14px_rgba(74,63,48,0.09),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-[12px]"
      style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
    >
      <span className="min-w-0 max-w-full truncate">{message}</span>
    </motion.div>
  </div>
);