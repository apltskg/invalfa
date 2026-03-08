import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { el } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2, Circle, ChevronRight, FileSpreadsheet, Receipt,
    Building2, ArrowLeftRight, Send, AlertTriangle, Calendar,
    Loader2, ChevronDown, ChevronUp, Clock, Sparkles, Lock,
    FileText, CreditCard, Users, Truck, Fuel, Car, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ── Types ──
interface QuickLink {
    label: string;
    url: string;
    color?: string;
}

interface ClosingStep {
    id: string;
    title: string;
    description: string;
    icon: any;
    color: string;
    bgColor: string;
    route?: string;
    links?: QuickLink[];
    checkFn: () => Promise<StepStatus>;
}

interface StepStatus {
    done: boolean;
    count?: number;
    total?: number;
    detail?: string;
    warning?: string;
}

// ── Determine target period (previous month) ──
function getTargetPeriod() {
    const now = new Date();
    // If we're in first 15 days, show previous month; otherwise show current month
    const target = now.getDate() <= 15 ? subMonths(now, 1) : now;
    return {
        start: format(startOfMonth(target), "yyyy-MM-dd"),
        end: format(endOfMonth(target), "yyyy-MM-dd"),
        label: format(target, "MMMM yyyy", { locale: el }),
        monthKey: format(target, "yyyy-MM"),
        isPrevMonth: now.getDate() <= 15,
    };
}

