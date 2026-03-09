import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  FileText, BarChart2, CreditCard, Package, Users, Zap,
  CheckCircle2, ArrowRight, Star, Shield, TrendingUp,
  Building2, Globe, Download, ChevronRight, Menu, X,
  Bot, Receipt, Lock, Code2, Layers, Database,
  Palette, Smartphone, ServerCog, MonitorPlay, Copy,
  Infinity as InfinityIcon, Sparkles, ExternalLink, Github
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Counter ─────────────────────────────────────────────────────── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true;
        const steps = 40;
        const increment = target / steps;
        let current = 0;
        const timer = setInterval(() => {
          current = Math.min(current + increment, target);
          setCount(Math.round(current));
          if (current >= target) clearInterval(timer);
        }, 30);
      }
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ─── Nav ─────────────────────────────────────────────────────────── */
function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { href: "#features", label: "Features" },
    { href: "#stack", label: "Tech Stack" },
    { href: "#demo", label: "Live Demo" },
    { href: "#pricing", label: "Pricing" },
  ];

  return (
    <header className={cn(
      "fixed top-0 w-full z-50 transition-all duration-300",
      scrolled ? "bg-[#050816]/95 backdrop-blur-xl border-b border-white/[0.06]" : "bg-transparent"
    )}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <InfinityIcon className="h-4 w-4 text-white" />
          </div>
          <span className="font-black text-white text-lg tracking-tight">TravelDocs</span>
          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 px-1.5 py-0.5 rounded-md">PRO</span>
        </a>

        <nav className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <a key={l.href} href={l.href}
              className="text-sm text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/demo" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
            <MonitorPlay className="h-3.5 w-3.5" />
            Live Demo
          </Link>
          <a href="#pricing"
            className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-indigo-600/25">
            Purchase Template
          </a>
        </div>

        <button className="md:hidden text-white" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-[#050816]/98 border-t border-white/[0.06] px-6 py-4 space-y-1">
          {links.map(l => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="block text-sm text-slate-300 py-2.5 px-3 rounded-lg hover:bg-white/5">
              {l.label}
            </a>
          ))}
          <div className="pt-3 border-t border-white/[0.06] mt-2 flex flex-col gap-2">
            <Link to="/demo" className="text-sm text-slate-400 text-center py-2">Live Demo</Link>
            <a href="#pricing" className="text-sm font-semibold bg-indigo-600 text-white text-center py-2.5 rounded-xl">
              Purchase
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

/* ─── Section helpers ─────────────────────────────────────────────── */
function Section({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={cn("px-6 py-24", className)}>
      <div className="max-w-6xl mx-auto">{children}</div>
    </section>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 px-3 py-1 rounded-full mb-4">
      {children}
    </span>
  );
}

/* ─── Dashboard Preview ───────────────────────────────────────────── */
function DashboardPreview() {
  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <div className="absolute inset-0 bg-indigo-500/15 blur-[80px] rounded-3xl" />
      <div className="relative bg-[#0a0f1e] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden" style={{ aspectRatio: "16/10" }}>
        <div className="flex items-center gap-1.5 px-4 py-3 bg-[#060b18] border-b border-white/[0.06]">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
          <div className="flex-1 mx-4 bg-white/5 rounded-md px-3 py-1 text-[10px] text-slate-500 font-mono">
            your-agency.com/dashboard
          </div>
        </div>
        <div className="flex h-full">
          <div className="w-14 bg-[#050a17] border-r border-white/[0.04] flex flex-col items-center py-4 gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center mb-2">
              <InfinityIcon className="w-4 h-4 text-white" />
            </div>
            {[BarChart2, Package, FileText, Users, CreditCard, Building2].map((Icon, i) => (
              <div key={i} className={cn("w-8 h-8 rounded-lg flex items-center justify-center", i === 0 ? "bg-indigo-600/20" : "")}>
                <Icon className={cn("w-4 h-4", i === 0 ? "text-indigo-400" : "text-slate-700")} />
              </div>
            ))}
          </div>
          <div className="flex-1 p-4 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <div>
                <div className="h-3 w-28 bg-white/15 rounded-full mb-1" />
                <div className="h-2 w-16 bg-white/[0.06] rounded-full" />
              </div>
              <div className="h-7 w-24 bg-indigo-600/30 border border-indigo-500/20 rounded-lg" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Revenue", val: "€48,250", c: "border-l-indigo-500" },
                { label: "Expenses", val: "€31,400", c: "border-l-emerald-500" },
                { label: "Matched", val: "94%", c: "border-l-violet-500" },
                { label: "Packages", val: "12", c: "border-l-amber-400" },
              ].map((s, i) => (
                <div key={i} className={cn("bg-white/[0.04] rounded-lg p-2 border-l-2", s.c)}>
                  <div className="text-[7px] text-slate-600 mb-0.5">{s.label}</div>
                  <div className="text-[10px] font-bold text-white">{s.val}</div>
                </div>
              ))}
            </div>
            <div className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
              <div className="flex items-end gap-1 h-14">
                {[35, 55, 40, 70, 50, 85, 65, 80, 55, 90, 70, 95].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end">
                    <div className="rounded-t-sm" style={{
                      height: `${h}%`,
                      background: i >= 10 ? "linear-gradient(to top, #6366f1, #818cf8)" : "rgba(99,102,241,0.2)"
                    }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              {["Olympic Air — €890", "Grand Hotel — €2,400", "EuroRent — €320"].map((r, i) => (
                <div key={i} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-2.5 py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center">
                      <FileText className="w-3 h-3 text-slate-500" />
                    </div>
                    <span className="text-[9px] text-slate-400">{r.split(" — ")[0]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-semibold text-white">{r.split(" — ")[1]}</span>
                    <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Matched</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -right-3 top-16 bg-white rounded-2xl shadow-2xl shadow-black/30 px-4 py-3 border border-slate-100 hidden md:block">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-900">Full Source Code</p>
            <p className="text-[9px] text-slate-500">React + TypeScript</p>
          </div>
        </div>
      </div>

      <div className="absolute -left-3 bottom-16 bg-[#0a0f1e] border border-white/10 rounded-2xl shadow-2xl px-4 py-3 hidden md:block">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-white">Supabase Backend</p>
            <p className="text-[9px] text-slate-500">Auth + DB + Storage</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════ */
export default function TemplateLanding() {
  return (
    <div className="bg-[#050816] min-h-screen text-white font-sans" style={{ fontFamily: "'Inter', sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <Nav />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <Section className="pt-36 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-600/8 rounded-full blur-[120px]" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-violet-600/6 rounded-full blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="text-center mb-16 relative">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Production-Ready Code Template
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
            The complete<br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              travel agency
            </span>
            <br />management platform.
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
            A full-stack React + Supabase template for invoice management, bank reconciliation,
            analytics, and client portals — ready to deploy in minutes, not months.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#pricing"
              className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-7 py-3.5 rounded-2xl transition-all shadow-xl shadow-indigo-600/25 text-sm">
              Get Template — from $149
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <Link to="/demo"
              className="flex items-center gap-2 text-slate-400 hover:text-white border border-white/10 hover:border-white/20 px-7 py-3.5 rounded-2xl transition-all text-sm font-medium">
              <MonitorPlay className="h-4 w-4" />
              Try Live Demo
            </Link>
          </div>
        </div>

        <DashboardPreview />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.04] rounded-2xl overflow-hidden mt-20">
          {[
            { n: 30, s: "+", label: "React Components" },
            { n: 20, s: "+", label: "Database Tables" },
            { n: 8, s: "", label: "Edge Functions" },
            { n: 100, s: "%", label: "TypeScript" },
          ].map((s, i) => (
            <div key={i} className="bg-[#050816] px-6 py-8 text-center">
              <p className="text-3xl md:text-4xl font-black text-white mb-1">
                <Counter target={s.n} suffix={s.s} />
              </p>
              <p className="text-sm text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <Section id="features">
        <div className="text-center mb-16">
          <Pill><Zap className="h-3 w-3" /> Features Included</Pill>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Everything you need<br />to ship fast
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Battle-tested modules for travel agency workflows — from AI invoice extraction to accountant portals.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: <Bot className="h-5 w-5" />, color: "from-indigo-500/20 to-indigo-600/5 border-indigo-500/20", iconBg: "bg-indigo-500/15 text-indigo-400", title: "AI Invoice Extraction", desc: "Upload PDF/image → auto-extract date, amount, merchant, VAT via Gemini AI. Zero manual entry.", badge: "AI" },
            { icon: <CreditCard className="h-5 w-5" />, color: "from-violet-500/20 to-violet-600/5 border-violet-500/20", iconBg: "bg-violet-500/15 text-violet-400", title: "Bank Reconciliation", desc: "Import CSV bank statements, auto-match with invoices by amount + date + text similarity." },
            { icon: <Package className="h-5 w-5" />, color: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20", iconBg: "bg-emerald-500/15 text-emerald-400", title: "Travel Packages", desc: "Group invoices and transactions per trip. See P&L per package in real-time." },
            { icon: <Receipt className="h-5 w-5" />, color: "from-amber-500/20 to-amber-600/5 border-amber-500/20", iconBg: "bg-amber-500/15 text-amber-400", title: "Invoice Hub", desc: "Share invoices with clients via secure links. Track views and confirmations.", badge: "Hot" },
            { icon: <BarChart2 className="h-5 w-5" />, color: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/20", iconBg: "bg-cyan-500/15 text-cyan-400", title: "Analytics & Reports", desc: "Monthly P&L, expense breakdowns, trend charts, XLSX exports for accountants." },
            { icon: <Shield className="h-5 w-5" />, color: "from-rose-500/20 to-rose-600/5 border-rose-500/20", iconBg: "bg-rose-500/15 text-rose-400", title: "Accountant Portal", desc: "Magic link access for your accountant. Read-only view, no passwords needed." },
            { icon: <Users className="h-5 w-5" />, color: "from-sky-500/20 to-sky-600/5 border-sky-500/20", iconBg: "bg-sky-500/15 text-sky-400", title: "Contact Management", desc: "Full CRM for customers, suppliers, and travellers with VAT lookup." },
            { icon: <FileText className="h-5 w-5" />, color: "from-teal-500/20 to-teal-600/5 border-teal-500/20", iconBg: "bg-teal-500/15 text-teal-400", title: "Proforma Invoices", desc: "Generate beautiful proforma invoices with PDF export and email delivery." },
            { icon: <Globe className="h-5 w-5" />, color: "from-orange-500/20 to-orange-600/5 border-orange-500/20", iconBg: "bg-orange-500/15 text-orange-400", title: "Multi-language (i18n)", desc: "English + Greek out of the box. Easy to add any language via translation files." },
          ].map((f, i) => (
            <div key={i} className={cn(
              "group relative rounded-2xl border bg-gradient-to-br p-6 hover:scale-[1.02] transition-all duration-300 cursor-default",
              f.color
            )}>
              <div className="flex items-start justify-between mb-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", f.iconBg)}>{f.icon}</div>
                {f.badge && (
                  <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">{f.badge}</span>
                )}
              </div>
              <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── TECH STACK ───────────────────────────────────────────────── */}
      <Section id="stack" className="bg-gradient-to-b from-[#050816] via-[#060c22] to-[#050816]">
        <div className="text-center mb-16">
          <Pill><Code2 className="h-3 w-3" /> Tech Stack</Pill>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Modern stack,<br />zero compromise
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            Built with the tools top teams use. Every component is typed, tested, and production-ready.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Code2 className="h-6 w-6" />, name: "React 18", desc: "with TypeScript", color: "text-sky-400" },
            { icon: <Zap className="h-6 w-6" />, name: "Vite", desc: "Lightning fast HMR", color: "text-violet-400" },
            { icon: <Palette className="h-6 w-6" />, name: "Tailwind CSS", desc: "+ shadcn/ui", color: "text-cyan-400" },
            { icon: <Database className="h-6 w-6" />, name: "Supabase", desc: "Auth + DB + Storage", color: "text-emerald-400" },
            { icon: <Bot className="h-6 w-6" />, name: "Gemini AI", desc: "Invoice extraction", color: "text-indigo-400" },
            { icon: <Layers className="h-6 w-6" />, name: "Framer Motion", desc: "Smooth animations", color: "text-pink-400" },
            { icon: <BarChart2 className="h-6 w-6" />, name: "Recharts", desc: "Data visualization", color: "text-amber-400" },
            { icon: <ServerCog className="h-6 w-6" />, name: "Edge Functions", desc: "Serverless backend", color: "text-orange-400" },
          ].map((t, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.05] transition-colors text-center">
              <div className={cn("mx-auto w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center mb-3", t.color)}>
                {t.icon}
              </div>
              <p className="font-bold text-white text-sm mb-0.5">{t.name}</p>
              <p className="text-xs text-slate-500">{t.desc}</p>
            </div>
          ))}
        </div>

        {/* Code snippet */}
        <div className="mt-12 max-w-2xl mx-auto">
          <div className="bg-[#0a0f1e] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
              <span className="text-[11px] text-slate-500 ml-2 font-mono">app.config.ts</span>
            </div>
            <pre className="p-5 text-[12px] leading-relaxed overflow-x-auto">
              <code className="text-slate-300">
{`export const APP_CONFIG = {
  company: {
    name: `}<span className="text-emerald-400">"Your Travel Agency"</span>{`,
    vatNumber: `}<span className="text-emerald-400">"999999999"</span>{`,
    email: `}<span className="text-emerald-400">"info@youragency.com"</span>{`,
  },
  features: {
    aiExtraction: `}<span className="text-indigo-400">true</span>{`,
    bankSync: `}<span className="text-indigo-400">true</span>{`,
    greekIntegrations: `}<span className="text-amber-400">false</span>{`,
  },
  locale: {
    defaultLanguage: `}<span className="text-emerald-400">"en"</span>{`,
    currency: `}<span className="text-emerald-400">"EUR"</span>{`,
  },
}`}
              </code>
            </pre>
          </div>
          <p className="text-center text-sm text-slate-500 mt-4">
            One config file to customize everything — branding, features, language, currency.
          </p>
        </div>
      </Section>

      {/* ── LIVE DEMO ────────────────────────────────────────────────── */}
      <Section id="demo">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-purple-600/20 border border-indigo-500/20 p-12 md:p-16 text-center">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 border border-indigo-400/20 px-3 py-1.5 rounded-full mb-6">
              <MonitorPlay className="h-3 w-3" />
              Interactive Demo
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
              See it in action
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto mb-8">
              Explore the full dashboard with sample data — packages, invoices, bank transactions, analytics charts, and more. No sign-up required.
            </p>
            <Link to="/demo"
              className="group inline-flex items-center gap-2 bg-white text-indigo-700 font-bold px-8 py-4 rounded-2xl transition-all hover:bg-indigo-50 shadow-xl text-sm">
              Launch Live Demo
              <ExternalLink className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </Section>

      {/* ── WHAT'S INCLUDED ──────────────────────────────────────────── */}
      <Section>
        <div className="text-center mb-16">
          <Pill><Copy className="h-3 w-3" /> What's Included</Pill>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Ship in hours,<br />not months
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {[
            { icon: <Code2 className="h-5 w-5 text-indigo-400" />, title: "Full Source Code", desc: "30+ React components, 20+ pages, 8 Edge Functions — fully typed TypeScript." },
            { icon: <Database className="h-5 w-5 text-emerald-400" />, title: "Database Schema", desc: "Complete Supabase migrations, RLS policies, triggers, and seed data included." },
            { icon: <Palette className="h-5 w-5 text-violet-400" />, title: "Design System", desc: "shadcn/ui + custom components with light/dark mode and semantic tokens." },
            { icon: <Globe className="h-5 w-5 text-amber-400" />, title: "i18n Ready", desc: "English + Greek translations. Add any language with the built-in system." },
            { icon: <Shield className="h-5 w-5 text-rose-400" />, title: "Auth & Roles", desc: "Email auth, admin/staff roles, Row-Level Security on every table." },
            { icon: <FileText className="h-5 w-5 text-cyan-400" />, title: "Documentation", desc: "Setup guide, API docs, deployment guides for Vercel/Netlify/Docker." },
            { icon: <Smartphone className="h-5 w-5 text-pink-400" />, title: "Responsive UI", desc: "Mobile-first design that works on phones, tablets, and desktops." },
            { icon: <Sparkles className="h-5 w-5 text-teal-400" />, title: "Lifetime Updates", desc: "Free updates for 12 months. Git-based, so you control when to merge." },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.05] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div>
                <h3 className="font-bold text-white text-sm mb-1">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── PRICING ──────────────────────────────────────────────────── */}
      <Section id="pricing">
        <div className="text-center mb-16">
          <Pill><Sparkles className="h-3 w-3" /> Pricing</Pill>
          <h2 className="text-4xl md:text-5xl font-black mb-4">One code, three plans</h2>
          <p className="text-slate-400">Pay once, own forever. No subscriptions.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              name: "Standard",
              price: "149",
              desc: "For a single project",
              features: [
                "Full source code",
                "All 30+ components",
                "Supabase schema + migrations",
                "6 months updates",
                "Community support",
                "Single project license",
              ],
              cta: "Get Standard",
              highlight: false,
            },
            {
              name: "Extended",
              price: "349",
              desc: "For client projects & SaaS",
              features: [
                "Everything in Standard",
                "Use in client projects",
                "White-label rights",
                "12 months updates",
                "Priority email support",
                "Up to 5 projects",
              ],
              cta: "Get Extended",
              highlight: true,
              badge: "Most Popular",
            },
            {
              name: "Agency",
              price: "699",
              desc: "Unlimited use for teams",
              features: [
                "Everything in Extended",
                "Unlimited projects",
                "Resell to clients",
                "Lifetime updates",
                "Priority Slack support",
                "Custom onboarding call",
              ],
              cta: "Get Agency",
              highlight: false,
            },
          ].map((plan, i) => (
            <div key={i} className={cn(
              "rounded-2xl border p-7 flex flex-col relative",
              plan.highlight
                ? "bg-gradient-to-b from-indigo-600/20 to-indigo-600/5 border-indigo-500/30 shadow-xl shadow-indigo-600/10"
                : "bg-white/[0.02] border-white/[0.08]"
            )}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[11px] font-bold px-3 py-1 rounded-full">
                  {plan.badge}
                </div>
              )}
              <div className="mb-6">
                <h3 className="font-bold text-white text-lg mb-1">{plan.name}</h3>
                <p className="text-slate-500 text-xs mb-4">{plan.desc}</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black text-white">${plan.price}</span>
                  <span className="text-slate-500 text-sm pb-1">one-time</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="https://gumroad.com"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "text-center py-3 rounded-xl font-semibold text-sm transition-all block",
                  plan.highlight
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25"
                    : "border border-white/10 hover:bg-white/5 text-slate-300"
                )}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Guarantee */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-2 bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-sm font-medium px-5 py-2.5 rounded-full">
            <Shield className="h-4 w-4" />
            30-day money-back guarantee — no questions asked
          </div>
        </div>
      </Section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <Section className="bg-gradient-to-b from-[#050816] via-[#060c22] to-[#050816]">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black">Frequently Asked Questions</h2>
        </div>
        <div className="max-w-2xl mx-auto space-y-4">
          {[
            { q: "What do I get after purchase?", a: "You'll receive a link to a private GitHub repository with the full source code, documentation, database migrations, and seed data. Clone it and start customizing immediately." },
            { q: "Do I need a Supabase account?", a: "Yes — Supabase provides the backend (database, auth, file storage, edge functions). They have a generous free tier that covers most small agencies." },
            { q: "Can I use this for client projects?", a: "With the Extended or Agency license, yes! You can customize and deploy it for client projects, or even build a SaaS on top of it." },
            { q: "Is it only for Greek travel agencies?", a: "No! While it comes with Greek language support and Greek tax features, it's designed to be fully configurable for any country, currency, and language." },
            { q: "Do I get updates?", a: "Yes — depending on your plan, you get 6-12 months (or lifetime) of updates via Git. You merge when you're ready, so your customizations are never overwritten." },
          ].map((faq, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
              <h3 className="font-bold text-white text-sm mb-2">{faq.q}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <Section className="pb-32">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-700 to-purple-700 p-12 md:p-20 text-center">
          <div className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.12) 0%, transparent 60%)"
            }}
          />
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
              Stop building from scratch.
            </h2>
            <p className="text-indigo-100 max-w-xl mx-auto mb-10 leading-relaxed">
              Get a production-ready travel agency platform in minutes. Full source code, modern stack, beautiful UI.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="#pricing"
                className="group flex items-center gap-2 bg-white text-indigo-700 font-bold px-8 py-4 rounded-2xl transition-all hover:bg-indigo-50 shadow-xl text-sm">
                Get TravelDocs Pro
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
              <Link to="/demo"
                className="flex items-center gap-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 px-8 py-4 rounded-2xl transition-all text-sm font-medium">
                <MonitorPlay className="h-4 w-4" />
                Try Live Demo
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] px-6 py-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <InfinityIcon className="h-4 w-4 text-white" />
            </div>
            <span className="font-black text-white text-xl">TravelDocs</span>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 px-1.5 py-0.5 rounded-md">PRO</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <a href="#features" className="hover:text-slate-300 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-slate-300 transition-colors">Pricing</a>
            <Link to="/demo" className="hover:text-slate-300 transition-colors">Demo</Link>
          </div>
          <p className="text-slate-600 text-sm">
            © {new Date().getFullYear()} TravelDocs Pro · Built with React + Supabase
          </p>
        </div>
      </footer>
    </div>
  );
}
