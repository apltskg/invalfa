import { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText, CreditCard, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, ChevronRight,
  LayoutDashboard, Package, CheckCircle2
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { demoStats, demoTrendData, demoCategoryData, demoPackages, demoInvoices } from "@/data/demo-data";
import { cn } from "@/lib/utils";

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

export default function DemoDashboard() {
  const navigate = useNavigate();
  const s = demoStats;

  const statCards = [
    { label: "Έσοδα", value: `€${s.totalIncome.toLocaleString()}`, icon: TrendingUp, change: "+18%", positive: true, color: "text-emerald-600" },
    { label: "Έξοδα", value: `€${s.totalExpenses.toLocaleString()}`, icon: TrendingDown, change: "+12%", positive: false, color: "text-red-500" },
    { label: "Αντιστοιχίσεις", value: `${s.matchedPercent}%`, icon: CheckCircle2, change: `${s.unmatchedTransactions} εκκρεμούν`, positive: true, color: "text-blue-600" },
    { label: "Παραστατικά", value: s.totalInvoices.toString(), icon: FileText, change: `${s.activePackages} φάκελοι`, positive: true, color: "text-violet-600" },
  ];

  return (
    <div className="space-y-6 pt-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            Αρχική
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Μάιος 2025 — Επισκόπηση</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div key={card.label} {...fadeIn} transition={{ delay: i * 0.05 }}>
            <Card className="border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <card.icon className={cn("h-5 w-5", card.color)} />
                  <span className={cn("text-xs font-medium", card.positive ? "text-emerald-600" : "text-red-500")}>
                    {card.change}
                  </span>
                </div>
                <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Τάση Εσόδων / Εξόδων</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={demoTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `€${v.toLocaleString()}`} />
                <Area type="monotone" dataKey="income" stroke="#10B981" fill="#10B98120" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" stroke="#EF4444" fill="#EF444420" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Κατηγορίες Εξόδων</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <PieChart width={200} height={200}>
              <Pie data={demoCategoryData} cx={100} cy={100} innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                {demoCategoryData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => `€${v.toLocaleString()}`} />
            </PieChart>
          </CardContent>
          <div className="px-4 pb-4 space-y-1">
            {demoCategoryData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-medium">€{d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent packages */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" /> Πρόσφατοι Φάκελοι
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {demoPackages.slice(0, 4).map(pkg => (
              <div key={pkg.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{pkg.client_name}</p>
                    <p className="text-xs text-muted-foreground">{pkg.start_date} → {pkg.end_date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={pkg.status === "completed" ? "secondary" : "default"} className="text-xs">
                    {pkg.status === "completed" ? "Ολοκληρωμένο" : "Ενεργό"}
                  </Badge>
                  <div className="text-right">
                    <p className="text-sm font-semibold">€{pkg.totalAmount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{pkg.invoiceCount} παραστατικά</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
