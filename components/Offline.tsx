"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

/** A quiet note when the phone loses signal, so empty results make sense. */
export function Offline() {
  const [off, setOff] = useState(false);
  useEffect(() => {
    const sync = () => setOff(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  return (
    <AnimatePresence>
      {off && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          role="status"
          className="fixed inset-x-0 top-[env(safe-area-inset-top)] z-50 mx-auto mt-2 w-fit rounded-full bg-ink px-4 py-2 text-[13px] text-bg shadow-lg"
        >
          no signal, the shops can&rsquo;t hear us right now
        </motion.div>
      )}
    </AnimatePresence>
  );
}
