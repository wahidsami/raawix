/**
 * Raawi X Accessibility Widget - Main Package Entry Point
 */

import { RaawiAccessibilityWidget, registerRaawiWidget } from './core/shadow-container';
import { StateManager } from './core/state';
import { I18nManager, translations } from './core/i18n';
import { DisplayManager } from './core/display-manager';
import { MapApiClient, evaluateMatchConfidence, type MatchConfidenceLevel, type MatchConfidenceEvaluation } from './core/api-client';
import { DomRemediator } from './core/dom-remediator';
import {
  PageTracker,
  type PageTrackerOptions,
  getHistoryRegistry,
  resetHistoryRegistryForTests,
  type RaawiHistoryRegistry,
} from './core/page-tracker';
import {
  computeSha256,
  computeLivePageFingerprint,
  evaluateFreshness,
  type FreshnessEvaluation,
  type FreshnessStatus,
} from './core/freshness-engine';
import { LandmarkNavigator, type NavigationResult, type LandmarkNavigatorOptions } from './core/landmark-navigator';
import { LiveAnnouncerComponent } from './components/live-announcer';
import type {
  Locale,
  WidgetSettings,
  WidgetContext,
  AssistiveMap,
  PagePackageResponse,
  MapFetchStatus,
  PageFingerprint,
  LandmarkItem,
  FormStepInfo,
  FormFieldInfo,
  ImageDescription,
  LabelOverride,
} from './core/types';

export {
  RaawiAccessibilityWidget,
  registerRaawiWidget,
  StateManager,
  I18nManager,
  translations,
  DisplayManager,
  MapApiClient,
  evaluateMatchConfidence,
  DomRemediator,
  PageTracker,
  getHistoryRegistry,
  resetHistoryRegistryForTests,
  LandmarkNavigator,
  computeSha256,
  computeLivePageFingerprint,
  evaluateFreshness,
  LiveAnnouncerComponent,
};

export type {
  Locale,
  WidgetSettings,
  WidgetContext,
  AssistiveMap,
  PagePackageResponse,
  MapFetchStatus,
  MatchConfidenceLevel,
  MatchConfidenceEvaluation,
  PageFingerprint,
  LandmarkItem,
  FormStepInfo,
  FormFieldInfo,
  FreshnessEvaluation,
  FreshnessStatus,
  PageTrackerOptions,
  RaawiHistoryRegistry,
  NavigationResult,
  LandmarkNavigatorOptions,
  ImageDescription,
  LabelOverride,
};

/**
 * Global Bootstrap and Initialization Manager
 */
export class AccessibilityWidget {
  private static instance: RaawiAccessibilityWidget | null = null;

  public static init(): RaawiAccessibilityWidget {
    if (typeof document === 'undefined') {
      return null as any;
    }

    // Check if custom element already mounted in document
    let existing = document.querySelector<RaawiAccessibilityWidget>(RaawiAccessibilityWidget.TAG_NAME);
    if (!existing) {
      existing = document.createElement(RaawiAccessibilityWidget.TAG_NAME) as RaawiAccessibilityWidget;
      document.body.appendChild(existing);
    }

    AccessibilityWidget.instance = existing;

    // Attach to window for legacy embed compatibility
    if (typeof window !== 'undefined') {
      (window as any).raawiAccessibilityWidget = existing;
      (window as any).RaawiXAccessibility = AccessibilityWidget;
      (window as any).AccessibilityWidget = AccessibilityWidget;
    }

    return existing;
  }

  public static getInstance(): RaawiAccessibilityWidget | null {
    return AccessibilityWidget.instance;
  }

  public static destroy(): void {
    if (AccessibilityWidget.instance) {
      AccessibilityWidget.instance.remove();
      AccessibilityWidget.instance = null;
    } else if (typeof document !== 'undefined') {
      const el = document.querySelector<RaawiAccessibilityWidget>(RaawiAccessibilityWidget.TAG_NAME);
      if (el) {
        el.remove();
      }
    }
  }
}

// Auto-initialize when script loads in browser
if (typeof window !== 'undefined') {
  const runInit = () => {
    if (!document.querySelector(RaawiAccessibilityWidget.TAG_NAME)) {
      AccessibilityWidget.init();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInit);
  } else {
    runInit();
  }
}

export default AccessibilityWidget;
