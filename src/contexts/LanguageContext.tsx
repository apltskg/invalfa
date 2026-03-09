import { createContext, useContext, useState, ReactNode } from "react";
import { translations, Language } from "@/lib/translations";
import { APP_CONFIG } from "@/config/app.config";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: typeof translations.el | typeof translations.en;
    currency: string;
    formatCurrency: (amount: number) => string;
    formatDate: (date: Date | string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>(APP_CONFIG.locale.defaultLanguage);

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat(language === "el" ? "el-GR" : "en-US", {
            style: "currency",
            currency: APP_CONFIG.locale.currency,
        }).format(amount);
    };

    const formatDate = (date: Date | string): string => {
        const dateObj = typeof date === "string" ? new Date(date) : date;
        return dateObj.toLocaleDateString(
            language === "el" ? "el-GR" : "en-US",
            APP_CONFIG.locale.dateFormat
        );
    };

    return (
        <LanguageContext.Provider 
            value={{ 
                language, 
                setLanguage, 
                t: translations[language],
                currency: APP_CONFIG.locale.currency,
                formatCurrency,
                formatDate
            }}
        >
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within LanguageProvider");
    }
    return context;
}
