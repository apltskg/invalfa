import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Package, Truck, Users, Receipt, CreditCard,
  Search, ArrowRight, LayoutDashboard, Banknote, FileDown,
  Settings, TrendingDown, TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: "package" | "supplier" | "customer" | "invoice" | "transaction";
  url: string;
  badge?: string;
}

const typeConfig = {
  package: { icon: Package, label: "Φάκελος", color: "text-blue-600 bg-blue-50" },
  supplier: { icon: Truck, label: "Προμηθευτής", color: "text-orange-600 bg-orange-50" },
  customer: { icon: Users, label: "Πελάτης", color: "text-green-600 bg-green-50" },
  invoice: { icon: Receipt, label: "Τιμολόγιο", color: "text-rose-600 bg-rose-50" },
  transaction: { icon: CreditCard, label: "Συναλλαγή", color: "text-indigo-600 bg-indigo-50" },
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Cmd+K listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => search(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    const term = `%${q}%`;
    const all: SearchResult[] = [];

    try {
      // Parallel queries
      const [packages, suppliers, customers, invoices, transactions] = await Promise.all([
        supabase
          .from("packages")
          .select("id, client_name, status, start_date")
          .or(`client_name.ilike.${term}`)
          .limit(5),
        supabase
          .from("suppliers")
          .select("id, name, vat_number, phone")
          .or(`name.ilike.${term},vat_number.ilike.${term}`)
          .limit(5),
        supabase
          .from("customers")
          .select("id, name, vat_number, phone")
          .or(`name.ilike.${term},vat_number.ilike.${term}`)
          .limit(5),
        supabase
          .from("invoices")
          .select("id, merchant, amount, type, file_name, invoice_date")
          .or(`merchant.ilike.${term},file_name.ilike.${term}`)
          .limit(5),
        supabase
          .from("bank_transactions")
          .select("id, description, amount, transaction_date, match_status")
          .or(`description.ilike.${term}`)
          .limit(5),
      ]);

      // Map results
      packages.data?.forEach((p) =>
        all.push({
          id: p.id,
          title: p.client_name,
          subtitle: p.start_date,
          type: "package",
          url: `/packages/${p.id}`,
          badge: p.status,
        })
      );

      suppliers.data?.forEach((s) =>
        all.push({
          id: s.id,
          title: s.name,
          subtitle: s.vat_number || s.phone || undefined,
          type: "supplier",
          url: "/suppliers",
        })
      );

      customers.data?.forEach((c) =>
        all.push({
          id: c.id,
          title: c.name,
          subtitle: c.vat_number || c.phone || undefined,
          type: "customer",
          url: "/customers",
        })
      );

      invoices.data?.forEach((i) =>
        all.push({
          id: i.id,
          title: i.merchant || i.file_name,
          subtitle: i.amount ? `€${Number(i.amount).toFixed(2)}` : undefined,
          type: "invoice",
          url: i.type === "expense" ? "/general-expenses" : "/general-income",
          badge: i.type === "income" ? "Έσοδο" : "Έξοδο",
        })
      );

      transactions.data?.forEach((t) =>
        all.push({
          id: t.id,
          title: t.description,
          subtitle: `€${Number(t.amount).toFixed(2)} · ${t.transaction_date}`,
          type: "transaction",
          url: "/bank-sync",
          badge: t.match_status === "matched" ? "✓" : undefined,
        })
      );
    } catch (e) {
      console.error("Search error:", e);
    }

    setResults(all);
    setLoading(false);
  }, []);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    navigate(result.url);
  };

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-8 px-3 rounded-lg border border-slate-200 bg-white/80 text-xs text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Αναζήτηση...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 font-mono text-[10px] text-slate-400">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Αναζήτηση φακέλων, προμηθευτών, τιμολογίων..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {/* Quick navigation when no query */}
          {query.length < 2 && (
            <CommandGroup heading="Γρήγορη πλοήγηση">
              {[
                { label: "Αρχική", icon: LayoutDashboard, url: "/dashboard", shortcut: "Alt+D" },
                { label: "Φάκελοι", icon: Package, url: "/packages", shortcut: "Alt+P" },
                { label: "Γενικά Έξοδα", icon: TrendingDown, url: "/general-expenses", shortcut: "Alt+E" },
                { label: "Γενικά Έσοδα", icon: TrendingUp, url: "/general-income", shortcut: "Alt+I" },
                { label: "Τράπεζα", icon: Banknote, url: "/bank-sync", shortcut: "Alt+B" },
                { label: "Εξαγωγές", icon: FileDown, url: "/export-hub", shortcut: "Alt+X" },
                { label: "Ρυθμίσεις", icon: Settings, url: "/settings", shortcut: "Alt+S" },
              ].map((item) => (
                <CommandItem
                  key={item.url}
                  value={item.label}
                  onSelect={() => { setOpen(false); navigate(item.url); }}
                  className="flex items-center gap-3 py-2 px-3 cursor-pointer"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{item.label}</span>
                  <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                    {item.shortcut}
                  </kbd>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {query.length >= 2 && !loading && results.length === 0 ? (
            <CommandEmpty>Αναζήτηση...</CommandEmpty>
            <CommandEmpty>Δεν βρέθηκαν αποτελέσματα</CommandEmpty>
          ) : loading ? (
            <CommandEmpty>Αναζήτηση...</CommandEmpty>
          ) : (
            Object.entries(grouped).map(([type, items], idx) => {
              const config = typeConfig[type as keyof typeof typeConfig];
              const Icon = config.icon;
              return (
                <CommandGroup key={type} heading={config.label}>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.title} ${item.subtitle || ""}`}
                      onSelect={() => handleSelect(item)}
                      className="flex items-center gap-3 py-2.5 px-3 cursor-pointer"
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        {item.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                        )}
                      </div>
                      {item.badge && (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {item.badge}
                        </Badge>
                      )}
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
