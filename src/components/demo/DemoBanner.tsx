import { useState } from "react";
import { X, ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/contexts/DemoContext";

export function DemoBanner() {
  const { isDemo } = useDemo();
  const [dismissed, setDismissed] = useState(false);

  if (!isDemo || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium truncate">
            <span className="hidden sm:inline">You're viewing a live demo of </span>
            <span className="font-bold">TravelDocs Pro</span>
            <span className="hidden md:inline"> — the complete travel agency invoice management template</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="#pricing"
            onClick={(e) => {
              e.preventDefault();
              window.open("/landing#pricing", "_blank");
            }}
          >
            <Button size="sm" variant="secondary" className="h-7 text-xs font-semibold gap-1.5 rounded-lg bg-white text-blue-700 hover:bg-blue-50">
              <ShoppingCart className="h-3 w-3" />
              Purchase Template
            </Button>
          </a>
          <button onClick={() => setDismissed(true)} className="text-white/70 hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
