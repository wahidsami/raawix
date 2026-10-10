export declare const CLIENT_PAGE_SIZE_OPTIONS: readonly [10, 25, 50, 100];
/**
 * Client-side slice of an in-memory list. Resets to page 1 when `resetDeps` changes.
 */
export declare function useClientPagination<T>(items: T[], resetDeps: unknown): {
    page: number;
    setPage: import("react").Dispatch<import("react").SetStateAction<number>>;
    pageSize: number;
    setPageSize: import("react").Dispatch<import("react").SetStateAction<number>>;
    totalPages: number;
    total: number;
    pageItems: T[];
};
//# sourceMappingURL=useClientPagination.d.ts.map