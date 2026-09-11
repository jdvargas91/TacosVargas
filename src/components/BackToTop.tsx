import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp } from "lucide-react";

const easeOutQuint = (t: number) => 1 - (1 - t) ** 5;

function scrollToTop(reduce: boolean | null, controller: AbortController) {
  if (reduce) {
    window.scrollTo(0, 0);
    controller.abort();
    return;
  }

  const start = window.scrollY;
  if (start < 2) {
    controller.abort();
    return;
  }

  const duration = Math.min(1400, 480 + start * 0.32);
  const startTime = performance.now();

  const step = (now: number) => {
    if (controller.signal.aborted) return;
    const t = Math.min(1, (now - startTime) / duration);
    window.scrollTo(0, start * (1 - easeOutQuint(t)));
    if (t < 1) requestAnimationFrame(step);
    else controller.abort();
  };

  requestAnimationFrame(step);
}

export function BackToTop() {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > Math.max(420, window.innerHeight * 0.55));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const goTop = () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const stop = () => controller.abort();
    window.addEventListener("wheel", stop, { passive: true, once: true, signal: controller.signal });
    window.addEventListener("touchstart", stop, { passive: true, once: true, signal: controller.signal });
    window.addEventListener("keydown", stop, { once: true, signal: controller.signal });

    scrollToTop(reduce, controller);
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          aria-label="Volver al inicio de la página"
          onClick={goTop}
          initial={reduce ? false : { opacity: 0, y: 16, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.94 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="btn-accent btn-fab fixed z-50"
          style={{
            bottom: "max(1.25rem, env(safe-area-inset-bottom))",
            right: "max(1.25rem, env(safe-area-inset-right))",
          }}
        >
          <ArrowUp size={20} strokeWidth={2.25} aria-hidden />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
