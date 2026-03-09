import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  FileText, BarChart2, CreditCard, Package, Users, Zap,
  CheckCircle2, ArrowRight, Star, Shield, TrendingUp,
  Building2, Globe, Download, ChevronRight, Menu, X,
  Layers, Inbox, Bot, BadgeEuro, Receipt, Lock, PhoneCall, Clock
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
        const steps = 50;
        const increment = target / steps;
        let current = 0;
        const timer = setInterval(() => {
          current = Math.min(current + increment, target);
          setCount(Math.round(current));
          if (current >= target) clearInterval(timer);
        }, 36);
      }
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ─── Dashboard Mockup ────────────────────────────────────────────── */
function DashboardMockup() {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="absolute inset-0 bg-blue-500/20 blur-[60px] rounded-3xl" />
      <div className="relative bg-[#0d1526] rounded-2xl border border-white/10 shadow-2xl overflow-hidden" style={{ aspectRatio: "16/10" }}>
        <div className="flex items-center gap-1.5 px-4 py-3 bg-[#091020] border-b border-white/8">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
          <div className="flex-1 mx-4 bg-white/5 rounded-md px-3 py-1 text-[10px] text-slate-500">app.invalfa.com/dashboard</div>
        </div>
        <div className="flex h-full">
          <div className="w-14 bg-[#060d1c] border-r border-white/5 flex flex-col items-center py-4 gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center mb-2">
              <Receipt className="w-4 h-4 text-white" />
            </div>
            {[BarChart2, Package, FileText, Users, CreditCard, Building2].map((Icon, i) => (
              <div key={i} className={cn("w-8 h-8 rounded-lg flex items-center justify-center", i === 0 ? "bg-blue-600/20" : "hover:bg-white/5")}>
                <Icon className={cn("w-4 h-4", i === 0 ? "text-blue-400" : "text-slate-600")} />
              </div>
            ))}
          </div>
          <div className="flex-1 p-4 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <div><div className="h-3 w-24 bg-white/15 rounded-full mb-1" /><div className="h-2 w-16 bg-white/6 rounded-full" /></div>
              <div className="h-7 w-24 bg-blue-600/30 border border-blue-500/30 rounded-lg" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { color: "border-l-blue-500", label: "Revenue", val: "€48,250", up: true },
                { color: "border-l-emerald-500", label: "Collected", val: "€31,400", up: true },
                { color: "border-l-amber-400", label: "Pending", val: "€16,850", up: false },
              ].map((c, i) => (
                <div key={i} className={cn("bg-white/5 rounded-xl p-2.5 border-l-2", c.color)}>
                  <div className="text-[8px] text-slate-500 mb-1">{c.label}</div>
                  <div className="text-[11px] font-bold text-white">{c.val}</div>
                  <div className={cn("text-[8px] mt-0.5", c.up ? "text-emerald-400" : "text-amber-400")}>{c.up ? "↑ 12%" : "↓ 3%"}</div>
                </div>
              ))}
            </div>
            <div className="bg-white/3 rounded-xl p-3 border border-white/5">
              <div className="flex items-end gap-1 h-16">
                {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end">
                    <div className="rounded-t-sm" style={{ height: `${h}%`, background: i === 11 ? "linear-gradient(to top, #2563eb, #60a5fa)" : "rgba(99,102,241,0.25)" }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              {[
                { name: "Sunway Hotels", amt: "€2,400", status: "paid" },
                { name: "Aegean Airlines", amt: "€890", status: "pending" },
                { name: "Nikos Travel", amt: "€1,750", status: "paid" },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between bg-white/3 rounded-lg px-2.5 py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-slate-700 flex items-center justify-center"><FileText className="w-3 h-3 text-slate-400" /></div>
                    <div className="text-[9px] text-slate-300">{row.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-[9px] font-semibold text-white">{row.amt}</div>
                    <div className={cn("text-[8px] px-1.5 py-0.5 rounded-full", row.status === "paid" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400")}>
                      {row.status === "paid" ? "Paid" : "Pending"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -right-4 top-12 bg-white rounded-2xl shadow-2xl shadow-black/30 px-4 py-3 border border-slate-100 hidden md:block">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></div>
          <div><p className="text-[10px] font-bold text-slate-900">Payment Received</p><p className="text-[9px] text-slate-500">Sunway Hotels · €2,400</p></div>
        </div>
      </div>
      <div className="absolute -left-4 bottom-12 bg-[#0d1526] border border-white/10 rounded-2xl shadow-2xl px-4 py-3 hidden md:block">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center"><Bot className="w-4 h-4 text-blue-400" /></div>
          <div><p className="text-[10px] font-bold text-white">AI Analysis</p><p className="text-[9px] text-slate-400">Invoice extracted in 3s</p></div>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────── */
function Section({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return <section id={id} className={cn("px-6 py-24", className)}><div className="max-w-6xl mx-auto">{children}</div></section>;
}
function Pill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 bg-blue-400/10 border border-blue-400/20 px-3 py-1 rounded-full mb-4">{children}</span>;
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
    { href: "#how", label: "How It Works" },
    { href: "#benefits", label: "Benefits" },
    { href: "#pricing", label: "Pricing" },
  ];
  return (
    <header className={cn("fixed top-0 w-full z-50 transition-all duration-300", scrolled ? "bg-[#07091a]/95 backdrop-blur-lg border-b border-white/8 shadow-xl shadow-black/20" : "bg-transparent")}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/30"><Receipt className="h-4 w-4 text-white" /></div>
          <span className="font-black text-white text-xl tracking-tight">invalfa</span>
        </a>
        <nav className="hidden md:flex items-center gap-1">
          {links.map(l => <a key={l.href} href={l.href} className="text-sm text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">{l.label}</a>)}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <Link to="/landing" className="text-xs text-slate-500 hover:text-slate-300 transition-colors border border-white/10 px-2 py-1 rounded-lg">🇬🇷 Ελληνικά</Link>
          <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors">Sign In</Link>
          <Link to="/demo" className="text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-600/25">Live Demo</Link>
        </div>
        <button className="md:hidden text-white" onClick={() => setOpen(!open)}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {open && (
        <div className="md:hidden bg-[#07091a]/98 border-t border-white/8 px-6 py-4 space-y-1">
          {links.map(l => <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block text-sm text-slate-300 py-2.5 px-3 rounded-lg hover:bg-white/5">{l.label}</a>)}
          <div className="pt-3 border-t border-white/8 mt-2 flex flex-col gap-2">
            <Link to="/login" className="text-sm text-slate-400 text-center py-2">Sign In</Link>
            <Link to="/demo" className="text-sm font-semibold bg-blue-600 text-white text-center py-2.5 rounded-xl">Live Demo</Link>
          </div>
        </div>
      )}
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function LandingEN() {
  return (
    <div className="bg-[#07091a] min-h-screen text-white font-sans" style={{ fontFamily: "'Inter', sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <Nav />

      {/* HERO */}
      <Section className="pt-36 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>
        <div className="text-center mb-16 relative">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Purpose-Built for Travel Agencies
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
            Financial management<br />
            <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-violet-400 bg-clip-text text-transparent">for your agency</span>
            <br />in one tool.
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
            Automated invoice processing, bank reconciliation, real-time reports, and client document sharing — all in one platform, no spreadsheets, no paperwork.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#contact" className="group flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-7 py-3.5 rounded-2xl transition-all shadow-xl shadow-blue-600/30 text-sm">
              Start Free <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <a href="#how" className="flex items-center gap-2 text-slate-400 hover:text-white border border-white/10 hover:border-white/20 px-7 py-3.5 rounded-2xl transition-all text-sm font-medium">
              See How It Works <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>
        <DashboardMockup />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 rounded-2xl overflow-hidden mt-20">
          {[
            { n: 200, s: "+", label: "Travel Agencies" },
            { n: 50000, s: "+", label: "Invoices Processed" },
            { n: 98, s: "%", label: "AI Extraction Accuracy" },
            { n: 40, s: "%", label: "Time Saved" },
          ].map((s, i) => (
            <div key={i} className="bg-[#07091a] px-6 py-8 text-center">
              <p className="text-3xl md:text-4xl font-black text-white mb-1"><Counter target={s.n} suffix={s.s} /></p>
              <p className="text-sm text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* FEATURES */}
      <Section id="features">
        <div className="text-center mb-16">
          <Pill><Zap className="h-3 w-3" /> Features</Pill>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Everything a travel<br />agency needs</h2>
          <p className="text-slate-400 max-w-xl mx-auto">From automatic PDF invoice analysis to live accountant reports — invalfa does it all.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: <Bot className="h-5 w-5" />, color: "from-blue-500/20 to-blue-600/5 border-blue-500/20", iconBg: "bg-blue-500/15 text-blue-400", title: "AI Invoice Extraction", desc: "Upload a PDF and invalfa automatically extracts the date, amount, supplier, and VAT. Zero manual entry.", badge: "New" },
            { icon: <CreditCard className="h-5 w-5" />, color: "from-violet-500/20 to-violet-600/5 border-violet-500/20", iconBg: "bg-violet-500/15 text-violet-400", title: "Bank Reconciliation", desc: "Automatic matching of bank transactions with invoices. Instantly see what's paid and what's pending." },
            { icon: <Package className="h-5 w-5" />, color: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20", iconBg: "bg-emerald-500/15 text-emerald-400", title: "Package Management", desc: "Organize income and expenses per travel package. See real-time P&L per trip." },
            { icon: <Inbox className="h-5 w-5" />, color: "from-amber-500/20 to-amber-600/5 border-amber-500/20", iconBg: "bg-amber-500/15 text-amber-400", title: "Invoice Hub", desc: "Send invoices to clients in one click. Clients receive a secure email link and confirm receipt.", badge: "Hot" },
            { icon: <BarChart2 className="h-5 w-5" />, color: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/20", iconBg: "bg-cyan-500/15 text-cyan-400", title: "Analytics & Reports", desc: "Monthly P&L, expense analysis by category, top clients — ready-made reports for accountants and tax filings." },
            { icon: <Shield className="h-5 w-5" />, color: "from-rose-500/20 to-rose-600/5 border-rose-500/20", iconBg: "bg-rose-500/15 text-rose-400", title: "Accountant Portal", desc: "Give your accountant access with a magic link. Real-time data view, no email attachments needed." },
          ].map((f, i) => (
            <div key={i} className={cn("group relative rounded-2xl border bg-gradient-to-br p-6 hover:scale-[1.02] transition-all duration-300 cursor-default", f.color)}>
              <div className="flex items-start justify-between mb-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", f.iconBg)}>{f.icon}</div>
                {f.badge && <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">{f.badge}</span>}
              </div>
              <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <Section id="how" className="bg-gradient-to-b from-[#07091a] via-[#08102a] to-[#07091a]">
        <div className="text-center mb-16">
          <Pill><Star className="h-3 w-3" /> How It Works</Pill>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Take control<br />in 3 steps</h2>
          <p className="text-slate-400 max-w-lg mx-auto">No training needed, no accounting knowledge required. invalfa is built for business owners, not accountants.</p>
        </div>
        <div className="relative">
          <div className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {[
              { n: "01", icon: <Download className="h-6 w-6 text-blue-400" />, title: "Upload invoices", desc: "Scan or download PDFs from your supplier. invalfa automatically analyzes the details with AI.", color: "border-blue-500/30 bg-blue-500/5" },
              { n: "02", icon: <TrendingUp className="h-6 w-6 text-violet-400" />, title: "View your reports", desc: "See real-time P&L, cash flows, pending payments, and per-package analysis.", color: "border-violet-500/30 bg-violet-500/5" },
              { n: "03", icon: <Globe className="h-6 w-6 text-emerald-400" />, title: "Share & Export", desc: "Export reports to your accountant, send invoices to clients, share access with your team.", color: "border-emerald-500/30 bg-emerald-500/5" },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className={cn("w-20 h-20 rounded-2xl border flex flex-col items-center justify-center mb-6 relative", step.color)}>
                  {step.icon}
                  <span className="absolute -top-2 -right-2 text-[10px] font-black bg-[#07091a] border border-white/10 text-slate-400 w-6 h-6 rounded-full flex items-center justify-center">{step.n}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* BENEFITS */}
      <Section id="benefits">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <Pill><BadgeEuro className="h-3 w-3" /> Why invalfa</Pill>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6">
              Built<br /><span className="text-slate-500">exclusively for</span><br />travel agencies
            </h2>
            <p className="text-slate-400 leading-relaxed mb-8">
              We're not generic accounting software. We understand packages, airlines, hotels, tour operators — and invalfa is built around that workflow.
            </p>
            <ul className="space-y-4">
              {[
                "Organize income & expenses per travel package",
                "Automatic bank payment matching",
                "Send documents to clients without email",
                "Accountant access with no passwords",
                "Multi-country tax support",
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span className="text-slate-300 text-sm">{text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: <Clock className="h-5 w-5" />, color: "text-amber-400 bg-amber-400/10", title: "Time Saved", val: "40%", desc: "Less time on manual data entry" },
              { icon: <Lock className="h-5 w-5" />, color: "text-violet-400 bg-violet-400/10", title: "Security", val: "100%", desc: "Encrypted data, GDPR compliant" },
              { icon: <TrendingUp className="h-5 w-5" />, color: "text-emerald-400 bg-emerald-400/10", title: "AI Accuracy", val: "98%", desc: "In invoice data extraction" },
              { icon: <PhoneCall className="h-5 w-5" />, color: "text-blue-400 bg-blue-400/10", title: "Support", val: "24/7", desc: "Dedicated support always available" },
            ].map((c, i) => (
              <div key={i} className="bg-white/3 border border-white/8 rounded-2xl p-5 hover:bg-white/5 transition-colors">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", c.color)}>{c.icon}</div>
                <p className="text-2xl font-black text-white mb-1">{c.val}</p>
                <p className="text-xs font-semibold text-slate-300 mb-1">{c.title}</p>
                <p className="text-xs text-slate-500">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <Section className="bg-gradient-to-b from-[#07091a] via-[#060d20] to-[#07091a]">
        <div className="text-center mb-12">
          <Pill><Star className="h-3 w-3" /> What Our Clients Say</Pill>
          <h2 className="text-3xl md:text-4xl font-black">Agencies that trust invalfa</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: "Christos P.", role: "Owner, Sunway Travel", text: "Before invalfa I was losing hours every month in Excel. Now my reports are ready in 5 minutes and my accountant has everything they need." },
            { name: "Maria K.", role: "Director, Aegean Dreams", text: "The invoice sharing feature is amazing. Our clients receive documents instantly and we have a complete history." },
            { name: "Nikos A.", role: "Founder, Hellas Voyages", text: "Bank reconciliation was a nightmare every month. invalfa solves it automatically. I can't imagine working without it." },
          ].map((t, i) => (
            <div key={i} className="bg-white/3 border border-white/8 rounded-2xl p-6">
              <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }).map((_, j) => <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">{t.name[0]}</div>
                <div><p className="text-sm font-semibold text-white">{t.name}</p><p className="text-xs text-slate-500">{t.role}</p></div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* PRICING */}
      <Section id="pricing">
        <div className="text-center mb-16">
          <Pill><BadgeEuro className="h-3 w-3" /> Pricing</Pill>
          <h2 className="text-4xl md:text-5xl font-black mb-4">Simple, Transparent</h2>
          <p className="text-slate-400">No hidden fees. Cancel anytime.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { name: "Starter", price: "49", period: "/month", desc: "For small agencies getting started", features: ["Up to 200 invoices/month", "AI extraction", "Basic reports", "1 user", "Email support"], cta: "Get Started", highlight: false },
            { name: "Professional", price: "99", period: "/month", desc: "For growing agencies", features: ["Unlimited invoices", "Bank sync", "Invoice Hub", "3 users", "Accountant portal", "Priority support"], cta: "Get Started", highlight: true },
            { name: "Enterprise", price: "↗", period: "Custom", desc: "For chains & franchises", features: ["Multiple branches", "Custom integrations", "SLA guarantee", "Dedicated support", "Onboarding"], cta: "Contact Us", highlight: false },
          ].map((plan, i) => (
            <div key={i} className={cn("rounded-2xl border p-7 flex flex-col relative", plan.highlight ? "bg-gradient-to-b from-blue-600/20 to-blue-600/5 border-blue-500/40 shadow-xl shadow-blue-600/10" : "bg-white/3 border-white/10")}>
              {plan.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-bold px-3 py-1 rounded-full">Most Popular</div>}
              <div className="mb-6">
                <h3 className="font-bold text-white text-lg mb-1">{plan.name}</h3>
                <p className="text-slate-500 text-xs mb-4">{plan.desc}</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black text-white">{plan.price === "↗" ? "" : "€"}{plan.price}</span>
                  <span className="text-slate-400 text-sm pb-1">{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                {plan.features.map((f, j) => <li key={j} className="flex items-center gap-2.5 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />{f}</li>)}
              </ul>
              <a href="#contact" className={cn("text-center py-3 rounded-xl font-semibold text-sm transition-all", plan.highlight ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25" : "border border-white/10 hover:bg-white/5 text-slate-300")}>{plan.cta}</a>
            </div>
          ))}
        </div>
      </Section>

      {/* FINAL CTA */}
      <Section id="contact" className="pb-32">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-violet-700 p-12 md:p-20 text-center">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.15) 0%, transparent 60%)" }} />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="relative">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-white/60 border border-white/20 px-3 py-1.5 rounded-full mb-6"><Zap className="h-3 w-3" />Free 30-day trial</div>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">Start today.<br />See the difference instantly.</h2>
            <p className="text-blue-100 max-w-xl mx-auto mb-10 leading-relaxed">No credit card required to get started. Sign up in 2 minutes, your agency fully operational in 10.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login" className="group flex items-center gap-2 bg-white text-blue-700 font-bold px-8 py-4 rounded-2xl transition-all hover:bg-blue-50 shadow-xl text-sm">
                Free Demo <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a href="tel:+302101234567" className="flex items-center gap-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 px-8 py-4 rounded-2xl transition-all text-sm font-medium">
                <PhoneCall className="h-4 w-4" /> Talk to Us
              </a>
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center"><Receipt className="h-4 w-4 text-white" /></div>
            <span className="font-black text-white text-xl">invalfa</span>
          </div>
          <p className="text-slate-600 text-sm">© {new Date().getFullYear()} invalfa · Built for travel agencies worldwide</p>
          <div className="flex gap-6">
            {["Terms of Service", "Privacy", "GDPR"].map(l => <a key={l} href="#" className="text-sm text-slate-600 hover:text-slate-400 transition-colors">{l}</a>)}
          </div>
        </div>
      </footer>
    </div>
  );
}
