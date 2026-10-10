/**
 * Utility functions for table alignment and RTL support
 */
/**
 * Get text alignment class for table headers and cells
 * Returns appropriate alignment based on current language direction
 */
export declare function useTableAlignment(): {
    /**
     * Get alignment class for table headers/cells
     * @param align - 'left', 'right', 'center', or 'auto' (auto respects RTL)
     */
    getAlignClass: (align?: "left" | "right" | "center" | "auto") => "" | "text-center";
    /**
     * Get classes for action column cells
     */
    actionColumnClass: string;
    /**
     * Check if current direction is RTL
     */
    isRTL: boolean;
};
/**
 * Helper to conditionally apply text alignment
 * Note: CSS handles most alignment automatically, but this can be used for edge cases
 */
export declare function getTableTextAlign(align?: 'left' | 'right' | 'center'): "" | "text-center";
//# sourceMappingURL=table-utils.d.ts.map