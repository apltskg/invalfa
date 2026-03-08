import { ReactNode } from "react";
import { LucideIcon, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { DatePickerInput } from "@/components/ui/DatePickerInput";

// ── Shared Dialog Shell ──────────────────────────────────────────────
interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon?: LucideIcon;
  iconClassName?: string;
  children: ReactNode;
  onSubmit: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  maxWidth?: string;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  icon: Icon,
  iconClassName,
  children,
  onSubmit,
  submitLabel = "Αποθήκευση",
  cancelLabel = "Ακύρωση",
  loading = false,
  disabled = false,
  destructive = false,
  maxWidth = "sm:max-w-[440px]",
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("rounded-3xl p-0 overflow-hidden", maxWidth)}>
        {/* Header with icon */}
        <div className="px-6 pt-6 pb-2">
          {Icon && (
            <div className={cn(
              "mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-4",
              iconClassName || "bg-primary/10"
            )}>
              <Icon className={cn("h-6 w-6", iconClassName ? "" : "text-primary")} />
            </div>
          )}
          <DialogTitle className={cn("text-lg font-semibold", Icon ? "text-center" : "")}>
            {title}
          </DialogTitle>
        </div>

        {/* Form body */}
        <div className="px-6 pb-2 space-y-4">
          {children}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-xl h-10 text-sm border-border"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={disabled || loading}
            className={cn(
              "flex-1 rounded-xl h-10 text-sm",
              destructive && "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            )}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Shared Form Field Components ─────────────────────────────────────

interface FormFieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}

export function FormField({ label, children, hint, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
        {label}
      </Label>
      {children}
      {hint && (
        <p className="text-[11px] text-muted-foreground/70 leading-tight">{hint}</p>
      )}
    </div>
  );
}

interface FormInputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
}

export function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
  icon: Icon,
  className,
}: FormInputProps) {
  // Use custom DatePickerInput for date fields
  if (type === "date") {
    return (
      <FormField label={label} hint={hint} className={className}>
        <DatePickerInput
          value={String(value)}
          onChange={onChange}
          placeholder={placeholder || "Επιλέξτε ημερομηνία"}
        />
      </FormField>
    );
  }

  return (
    <FormField label={label} hint={hint} className={className}>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        )}
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "rounded-xl h-10 text-sm bg-muted/30 border-border/50 focus:bg-background transition-colors",
            Icon && "pl-10"
          )}
        />
      </div>
    </FormField>
  );
}

interface FormTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
}

export function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 3,
}: FormTextareaProps) {
  return (
    <FormField label={label} hint={hint}>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="rounded-xl text-sm bg-muted/30 border-border/50 focus:bg-background transition-colors resize-none"
      />
    </FormField>
  );
}

interface FormRowProps {
  children: ReactNode;
  cols?: 2 | 3;
}

export function FormRow({ children, cols = 2 }: FormRowProps) {
  return (
    <div className={cn(
      "grid gap-3",
      cols === 2 ? "grid-cols-2" : "grid-cols-3"
    )}>
      {children}
    </div>
  );
}

export function FormDivider() {
  return <div className="border-t border-border/50" />;
}

// ── Confirm / Delete Dialog ──────────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  iconClassName,
  onConfirm,
  confirmLabel = "Διαγραφή",
  cancelLabel = "Ακύρωση",
  loading = false,
  destructive = true,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("rounded-3xl p-0 overflow-hidden sm:max-w-[400px]")}>
        <div className="px-6 pt-6 pb-2">
          {Icon && (
            <div className={cn(
              "mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-4",
              iconClassName || "bg-destructive/10"
            )}>
              <Icon className={cn("h-6 w-6", iconClassName ? "" : "text-destructive")} />
            </div>
          )}
          <DialogTitle className={cn("text-lg font-semibold", Icon ? "text-center" : "")}>
            {title}
          </DialogTitle>
        </div>
        <div className="px-6 pb-2 text-sm text-muted-foreground text-center">
          {description}
        </div>
        <div className="px-6 pb-6 pt-2 flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-xl h-10 text-sm border-border"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "flex-1 rounded-xl h-10 text-sm",
              destructive && "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            )}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
