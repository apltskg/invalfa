// Income categories table doesn't exist yet - showing placeholder
import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export function IncomeCategoryManager() {
    return (
        <Card className="p-8 rounded-2xl text-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <TrendingUp className="h-12 w-12 opacity-30" />
                <p className="font-medium">Κατηγορίες Εσόδων</p>
                <p className="text-sm">Σύντομα διαθέσιμο</p>
            </div>
        </Card>
    );
}