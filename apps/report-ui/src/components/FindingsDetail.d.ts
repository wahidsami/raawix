import type { PageRuleResults, PageArtifact } from '@raawi-x/core';
interface FindingsDetailProps {
    pageResults: PageRuleResults;
    pageArtifact: PageArtifact | undefined;
    apiUrl: string;
    apiKey: string;
    scanId: string;
    onClose: () => void;
}
export default function FindingsDetail({ pageResults, pageArtifact, apiUrl, apiKey, scanId, onClose, }: FindingsDetailProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=FindingsDetail.d.ts.map