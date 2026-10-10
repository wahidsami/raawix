interface ScanStatusProps {
    status: {
        scanId: string;
        seedUrl: string;
        status: string;
        startedAt: string;
        pagesScanned?: number;
    };
}
export default function ScanStatus({ status }: ScanStatusProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=ScanStatus.d.ts.map