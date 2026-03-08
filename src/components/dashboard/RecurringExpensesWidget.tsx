import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, RefreshCw, Loader2, ChevronRight } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { el } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface RecurringExpense {
  supplier_id: string;
  supplier_name: string;
  category_name: string;
  avg_amount: number;
  months_found: number;
  found_this_month: boolean;
}

interface RecurringExpensesWidgetProps {
  startDate: string;
  endDate: string;
}

export function RecurringExpensesWidget({ startDate, endDate }: RecurringExpensesWidgetProps) {
  const navigate = useNavigate();
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectRecurring();
  }, [startDate, endDate]);

  async function detectRecurring() {
    setLoading(true);
    try {
      // Look back 4 months to find recurring patterns
      const now = new Date(endDate);
      const lookbackMonths = 4;
      const monthRanges: { start: string; end: string }[] = [];

      for (let i = 1; i <= lookbackMonths; i++) {
        const target = subMonths(now, i);
        monthRanges.push({
          start: format(startOfMonth(target), "yyyy-MM-dd"),
          end: format(endOfMonth(target), "yyyy-MM-dd"),
        });
      }

      // Fetch all expenses with suppliers from past months
      const { data: pastExpenses } = await supabase
        .from("invoices")
        .select("supplier_id, merchant, amount, invoice_date, expense_category_id")
        .eq("type", "expense")
        .not("supplier_id", "is", null)
        .gte("invoice_date", monthRanges[monthRanges.length - 1].start)
        .lte("invoice_date", monthRanges[0].end);

      if (!pastExpenses || pastExpenses.length === 0) {
        setRecurring([]);
        setLoading(false);
        return;
      }

      // Group by supplier, count unique months
      const supplierMonths: Record<string, {
        months: Set<string>;
        amounts: number[];
        merchant: string;
        catId: string | null;
      }> = {};

      for (const exp of pastExpenses) {
        const sid = (exp as any).supplier_id;
        if (!sid) continue;
        const monthKey = (exp.invoice_date || "").substring(0, 7); // yyyy-MM
        if (!supplierMonths[sid]) {
          supplierMonths[sid] = {
            months: new Set(),
            amounts: [],
            merchant: exp.merchant || "Άγνωστος",
            catId: (exp as any).expense_category_id || null,
          };
        }
        supplierMonths[sid].months.add(monthKey);
        supplierMonths[sid].amounts.push(exp.amount || 0);
      }

      // A supplier is "recurring" if found in >= 3 of last 4 months
      const recurringSuppliers = Object.entries(supplierMonths)
        .filter(([_, v]) => v.months.size >= 3)
        .map(([sid, v]) => ({ sid, ...v }));

      if (recurringSuppliers.length === 0) {
        setRecurring([]);
        setLoading(false);
        return;
      }

      // Check which of these exist in current month
      const { data: currentExpenses } = await supabase
        .from("invoices")
        .select("supplier_id")
        .eq("type", "expense")
        .not("supplier_id", "is", null)
        .gte("invoice_date", startDate)
        .lte("invoice_date", endDate);

      const currentSupplierIds = new Set(
        (currentExpenses || []).map((e: any) => e.supplier_id)
      );

      // Fetch category names
      const { data: cats } = await supabase
        .from("expense_categories")
        .select("id, name_el");
      const catMap = new Map((cats || []).map(c => [c.id, c.name_el]));

      const results: RecurringExpense[] = recurringSuppliers.map(s => ({
        supplier_id: s.sid,
        supplier_name: s.merchant,
        category_name: s.catId ? (catMap.get(s.catId) || "Άλλο") : "Άλλο",
        avg_amount: s.amounts.reduce((a, b) => a + b, 0) / s.amounts.length,
        months_found: s.months.size,
        found_this_month: currentSupplierIds.has(s.sid),
      }));

      // Sort: missing first, then by avg_amount desc
      results.sort((a, b) => {
        if (a.found_this_month !== b.found_this_month) return a.found_this_month ? 1 : -1;
        return b.avg_amount - a.avg_amount;
      });

      setRecurring(results);
    } catch (e) {
      console.error("Recurring detection error:", e);
    } finally {
      setLoading(false);
    }
  }

  const missing = recurring.filter(r => !r.found_this_month);
  const found = recurring.filter(r => r.found_this_month);

  if (loading) {
    return (
      <Card className="rounded-2xl border-slate-200">
        <CardContent className="p-5 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </CardContent>
      </Card>
    );
  }

  if (recurring.length === 0) return null;

  return (
    <Card className={cn(
      "rounded-2xl border overflow-hidden",
      missing.length > 0 ? "border-amber-200 bg-amber-50/30" : "border-emerald-200 bg-emerald-50/30"
    )}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">Πάγια Έξοδα</h3>
          </div>
          {missing.length > 0 ? (
            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-xs">
              {missing.length} λείπουν
            </Badge>
          ) : (
            <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 text-xs">
              Πλήρη ✓
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          {missing.map(r => (
            <div
              key={r.supplier_id}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-amber-200 cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => navigate("/general-expenses")}
            >
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{r.supplier_name}</p>
                <p className="text-xs text-slate-400">{r.category_name} · ~€{r.avg_amount.toFixed(0)}/μήνα</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            </div>
          ))}

          {found.slice(0, 3).map(r => (
            <div
              key={r.supplier_id}
              className="flex items-center gap-3 p-2 rounded-lg"
            >
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-600 truncate">{r.supplier_name}</p>
              </div>
              <span className="text-xs text-slate-400 tabular-nums">€{r.avg_amount.toFixed(0)}</span>
            </div>
          ))}

          {found.length > 3 && (
            <p className="text-xs text-slate-400 text-center">+{found.length - 3} ακόμα πάγια ΟΚ</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
