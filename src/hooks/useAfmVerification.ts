import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AfmVerificationResult {
    found: boolean;
    afm: string;
    name?: string;
    legalName?: string;
    tradeName?: string;
    doy?: string;
    doyCode?: string;
    address?: {
        street: string;
        number: string;
        zip: string;
        city: string;
    };
    activity?: string;
    registrationDate?: string;
    stopDate?: string;
    isActive?: boolean;
    error?: string;
}

/**
 * Hook for verifying Greek VAT numbers (ΑΦΜ) via ΑΑΔΕ/GSIS API
 */
export function useAfmVerification() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AfmVerificationResult | null>(null);

    const verify = useCallback(async (afm: string): Promise<AfmVerificationResult | null> => {
        // Clean and validate
        const cleanAfm = afm.replace(/\s/g, "").replace(/^EL/i, "");

        if (cleanAfm.length !== 9 || !/^\d{9}$/.test(cleanAfm)) {
            toast.error("Μη έγκυρο ΑΦΜ. Πρέπει να είναι 9 ψηφία.");
            return null;
        }

        setLoading(true);
        setResult(null);

        try {
            const response = await supabase.functions.invoke("verify-afm", {
                body: { afm: cleanAfm },
            });

            if (response.error) {
                toast.error("Σφάλμα επικοινωνίας με ΑΑΔΕ");
                return null;
            }

            const data = response.data as AfmVerificationResult;
            setResult(data);

            if (data.found) {
                toast.success(`Βρέθηκε: ${data.name}`);
            } else if (data.error) {
                toast.warning(data.error);
            } else {
                toast.warning("Δεν βρέθηκε εγγραφή για αυτό το ΑΦΜ");
            }

            return data;
        } catch (error: any) {
            console.error("AFM verification error:", error);
            toast.error("Σφάλμα επαλήθευσης ΑΦΜ");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const clear = useCallback(() => {
        setResult(null);
    }, []);

    return { verify, loading, result, clear };
}

/**
 * Validate Greek ΑΦΜ checksum (offline validation)
 * Returns true if the AFM passes the modulus 11 check
 */
export function validateAfmChecksum(afm: string): boolean {
    const clean = afm.replace(/\s/g, "").replace(/^EL/i, "");
    if (clean.length !== 9 || !/^\d{9}$/.test(clean)) return false;

    const digits = clean.split("").map(Number);
    let sum = 0;
    for (let i = 0; i < 8; i++) {
        sum += digits[i] * Math.pow(2, 8 - i);
    }
    const checkDigit = (sum % 11) % 10;
    return checkDigit === digits[8];
}
