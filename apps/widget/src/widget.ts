/**
 * Raawi X Accessibility Widget Entry Point (Vite IIFE bundle target)
 * 
 * Migrated to Shadow DOM Web Component architecture (Phase 5.1).
 * Legacy prototype preserved in widget.legacy.ts.
 */

import { AccessibilityWidget, RaawiAccessibilityWidget, StateManager, I18nManager } from './index';

// Attach helper classes to AccessibilityWidget namespace
const RaawiXNamespace = Object.assign(AccessibilityWidget, {
  RaawiAccessibilityWidget,
  StateManager,
  I18nManager,
  AccessibilityWidget,
});

export default RaawiXNamespace;
