import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    BarChart3,
    Search,
    Send,
    Inbox,
    Plus,
    Users,
    ShieldCheck,
    Brain,
    Sparkles,
    Zap,
    Share2,
    Upload,
    FileText,
    AlertTriangle,
    CheckCircle2,
    TrendingUp,
    TrendingDown,
    Loader2,
    MoreVertical,
    Camera,
    MessageSquare
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { AI_CATEGORIES, generateSpendingInsights, analyzeInvoiceAI, SmartInvoiceData } from "@/lib/ai-invoice-service";

export default function InvoiceExchange() {
    const [activeTab, setActiveTab] = useState("hub");
    const [isUploading, setIsUploading] = useState(false);
    const [analyzingFile, setAnalyzingFile] = useState<File | null>(null);
    const [aiInsights, setAiInsights] = useState<any[]>([]);
    const [showInviteDialog, setShowInviteDialog] = useState(false);

    useEffect(() => {
        loadInsights();
    }, []);

    const loadInsights = async () => {
        const insights = await generateSpendingInsights("current");
        setAiInsights(insights);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAnalyzingFile(file);
            setIsUploading(true);

            try {
                const result = await analyzeInvoiceAI(file);
                toast.success("Η ανάλυση ολοκληρώθηκε!", {
                    description: `Κατηγορία: ${result.analysis.categoryName} • Εμπιστοσύνη: ${(result.analysis.confidence * 100).toFixed(0)}%`
                });
            } catch (error) {
                toast.error("Σφάλμα κατά την ανάλυση");
            } finally {
                setIsUploading(false);
                setAnalyzingFile(null);
            }
        }
    };

    const handleInvite = () => {
        setShowInviteDialog(false);
        toast.success("Η πρόσκληση στάλθηκε!", {
            description: "Ο συνεργάτης θα λάβει email με οδηγίες εγγραφής."
        });
    };

    return (
        <div className="space-y-8 pb-24 animate-in fade-in duration-500">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 p-8 text-white shadow-2xl">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md">
                                <Sparkles className="w-3 h-3 mr-1" /> AI-Powered
                            </Badge>
                            <Badge className="bg-emerald-500/80 text-white border-0 backdrop-blur-md">
                                <ShieldCheck className="w-3 h-3 mr-1" /> Secure Network
                            </Badge>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">Invoice Hub</h1>
                        <p className="text-indigo-100 max-w-xl text-lg opacity-90">
                            Το κέντρο διαχείρισης παραστατικών της νέας εποχής.
                            Ανταλλάξτε, αναλύστε και πληρώστε τιμολόγια με τη δύναμη της Τεχνητής Νοημοσύνης.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                            onClick={() => setShowInviteDialog(true)}
                            className="bg-white text-indigo-600 hover:bg-indigo-50 font-semibold shadow-lg hover:shadow-xl transition-all rounded-xl h-12 px-6"
                        >
                            <Share2 className="w-4 h-4 mr-2" />
                            Πρόσκληση Συνεργάτη
                        </Button>
                        <div className="relative">
                            <input
                                type="file"
                                className="hidden"
                                id="invoice-upload"
                                onChange={handleFileUpload}
                                accept=".pdf,.jpg,.png"
                                disabled={isUploading}
                            />
                            <label htmlFor="invoice-upload">
                                <Button
                                    asChild
                                    className="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold shadow-lg hover:shadow-xl transition-all rounded-xl h-12 px-6 cursor-pointer border border-indigo-400/30"
                                >
                                    <span>
                                        {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                        {isUploading ? "Ανάλυση..." : "Μεταφόρτωση"}
                                    </span>
                                </Button>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Quick Stats in Hero */}
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                        <p className="text-indigo-100 text-sm font-medium mb-1">Νέα Εισερχόμενα</p>
                        <p className="text-3xl font-bold">12</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                        <p className="text-indigo-100 text-sm font-medium mb-1">Προς Έγκριση</p>
                        <p className="text-3xl font-bold">4</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                        <p className="text-indigo-100 text-sm font-medium mb-1">Ανωμαλίες (AI)</p>
                        <p className="text-3xl font-bold text-rose-200">2</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                        <p className="text-indigo-100 text-sm font-medium mb-1">Κέρδος Δικτύου</p>
                        <p className="text-3xl font-bold text-emerald-200">+15%</p>
                    </div>
                </div>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-white p-1 rounded-2xl border shadow-sm w-full md:w-auto overflow-x-auto flex-nowrap justify-start">
                    <TabsTrigger value="hub" className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                        <Inbox className="w-4 h-4 mr-2" />
                        Smart Inbox
                    </TabsTrigger>
                    <TabsTrigger value="insights" className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">
                        <Brain className="w-4 h-4 mr-2" />
                        AI Insights
                    </TabsTrigger>
                    <TabsTrigger value="network" className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                        <Users className="w-4 h-4 mr-2" />
                        Δίκτυο Συνεργατών
                    </TabsTrigger>
                </TabsList>

                {/* Smart Inbox Tab */}
                <TabsContent value="hub" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Inbox List */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Inbox className="w-5 h-5 text-indigo-500" />
                                    Πρόσφατα Παραστατικά
                                </h2>
                                <div className="flex gap-2">
                                    <Input placeholder="Αναζήτηση..." className="w-64 rounded-xl bg-white" />
                                    <Button variant="outline" size="icon" className="rounded-xl"><Search className="w-4 h-4" /></Button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Card key={i} className="group p-4 rounded-2xl hover:shadow-lg transition-all duration-300 border-slate-100 hover:border-indigo-100 cursor-pointer bg-white">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-110 transition-transform",
                                                    i % 2 === 0 ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                                                )}>
                                                    {i % 2 === 0 ? <FileText className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">Digital Solutions Ltd</h3>
                                                        {i === 1 && <Badge variant="secondary" className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0 rounded-md">AI Alert</Badge>}
                                                    </div>
                                                    <p className="text-sm text-slate-500">
                                                        Τιμολόγιο #{2024000 + i} • {format(new Date(), 'dd MMM yyyy', { locale: el })}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="font-bold text-slate-900 text-lg">€{(Math.random() * 1000).toFixed(2)}</p>
                                                <div className="flex items-center justify-end gap-1">
                                                    <span className={cn(
                                                        "h-2 w-2 rounded-full",
                                                        i === 1 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                                                    )} />
                                                    <span className="text-xs font-medium text-slate-500">
                                                        {i === 1 ? 'Έλεγχος' : 'Εγκρίθηκε'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* AI Context Preview */}
                                        {i === 1 && (
                                            <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
                                                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-semibold text-rose-700">Ανίχνευση Ανωμαλίας (AI)</p>
                                                    <p className="text-sm text-rose-600/90">Το ποσό είναι 45% υψηλότερο από το μέσο όρο των τελευταίων 6 μηνών για αυτόν τον προμηθευτή.</p>
                                                </div>
                                            </div>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        </div>

                        {/* Smart Actions & Sidebar */}
                        <div className="space-y-6">
                            {/* Quick Actions Card */}
                            <Card className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-800 text-white border-0 shadow-xl">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-yellow-400" />
                                    Quick Actions
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button variant="secondary" className="h-20 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border-0 text-white transition-all">
                                        <Camera className="w-6 h-6" />
                                        <span className="text-xs">Scan</span>
                                    </Button>
                                    <Button variant="secondary" className="h-20 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border-0 text-white transition-all">
                                        <Upload className="w-6 h-6" />
                                        <span className="text-xs">Upload</span>
                                    </Button>
                                    <Button variant="secondary" className="h-20 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border-0 text-white transition-all">
                                        <Send className="w-6 h-6" />
                                        <span className="text-xs">Send</span>
                                    </Button>
                                    <Button variant="secondary" className="h-20 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border-0 text-white transition-all">
                                        <MessageSquare className="w-6 h-6" />
                                        <span className="text-xs">Ask AI</span>
                                    </Button>
                                </div>
                            </Card>

                            {/* Verified Partners */}
                            <Card className="p-6 rounded-3xl border-slate-100 shadow-lg bg-white">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-slate-800">Top Partners</h3>
                                    <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 p-0 h-auto font-medium">View All</Button>
                                </div>
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                                                {String.fromCharCode(64 + i)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-1">
                                                    <p className="font-semibold text-sm text-slate-900">Partner Corp {i}</p>
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500 fill-emerald-100" />
                                                </div>
                                                <p className="text-xs text-slate-500">Verified • 4.9/5.0</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-indigo-50 text-indigo-600">
                                                <Send className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* AI Insights Tab */}
                <TabsContent value="insights" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="p-6 rounded-3xl border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-white">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                <Brain className="w-5 h-5 text-indigo-600" />
                                Spending Intelligence
                            </h3>
                            <div className="space-y-4">
                                {aiInsights.map((insight, idx) => (
                                    <div key={idx} className="p-4 bg-white rounded-2xl shadow-sm border border-indigo-50/50 flex gap-4">
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                            insight.type === 'warning' ? "bg-rose-100 text-rose-600" :
                                                insight.type === 'success' ? "bg-emerald-100 text-emerald-600" :
                                                    "bg-blue-100 text-blue-600"
                                        )}>
                                            {insight.type === 'warning' ? <TrendingUp className="w-5 h-5" /> :
                                                insight.type === 'success' ? <TrendingDown className="w-5 h-5" /> :
                                                    <Sparkles className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-800">{insight.title}</h4>
                                            <p className="text-sm text-slate-600 mt-1 leading-relaxed">{insight.message}</p>
                                            <Button variant="link" className="p-0 h-auto mt-2 text-indigo-600 font-medium text-xs">
                                                {insight.action} →
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <div className="space-y-6">
                            <Card className="p-6 rounded-3xl bg-slate-900 text-white border-0 shadow-lg">
                                <h3 className="font-bold text-lg mb-2">My Assistant</h3>
                                <div className="h-64 flex flex-col justify-end">
                                    <div className="space-y-3 mb-4">
                                        <div className="bg-white/10 rounded-2xl p-3 rounded-bl-sm self-start max-w-[80%] backdrop-blur-sm">
                                            <p className="text-sm">Καλημέρα! Παρατήρησα μια αύξηση 15% στα κόστη Marketing αυτόν τον μήνα. Θέλετε ανάλυση;</p>
                                        </div>
                                        <div className="bg-indigo-600 rounded-2xl p-3 rounded-br-sm self-end max-w-[80%]">
                                            <p className="text-sm">Ναι, δείξε μου τα top 3 έξοδα.</p>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <Input placeholder="Ρωτήστε κάτι..." className="bg-white/10 border-white/20 text-white placeholder:text-white/40 pr-10 rounded-xl" />
                                        <Button size="icon" variant="ghost" className="absolute right-0 top-0 text-white hover:bg-white/10 rounded-xl">
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* Network & Invite Tab */}
                <TabsContent value="network">
                    <Card className="p-12 text-center rounded-3xl border-dashed border-2 bg-slate-50/50">
                        <div className="mx-auto h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center mb-6">
                            <Users className="w-8 h-8 text-indigo-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Μεγαλώστε το Δίκτυό σας</h3>
                        <p className="text-slate-600 max-w-md mx-auto mb-8">
                            Προσκαλέστε συνεργάτες για να ανταλλάσσετε παραστατικά αυτόματα, χωρίς emails και καθυστερήσεις.
                        </p>
                        <Button size="lg" onClick={() => setShowInviteDialog(true)} className="rounded-xl px-8 h-12 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200">
                            <Share2 className="w-5 h-5 mr-2" />
                            Αποστολή Πρόσκλησης
                        </Button>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Invite Dialog */}
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogContent className="sm:max-w-md rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Πρόσκληση Συνεργάτη</DialogTitle>
                        <DialogDescription>
                            Στείλτε πρόσκληση για άμεση σύνδεση στο Invoice Hub.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email Συνεργάτη</label>
                            <Input placeholder="partner@company.com" className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Μήνυμα (προαιρετικό)</label>
                            <Input placeholder="Γεια σου, έλα να συνδεθούμε στο Invoice Hub..." className="rounded-xl" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowInviteDialog(false)} className="rounded-xl">Ακύρωση</Button>
                        <Button onClick={handleInvite} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">Αποστολή</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

