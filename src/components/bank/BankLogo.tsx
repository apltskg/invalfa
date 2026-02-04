import { cn } from "@/lib/utils";
import { Landmark, Wallet, Building2 } from "lucide-react";

interface BankLogoProps {
  bankName: string | null;
  size?: "sm" | "md" | "lg";
  showBorder?: boolean;
  className?: string;
}

// Bank brand colors
const bankConfig: Record<string, { color: string; bgColor: string; icon: React.ElementType; label: string }> = {
  eurobank: { color: "#8B1538", bgColor: "bg-[#8B1538]", icon: Landmark, label: "Eurobank" },
  alpha: { color: "#00529B", bgColor: "bg-[#00529B]", icon: Building2, label: "Alpha Bank" },
  viva: { color: "#00A650", bgColor: "bg-[#00A650]", icon: Wallet, label: "Viva Wallet" },
  wise: { color: "#37517E", bgColor: "bg-[#37517E]", icon: Landmark, label: "Wise" },
};

const sizeClasses = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

const iconSizes = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};

export function BankLogo({ bankName, size = "md", showBorder = false, className }: BankLogoProps) {
  const normalizedName = bankName?.toLowerCase() || "";
  const config = bankConfig[normalizedName];

  if (!config) {
    return (
      <div
        className={cn(
          "rounded-full bg-muted flex items-center justify-center",
          sizeClasses[size],
          showBorder && "ring-2 ring-border",
          className
        )}
      >
        <Landmark className={cn("text-muted-foreground", iconSizes[size])} />
      </div>
    );
  }

  const IconComponent = config.icon;

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white",
        config.bgColor,
        sizeClasses[size],
        showBorder && "ring-2 ring-background shadow-sm",
        className
      )}
      title={config.label}
    >
      <IconComponent className={iconSizes[size]} />
    </div>
  );
}

export function getBankBorderColor(bankName: string | null): string {
  const normalizedName = bankName?.toLowerCase() || "";
  const config = bankConfig[normalizedName];
  return config?.color || "#e5e7eb";
}

export function getBankLabel(bankName: string | null): string {
  const normalizedName = bankName?.toLowerCase() || "";
  return bankConfig[normalizedName]?.label || "Άγνωστη";
}

export const SUPPORTED_BANKS = [
  { value: "eurobank", label: "Eurobank", color: "#8B1538" },
  { value: "alpha", label: "Alpha Bank", color: "#00529B" },
  { value: "viva", label: "Viva Wallet", color: "#00A650" },
  { value: "wise", label: "Wise", color: "#37517E" },
];
