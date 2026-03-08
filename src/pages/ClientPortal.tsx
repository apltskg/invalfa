import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";

// hub_shares table doesn't exist yet - showing placeholder
export default function ClientPortal() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
            <Card className="p-8 rounded-2xl text-center max-w-md w-full">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <FileText className="h-16 w-16 opacity-30" />
                    <h1 className="text-xl font-semibold text-foreground">Client Portal</h1>
                    <p className="text-sm">Σύντομα διαθέσιμο</p>
                    <p className="text-xs text-muted-foreground">
                        Η πύλη πελατών θα είναι διαθέσιμη σύντομα.
                    </p>
                </div>
            </Card>
        </div>
    );
}