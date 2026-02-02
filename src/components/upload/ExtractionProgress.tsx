import { motion } from "framer-motion";
import { Upload, Cpu, CheckCircle2, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type ExtractionStage = "idle" | "uploading" | "extracting" | "complete";

interface ExtractionProgressProps {
  stage: ExtractionStage;
  fileName?: string;
}

const stages = [
  { key: "uploading", label: "Μεταφόρτωση", icon: Upload },
  { key: "extracting", label: "Ανάγνωση AI", icon: Cpu },
  { key: "complete", label: "Ολοκλήρωση", icon: CheckCircle2 },
];

export function ExtractionProgress({ stage, fileName }: ExtractionProgressProps) {
  const currentIndex = stages.findIndex((s) => s.key === stage);
  const progress = stage === "idle" ? 0 : stage === "complete" ? 100 : ((currentIndex + 0.5) / stages.length) * 100;

  return (
    <div className="space-y-6 py-8">
      {/* File name */}
      {fileName && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-muted-foreground truncate px-4"
        >
          {fileName}
        </motion.p>
      )}

      {/* Progress bar */}
      <div className="px-4">
        <Progress value={progress} className="h-2" />
      </div>

      {/* Stage indicators */}
      <div className="flex justify-between px-2">
        {stages.map((s, index) => {
          const Icon = s.icon;
          const isActive = s.key === stage;
          const isComplete = currentIndex > index || stage === "complete";

          return (
            <motion.div
              key={s.key}
              className="flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div
                className={`
                  relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300
                  ${isComplete ? "border-primary bg-primary text-primary-foreground" : ""}
                  ${isActive ? "border-primary bg-primary/10 text-primary" : ""}
                  ${!isActive && !isComplete ? "border-muted bg-muted/50 text-muted-foreground" : ""}
                `}
              >
                {isActive ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={`text-xs font-medium transition-colors ${
                  isActive || isComplete ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Status message */}
      <motion.div
        key={stage}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-sm font-medium">
          {stage === "uploading" && "Μεταφόρτωση αρχείου στον server..."}
          {stage === "extracting" && "Το AI διαβάζει το έγγραφο..."}
          {stage === "complete" && "Η εξαγωγή ολοκληρώθηκε!"}
        </p>
        {stage === "extracting" && (
          <p className="text-xs text-muted-foreground mt-1">
            Αυτό μπορεί να διαρκέσει μερικά δευτερόλεπτα
          </p>
        )}
      </motion.div>
    </div>
  );
}
