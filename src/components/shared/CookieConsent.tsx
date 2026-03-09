import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const COOKIE_KEY = "invalfa_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = (level: "all" | "essential") => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ level, date: new Date().toISOString() }));
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-50"
        >
          <div className="rounded-2xl border border-white/10 bg-[#0d1526]/95 backdrop-blur-xl p-5 shadow-2xl shadow-black/40">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-9 w-9 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                <Cookie className="h-4.5 w-4.5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white mb-1">Cookies & Απόρρητο</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Χρησιμοποιούμε απαραίτητα cookies για τη λειτουργία της εφαρμογής και προαιρετικά analytics cookies για τη βελτίωση της εμπειρίας σας.
                </p>
              </div>
              <button onClick={() => accept("essential")} className="text-slate-500 hover:text-white transition-colors shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => accept("all")}
                size="sm"
                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs h-9"
              >
                Αποδοχή όλων
              </Button>
              <Button
                onClick={() => accept("essential")}
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl border-white/10 text-slate-300 hover:bg-white/5 text-xs h-9"
              >
                Μόνο απαραίτητα
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
