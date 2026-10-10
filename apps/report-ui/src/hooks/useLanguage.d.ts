/**
 * Custom hook for language management with RTL support
 */
export declare function useLanguage(): {
    language: "en" | "ar";
    changeLanguage: (lang: "en" | "ar") => Promise<void>;
    isRTL: boolean;
};
//# sourceMappingURL=useLanguage.d.ts.map