type Props = {
    page: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    className?: string;
};
export default function TablePagination({ page, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange, className, }: Props): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=TablePagination.d.ts.map