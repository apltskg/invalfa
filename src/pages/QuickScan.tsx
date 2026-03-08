import { useState, useRef, useCallback } from "react";
import { Camera, Upload, ArrowLeft, Loader2, Check, RotateCw, Zap, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { resolveContactIds } from "@/lib/auto-link-contact";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

type ScanStep = "capture" | "uploading" | "extracting" | "preview" | "saving" | "done";

interface ExtractedResult {
    merchant?: string;
    amount?: number;
    date?: string;
    category?: string;
    invoice_number?: string;
    tax_id?: string;
}

export default function QuickScan() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<ScanStep>("capture");
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [extractedData, setExtractedData] = useState<ExtractedResult | null>(null);
    const [savedType, setSavedType] = useState<"income" | "expense">("expense");
    const [filePath, setFilePath] = useState<string | null>(null);

    const processFile = useCallback(async (file: File) => {
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => setCapturedImage(e.target?.result as string);
        reader.readAsDataURL(file);

        // Upload
        setStep("uploading");
        try {
            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const uploadPath = `uploads/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('invoices')
                .upload(uploadPath, file);

            if (uploadError) throw uploadError;
            setFilePath(uploadPath);

            // Extract
            setStep("extracting");
            let extracted: ExtractedResult | null = null;

            try {
                const response = await supabase.functions.invoke('extract-invoice', {
                    body: { filePath: uploadPath, fileName: file.name },
                });

                if (response.data && typeof response.data === 'object') {
                    const rawData = response.data as any;
                    extracted = (rawData.extracted || rawData) as ExtractedResult;
                }
            } catch (extractError) {
                console.error('Extraction error:', extractError);
                toast.error("Αδυναμία ανάγνωσης. Συμπληρώστε χειροκίνητα.");
            }

            setExtractedData(extracted);
            setStep("preview");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Αποτυχία μεταφόρτωσης");
            setStep("capture");
        }
    }, []);

    const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleSave = async () => {
        if (!filePath) return;

        setStep("saving");
        try {
            const autoLinked = await resolveContactIds(
                extractedData?.merchant,
                savedType as "income" | "expense",
                extractedData?.tax_id
            );
            const { error } = await (supabase as any).from("invoices").insert([{
                file_path: filePath,
                file_name: `scan-${Date.now()}.jpg`,
                merchant: extractedData?.merchant || null,
                amount: extractedData?.amount || null,
                invoice_date: extractedData?.date || null,
                category: extractedData?.category || "other",
                extracted_data: extractedData as any,
                type: savedType,
                ...autoLinked,
            }]);

            if (error) throw error;
            setStep("done");
            toast.success("Αποθηκεύτηκε!");
            setTimeout(() => navigate(savedType === "expense" ? "/general-expenses" : "/general-income"), 1500);
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Αποτυχία αποθήκευσης");
            setStep("preview");
        }
    };

    const reset = () => {
        setStep("capture");
        setCapturedImage(null);
        setExtractedData(null);
        setFilePath(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            {/* Header */}
            <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between bg-slate-900/80 backdrop-blur-lg border-b border-white/5">
                <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-lg font-bold tracking-tight">Quick Scan</h1>
                <div className="w-9" />
            </div>

            <div className="max-w-lg mx-auto px-4 py-6">
                <AnimatePresence mode="wait">
                    {/* STEP: Capture */}
                    {step === "capture" && (
                        <motion.div
                            key="capture"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <div className="text-center space-y-2">
                                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
                                    <Zap className="h-8 w-8" />
                                </div>
                                <h2 className="text-2xl font-bold">Σκανάρετε Παραστατικό</h2>
                                <p className="text-slate-400 text-sm">Φωτογραφίστε ή ανεβάστε ένα τιμολόγιο</p>
                            </div>

                            {/* Camera button */}
                            <button
                                onClick={() => cameraInputRef.current?.click()}
                                className="w-full aspect-[4/3] rounded-3xl border-2 border-dashed border-white/20 hover:border-blue-400/50 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-4 group"
                            >
                                <div className="h-20 w-20 rounded-full bg-blue-500/20 group-hover:bg-blue-500/30 flex items-center justify-center transition-colors">
                                    <Camera className="h-10 w-10 text-blue-400" />
                                </div>
                                <span className="text-lg font-medium text-slate-300 group-hover:text-white transition-colors">
                                    Φωτογράφηση
                                </span>
                            </button>

                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleCapture}
                                className="hidden"
                            />

                            {/* Upload from gallery */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/15 transition-colors flex items-center justify-center gap-3"
                            >
                                <Upload className="h-5 w-5 text-slate-400" />
                                <span className="font-medium text-slate-300">Επιλογή από Αρχεία</span>
                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={handleCapture}
                                className="hidden"
                            />
                        </motion.div>
                    )}

                    {/* STEP: Uploading / Extracting */}
                    {(step === "uploading" || step === "extracting") && (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-8 text-center py-12"
                        >
                            {capturedImage && (
                                <div className="relative mx-auto w-48 h-48 rounded-2xl overflow-hidden shadow-2xl">
                                    <img src={capturedImage} alt="Scanned" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <Loader2 className="h-10 w-10 animate-spin text-white" />
                                    </div>
                                </div>
                            )}
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold">
                                    {step === "uploading" ? "Μεταφόρτωση..." : "AI Ανάγνωση..."}
                                </h2>
                                <p className="text-slate-400 text-sm">
                                    {step === "uploading"
                                        ? "Αποθήκευση αρχείου στο cloud"
                                        : "Εξαγωγή δεδομένων με τεχνητή νοημοσύνη"}
                                </p>
                            </div>
                            <div className="flex justify-center gap-1">
                                {[0, 1, 2].map(i => (
                                    <div
                                        key={i}
                                        className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"
                                        style={{ animationDelay: `${i * 200}ms` }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* STEP: Preview */}
                    {step === "preview" && (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-5"
                        >
                            {capturedImage && (
                                <div className="relative mx-auto w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl">
                                    <img src={capturedImage} alt="Scanned" className="w-full object-contain max-h-48" />
                                </div>
                            )}

                            <Card className="bg-white/10 border-white/10 rounded-2xl">
                                <CardContent className="p-5 space-y-4">
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-blue-400" />
                                        Αποτελέσματα AI
                                    </h3>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] text-slate-400 uppercase tracking-wider">Προμηθευτής</label>
                                            <p className="font-semibold text-sm mt-0.5 truncate">
                                                {extractedData?.merchant || "—"}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-slate-400 uppercase tracking-wider">Ποσό</label>
                                            <p className="font-bold text-lg text-emerald-400 mt-0.5">
                                                {extractedData?.amount ? `€${extractedData.amount.toFixed(2)}` : "—"}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-slate-400 uppercase tracking-wider">Ημερομηνία</label>
                                            <p className="font-semibold text-sm mt-0.5">
                                                {extractedData?.date || "—"}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-slate-400 uppercase tracking-wider">Κατηγορία</label>
                                            <p className="font-semibold text-sm mt-0.5 capitalize">
                                                {extractedData?.category || "—"}
                                            </p>
                                        </div>
                                        {extractedData?.tax_id && (
                                            <div className="col-span-2">
                                                <label className="text-[11px] text-slate-400 uppercase tracking-wider">ΑΦΜ</label>
                                                <p className="font-mono text-sm mt-0.5">{extractedData.tax_id}</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Type selector */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSavedType("expense")}
                                    className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${savedType === "expense"
                                            ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                                            : "bg-white/10 text-slate-300 hover:bg-white/15"
                                        }`}
                                >
                                    Έξοδο
                                </button>
                                <button
                                    onClick={() => setSavedType("income")}
                                    className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${savedType === "income"
                                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                            : "bg-white/10 text-slate-300 hover:bg-white/15"
                                        }`}
                                >
                                    Έσοδο
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <Button onClick={reset} variant="outline" className="flex-1 rounded-xl h-12 bg-white/5 border-white/10 hover:bg-white/10 text-white">
                                    <RotateCw className="h-4 w-4 mr-2" />
                                    Ξανά
                                </Button>
                                <Button onClick={handleSave} className="flex-1 rounded-xl h-12 bg-blue-600 hover:bg-blue-700">
                                    <Check className="h-4 w-4 mr-2" />
                                    Αποθήκευση
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP: Saving */}
                    {step === "saving" && (
                        <motion.div
                            key="saving"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-16 space-y-4"
                        >
                            <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-400" />
                            <p className="text-lg font-medium">Αποθήκευση...</p>
                        </motion.div>
                    )}

                    {/* STEP: Done */}
                    {step === "done" && (
                        <motion.div
                            key="done"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-16 space-y-4"
                        >
                            <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                                <Check className="h-10 w-10 text-emerald-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-emerald-400">Ολοκληρώθηκε!</h2>
                            <p className="text-slate-400">Ανακατεύθυνση...</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
