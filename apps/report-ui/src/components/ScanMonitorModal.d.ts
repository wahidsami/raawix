interface ScanMonitorModalProps {
    scanId: string;
    seedUrl: string;
    scanMode?: 'domain' | 'single';
    maxPages?: number;
    maxDepth?: number;
    entityId?: string;
    propertyId?: string;
    onClose: () => void;
    onComplete?: () => void;
}
export default function ScanMonitorModal({ scanId, seedUrl, scanMode, maxPages, maxDepth, entityId, propertyId, onClose, onComplete }: ScanMonitorModalProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=ScanMonitorModal.d.ts.map