export default function MonthlyClosing() {
    const navigate = useNavigate();
    const [period] = useState(getTargetPeriod);
    // Persistence: load cached statuses from localStorage
    const cacheKey = `monthly-closing-${period.monthKey}`;
    const [statuses, setStatuses] = useState<Record<string, StepStatus>>(() => {
        try {
            const cached = localStorage.getItem(cacheKey);
            return cached ? JSON.parse(cached) : {};
        } catch { return {}; }
    });
    const [loading, setLoading] = useState(() => {
        try {
            return !localStorage.getItem(cacheKey);
        } catch { return true; }
    });
    const [refreshing, setRefreshing] = useState(false);
    const [expandedStep, setExpandedStep] = useState<string | null>(null);

    // ── Step definitions ──
    const steps: ClosingStep[] = [
        {
            id: "invoice_list",
            title: "Ανέβασμα Τιμολογιέρας",
            description: "Ανεβάστε τη λίστα παραστατικών (Excel) από το τιμολογιακό πρόγραμμα",
            icon: FileSpreadsheet,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            route: "/invoice-list",
            links: [
                { label: "Impact eInvoice", url: "https://einvoice.impact.gr/", color: "text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100" },
            ],
            checkFn: async () => {
                const { count } = await supabase
                    .from("invoice_list_imports")
                    .select("*", { count: "exact", head: true })
                    .gte("upload_date", period.start)
                    .lte("upload_date", period.end + "T23:59:59");
                return {
                    done: (count || 0) > 0,
                    count: count || 0,
                    detail: count ? `${count} εισαγωγή(ές) ανέβηκαν` : "Δεν έχει ανέβει τιμολογιέρα",
                };
            },
        },
        {
            id: "expenses",
            title: "Γενικά Έξοδα & Παραστατικά",
            description: "Ανεβάστε τα τιμολόγια εξόδων (διόδια, καύσιμα, ΔΕΗ, ενοίκιο κλπ)",
            icon: Receipt,
            color: "text-rose-600",
            bgColor: "bg-rose-50",
            route: "/general-expenses",
            checkFn: async () => {
                const { count } = await supabase
                    .from("invoices")
                    .select("*", { count: "exact", head: true })
                    .is("package_id", null)
                    .eq("type", "expense")
                    .gte("invoice_date", period.start)
                    .lte("invoice_date", period.end);

                // Check for category coverage
                const { data: cats } = await supabase
                    .from("invoices")
                    .select("category")
                    .is("package_id", null)
                    .eq("type", "expense")
                    .gte("invoice_date", period.start)
                    .lte("invoice_date", period.end);

                const uniqueCats = new Set((cats || []).map(c => c.category).filter(Boolean));
                const importantCats = ["tolls", "fuel", "rent", "utilities", "payroll"];
                const missingCats = importantCats.filter(c => !uniqueCats.has(c as any));

                return {
                    done: (count || 0) >= 3,
                    count: count || 0,
                    detail: `${count || 0} έξοδα καταχωρημένα σε ${uniqueCats.size} κατηγορίες`,
                    warning: missingCats.length > 0
                        ? `Ελέγξτε αν λείπουν: ${missingCats.map(c => {
                            const labels: Record<string, string> = { tolls: "Διόδια", fuel: "Καύσιμα", rent: "Ενοίκιο", utilities: "ΔΕΗ/Λογαριασμοί", payroll: "Μισθοδοσία" };
                            return labels[c] || c;
                        }).join(", ")}`
                        : undefined,
                };
            },
        },
        {
            id: "bank_sync",
            title: "Τραπεζικές Κινήσεις",
            description: "Κατεβάστε τα statements και ανεβάστε τις κινήσεις τράπεζας για τον μήνα",
            icon: Building2,
            color: "text-indigo-600",
            bgColor: "bg-indigo-50",
            route: "/bank-sync",
            links: [
                { label: "Alpha Bank", url: "https://www.alpha.gr/", color: "text-blue-800 bg-blue-50 border-blue-200 hover:bg-blue-100" },
                { label: "Eurobank", url: "https://ebanking.eurobank.gr/#/login", color: "text-red-700 bg-red-50 border-red-200 hover:bg-red-100" },
                { label: "Wise → Statements", url: "https://wise.com/home", color: "text-green-700 bg-green-50 border-green-200 hover:bg-green-100" },
                { label: "Viva → Reports", url: "https://www.viva.com/el-gr", color: "text-orange-700 bg-orange-50 border-orange-200 hover:bg-orange-100" },
            ],
            checkFn: async () => {
                const { count } = await supabase
                    .from("bank_transactions")
                    .select("*", { count: "exact", head: true })
                    .gte("transaction_date", period.start)
                    .lte("transaction_date", period.end);
                return {
                    done: (count || 0) > 0,
                    count: count || 0,
                    detail: count ? `${count} κινήσεις τράπεζας` : "Δεν έχουν ανέβει κινήσεις",
                };
            },
        },
        {
            id: "matching",
            title: "Αντιστοίχιση Συναλλαγών",
            description: "Αντιστοιχίστε τιμολόγια ↔ τραπεζικές κινήσεις ↔ φακέλους",
            icon: ArrowLeftRight,
            color: "text-violet-600",
            bgColor: "bg-violet-50",
            route: "/invoice-list",
            checkFn: async () => {
                const { count: total } = await supabase
                    .from("invoice_list_items")
                    .select("*", { count: "exact", head: true })
                    .in("import_id",
                        (await supabase
                            .from("invoice_list_imports")
                            .select("id")
                            .gte("upload_date", period.start)
                            .lte("upload_date", period.end + "T23:59:59")
                        ).data?.map(i => i.id) || []
                    );

                const { count: matched } = await supabase
                    .from("invoice_list_items")
                    .select("*", { count: "exact", head: true })
                    .eq("match_status", "matched")
                    .in("import_id",
                        (await supabase
                            .from("invoice_list_imports")
                            .select("id")
                            .gte("upload_date", period.start)
                            .lte("upload_date", period.end + "T23:59:59")
                        ).data?.map(i => i.id) || []
                    );

                const pct = total ? Math.round(((matched || 0) / total) * 100) : 0;
                return {
                    done: pct >= 80,
                    count: matched || 0,
                    total: total || 0,
                    detail: total
                        ? `${matched || 0}/${total} αντιστοιχισμένα (${pct}%)`
                        : "Χρειάζεται πρώτα η τιμολογιέρα",
                    warning: total && pct < 80
                        ? `${(total || 0) - (matched || 0)} ανοιχτά τιμολόγια`
                        : undefined,
                };
            },
        },
        {
            id: "payroll",
            title: "Μισθοδοσία",
            description: "Ελέγξτε ότι η μισθοδοσία εμφανίζεται στα έξοδα ή στις κινήσεις τράπεζας",
            icon: Users,
            color: "text-amber-600",
            bgColor: "bg-amber-50",
            route: "/general-expenses",
            checkFn: async () => {
                // Check expenses with payroll category
                const { count: payrollExpenses } = await supabase
                    .from("invoices")
                    .select("*", { count: "exact", head: true })
                    .eq("type", "expense")
                    .eq("category", "payroll")
                    .gte("invoice_date", period.start)
                    .lte("invoice_date", period.end);

                // Also check bank transactions with μισθ/payroll keywords
                const { count: payrollTxns } = await supabase
                    .from("bank_transactions")
                    .select("*", { count: "exact", head: true })
                    .ilike("description", "%μισθ%")
                    .gte("transaction_date", period.start)
                    .lte("transaction_date", period.end);

                const found = (payrollExpenses || 0) + (payrollTxns || 0);
                return {
                    done: found > 0,
                    count: found,
                    detail: found > 0
                        ? `${payrollExpenses || 0} έξοδα + ${payrollTxns || 0} τραπεζικές`
                        : "Δεν βρέθηκε μισθοδοσία — αν δεν πληρώθηκε, αγνοήστε",
                };
            },
        },
        {
            id: "send_accountant",
            title: "Αποστολή στον Λογιστή",
            description: "Δημιουργήστε και στείλτε τον μαγικό σύνδεσμο στον λογιστή σας",
            icon: Send,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
            route: "/settings",
            checkFn: async () => {
                // Check if accountant magic link was generated for this period
                const { count } = await supabase
                    .from("accountant_magic_links")
                    .select("*", { count: "exact", head: true })
                    .eq("month_year", period.monthKey);
                return {
                    done: (count || 0) > 0,
                    count: count || 0,
                    detail: count
                        ? `${count} σύνδεσμος(οι) δημιουργήθηκαν`
                        : "Δεν έχει σταλεί ακόμα",
                };
            },
        },
    ];

    // ── Fetch all statuses ──
    useEffect(() => {
        checkAllSteps();
    }, []);

    async function checkAllSteps() {
        const hasExisting = Object.keys(statuses).length > 0;
        if (!hasExisting) setLoading(true);
        setRefreshing(true);
        const results: Record<string, StepStatus> = {};
        for (const step of steps) {
            try {
                results[step.id] = await step.checkFn();
            } catch (e) {
                console.error(`Step ${step.id} check failed:`, e);
                results[step.id] = { done: false, detail: "Σφάλμα ελέγχου" };
            }
        }
        setStatuses(results);
        try { localStorage.setItem(cacheKey, JSON.stringify(results)); } catch {}
        setLoading(false);
        setRefreshing(false);
    }

    const completedCount = Object.values(statuses).filter(s => s.done).length;
    const totalSteps = steps.length;
    const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
    const allDone = completedCount === totalSteps;

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                <h1 className="text-2xl font-bold text-foreground">Μηνιαίο Κλείσιμο</h1>
                <p className="text-sm text-muted-foreground mt-0.5 capitalize flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Περίοδος: {period.label}
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={checkAllSteps}
                    disabled={refreshing}
                    className="rounded-xl gap-1.5 text-xs"
                >
                    {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {refreshing ? "Ενημέρωση..." : "Ανανέωση"}
                </Button>
            </div>

            {/* Progress Card */}
            <Card className={cn(
                "rounded-2xl border-2 overflow-hidden transition-all",
                allDone ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800" : "border-border bg-card"
            )}>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "h-12 w-12 rounded-2xl flex items-center justify-center",
                                allDone ? "bg-emerald-100" : "bg-blue-50"
                            )}>
                                {allDone
                                    ? <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                    : <Clock className="h-6 w-6 text-blue-600" />
                                }
                            </div>
                            <div>
                                <p className={cn(
                                    "text-lg font-bold",
                                    allDone ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"
                                )}>
                                    {allDone ? "Κλείσιμο Ολοκληρώθηκε! 🎉" : `${completedCount} / ${totalSteps} Βήματα`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {allDone
                                        ? "Όλα τα βήματα ολοκληρώθηκαν — ο λογιστής μπορεί να δουλέψει"
                                        : "Ακολουθήστε τα βήματα παρακάτω για να ολοκληρώσετε"
                                    }
                                </p>
                            </div>
                        </div>
                        <span className={cn(
                            "text-3xl font-black tabular-nums",
                            allDone ? "text-emerald-600" : progressPct >= 50 ? "text-blue-600" : "text-muted-foreground"
                        )}>
                            {progressPct}%
                        </span>
                    </div>
                    <Progress
                        value={progressPct}
                        className={cn("h-2 rounded-full", allDone ? "[&>div]:bg-emerald-500" : "[&>div]:bg-blue-600")}
                    />
                </CardContent>
            </Card>

            {/* Steps */}
            <div className="space-y-3">
                {loading ? (
                     <div className="flex items-center justify-center p-16">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    steps.map((step, idx) => {
                        const status = statuses[step.id] || { done: false };
                        const isExpanded = expandedStep === step.id;
                        const StepIcon = step.icon;
                        const prevDone = idx === 0 || statuses[steps[idx - 1].id]?.done;

                        return (
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.06 }}
                            >
                                <Card className={cn(
                                    "rounded-2xl border transition-all overflow-hidden",
                                    status.done
                                        ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800"
                                        : "border-border bg-card hover:border-border/80"
                                )}>
                                    {/* Main row */}
                                    <button
                                        className="w-full text-left px-5 py-4 flex items-center gap-4"
                                        onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                                    >
                                        {/* Step number & status */}
                                        <div className="relative">
                                            <div className={cn(
                                                "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                                                status.done ? "bg-emerald-100" : step.bgColor
                                            )}>
                                                {status.done
                                                    ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                                    : <StepIcon className={cn("h-5 w-5", step.color)} />
                                                }
                                            </div>
                                            <span className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-card border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                                {idx + 1}
                                            </span>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className={cn(
                                                    "text-sm font-semibold",
                                                    status.done ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"
                                                )}>
                                                    {step.title}
                                                </p>
                                                {status.done && (
                                                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] py-0">
                                                        ✓ Ολοκληρώθηκε
                                                    </Badge>
                                                )}
                                                {status.warning && !status.done && (
                                                    <Badge variant="outline" className="border-amber-300 text-amber-600 text-[10px] py-0 gap-1">
                                                        <AlertTriangle className="h-2.5 w-2.5" />
                                                        Προσοχή
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">{status.detail || step.description}</p>
                                        </div>

                                        {/* Expand arrow */}
                                        {isExpanded
                                            ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                                            : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                        }
                                    </button>

                                    {/* Expanded panel */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-5 pb-4 pt-0 border-t border-border">
                                                    <div className="pt-3 space-y-3">
                                                        <p className="text-sm text-muted-foreground">{step.description}</p>

                                                        {status.warning && (
                                                            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                                                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                                                <p className="text-xs text-amber-700">{status.warning}</p>
                                                            </div>
                                                        )}

                                                        {status.count !== undefined && status.total !== undefined && (
                                                            <div className="space-y-1">
                                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                                    <span>{status.count} / {status.total}</span>
                                                                    <span>{status.total > 0 ? Math.round((status.count / status.total) * 100) : 0}%</span>
                                                                </div>
                                                                <Progress
                                                                    value={status.total > 0 ? (status.count / status.total) * 100 : 0}
                                                                    className="h-1.5"
                                                                />
                                                            </div>
                                                        )}

                                                        {/* External quick-access links */}
                                                        {step.links && step.links.length > 0 && (
                                                            <div>
                                                                <p className="text-xs font-medium text-muted-foreground mb-2">Γρήγορη πρόσβαση:</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {step.links.map((link, li) => (
                                                                        <a
                                                                            key={li}
                                                                            href={link.url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className={cn(
                                                                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                                                                                link.color || "text-muted-foreground bg-muted border-border hover:bg-muted/80"
                                                                            )}
                                                                        >
                                                                            <ExternalLink className="h-3 w-3" />
                                                                            {link.label}
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {step.route && (
                                                            <Button
                                                                onClick={() => navigate(step.route!)}
                                                                size="sm"
                                                                className={cn(
                                                                    "rounded-xl gap-1.5 text-xs",
                                                                    status.done
                                                                        ? "bg-emerald-600 hover:bg-emerald-700"
                                                                        : "bg-blue-600 hover:bg-blue-700"
                                                                )}
                                                            >
                                                                {status.done ? "Προβολή" : "Μετάβαση"}
                                                                <ChevronRight className="h-3 w-3" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Card>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Quick Tips */}
            {!loading && !allDone && (
                <Card className="rounded-2xl border-border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-100 dark:border-blue-900">
                    <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                            <Sparkles className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Συμβουλή</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                    Ακολουθήστε τα βήματα με τη σειρά. Πρώτα ανεβάστε την τιμολογιέρα,
                                    μετά τα έξοδα, μετά τις κινήσεις τράπεζας, κάντε τις αντιστοιχίσεις
                                    και τέλος στείλτε τον σύνδεσμο στον λογιστή.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
