export type Language = 'ar' | 'en';
export declare const translations: {
    ar: {
        nav: {
            home: string;
            login: string;
            logout: string;
            dashboard: string;
            services: string;
        };
        landing: {
            title: string;
            subtitle: string;
            login: string;
            services: string;
        };
        login: {
            title: string;
            subtitle: string;
            idPlaceholder: string;
            continue: string;
            help: string;
        };
        verify: {
            title: string;
            subtitle: string;
            instructions: string[];
            otpLabel: string;
            otpPlaceholder: string;
            confirm: string;
            back: string;
        };
        dashboard: {
            title: string;
            quickServices: string;
            recentRequests: string;
            noRequests: string;
        };
        services: {
            title: string;
            apply: string;
            renewId: string;
            certificates: string;
            license: string;
        };
        apply: {
            step1: string;
            step2: string;
            step3: string;
            review: string;
            success: string;
            fullName: string;
            nationalId: string;
            dob: string;
            mobile: string;
            email: string;
            address: string;
            idCopy: string;
            supportingDoc: string;
            previous: string;
            next: string;
            submit: string;
            required: string;
        };
        common: {
            language: string;
            arabic: string;
            english: string;
        };
    };
    en: {
        nav: {
            home: string;
            login: string;
            logout: string;
            dashboard: string;
            services: string;
        };
        landing: {
            title: string;
            subtitle: string;
            login: string;
            services: string;
        };
        login: {
            title: string;
            subtitle: string;
            idPlaceholder: string;
            continue: string;
            help: string;
        };
        verify: {
            title: string;
            subtitle: string;
            instructions: string[];
            otpLabel: string;
            otpPlaceholder: string;
            confirm: string;
            back: string;
        };
        dashboard: {
            title: string;
            quickServices: string;
            recentRequests: string;
            noRequests: string;
        };
        services: {
            title: string;
            apply: string;
            renewId: string;
            certificates: string;
            license: string;
        };
        apply: {
            step1: string;
            step2: string;
            step3: string;
            review: string;
            success: string;
            fullName: string;
            nationalId: string;
            dob: string;
            mobile: string;
            email: string;
            address: string;
            idCopy: string;
            supportingDoc: string;
            previous: string;
            next: string;
            submit: string;
            required: string;
        };
        common: {
            language: string;
            arabic: string;
            english: string;
        };
    };
};
export declare function getTranslation(lang: Language, key: string): string;
//# sourceMappingURL=translations.d.ts.map