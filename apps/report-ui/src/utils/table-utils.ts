/**
 * Utility functions for table alignment and RTL support
 */

import { useLanguage } from '../hooks/useLanguage';

/**
 * Get text alignment class for table headers and cells
 * Returns appropriate alignment based on current language direction
 */
export function useTableAlignment() {
  const { isRTL } = useLanguage();

  return {
    /**
     * Get alignment class for table headers/cells
     * @param align - 'left', 'right', 'center', or 'auto' (auto respects RTL)
     */
    getAlignClass: (align: 'left' | 'right' | 'center' | 'auto' = 'auto') => {
      if (align === 'center') return 'text-center';
      if (align === 'auto') {
        return isRTL ? '' : ''; // CSS handles this, no class needed
      }
      return align === 'left' ? (isRTL ? '' : '') : '';
    },

    /**
     * Get classes for action column cells
     */
    actionColumnClass: 'actions-column',

    /**
     * Check if current direction is RTL
     */
    isRTL,
  };
}

/**
 * Helper to conditionally apply text alignment
 * Note: CSS handles most alignment automatically, but this can be used for edge cases
 */
export function getTableTextAlign(align?: 'left' | 'right' | 'center') {
  if (align === 'center') return 'text-center';
  // CSS handles RTL/LTR automatically, so we don't need to add classes
  return '';
}
