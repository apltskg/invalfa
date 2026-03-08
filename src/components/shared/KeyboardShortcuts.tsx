import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const shortcuts: Record<string, string> = {
  d: "/dashboard",
  p: "/packages",
  b: "/bank-sync",
  e: "/general-expenses",
  i: "/general-income",
  x: "/export-hub",
  s: "/settings",
};

export function KeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // g + key navigation (vim-style)
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        // Could show help modal in future
        return;
      }

      // Direct shortcuts with 'g' prefix handled via sequence
      // For now, simple Alt+key shortcuts
      if (e.altKey && !e.metaKey && !e.ctrlKey) {
        const route = shortcuts[e.key.toLowerCase()];
        if (route) {
          e.preventDefault();
          navigate(route);
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [navigate]);

  return null;
}
