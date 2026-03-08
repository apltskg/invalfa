import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Optional hint steps shown below description */
  hints?: string[];
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  hints,
}: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center rounded-3xl border-dashed border-2 border-border/60 p-10 sm:p-16 bg-gradient-to-b from-card to-muted/20">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <p className="mb-2 text-lg font-semibold text-foreground">{title}</p>
        <p className="mb-4 max-w-md text-center text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>

        {hints && hints.length > 0 && (
          <div className="mb-6 space-y-2 w-full max-w-sm">
            {hints.map((hint, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.1 }}
                className="flex items-start gap-2.5 rounded-xl bg-muted/60 px-4 py-2.5"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                  {i + 1}
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed">{hint}</span>
              </motion.div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          {actionLabel && onAction && (
            <Button onClick={onAction} className="rounded-xl gap-1.5">
              {actionLabel}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
          {secondaryLabel && onSecondary && (
            <Button variant="outline" onClick={onSecondary} className="rounded-xl">
              {secondaryLabel}
            </Button>
          )}
        </div>
      </motion.div>
    </Card>
  );
}
