interface ScanDashboardProps {
    apiUrl: string;
    apiKey: string;
    scanId: string | null;
    onScanStart: (scanId: string) => void;
    onNewScan: () => void;
}
export default function ScanDashboard({ apiUrl, apiKey, scanId, onScanStart, onNewScan }: ScanDashboardProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=ScanDashboard.d.ts.map