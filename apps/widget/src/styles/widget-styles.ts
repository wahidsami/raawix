/**
 * Scoped Shadow DOM Styles for Raawi X Widget
 * 
 * Strict isolation: zero leaking into host DOM, zero global !important overrides.
 */

export const WIDGET_CSS = `
  :host {
    all: initial;
    position: fixed;
    z-index: 2147483640;
    pointer-events: none;
    font-family: 'Cairo', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1e293b;
    box-sizing: border-box;
  }

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* Design Tokens - Inclusion Shield UI */
  .raawi-theme {
    --primary: #0d9488;
    --primary-hover: #0f766e;
    --primary-light: #f0fdfa;
    --primary-focus: rgba(13, 148, 136, 0.4);
    --surface: #ffffff;
    --surface-elevated: #f8fafc;
    --border: #e2e8f0;
    --border-hover: #cbd5e1;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-muted: #64748b;
    --shadow-sm: 0 1px 2px 0 rgba(15, 23, 42, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.06);
    --shadow-lg: 0 20px 35px -8px rgba(15, 23, 42, 0.16), 0 8px 16px -4px rgba(15, 23, 42, 0.08);
    --radius-sm: 6px;
    --radius-md: 8px;
    --radius-lg: 16px;
    --radius-full: 9999px;

    /* Semantic Status Colors (Preserved) */
    --status-success: #16a34a;
    --status-warning: #f59e0b;
    --status-error: #ef4444;
    --status-info: #0284c7;
    --status-offline: #94a3b8;
  }

  /* Host Positioning Containers */
  .raawi-launcher-container {
    position: fixed;
    bottom: 24px;
    z-index: 2147483641;
    pointer-events: auto;
  }

  :host([dir="rtl"]) .raawi-launcher-container {
    right: 24px;
    left: auto;
  }

  :host([dir="ltr"]) .raawi-launcher-container {
    left: 24px;
    right: auto;
  }

  /* Launcher Button */
  .raawi-launcher-btn {
    width: 60px;
    height: 60px;
    border-radius: var(--radius-full);
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
    border: 2px solid rgba(255, 255, 255, 0.85);
    box-shadow: 0 10px 25px -5px rgba(13, 148, 136, 0.4), 0 8px 10px -6px rgba(13, 148, 136, 0.2);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, background 0.2s ease;
    outline: none;
    padding: 0;
  }

  .raawi-launcher-btn:hover {
    transform: scale(1.08);
    background: linear-gradient(135deg, var(--primary-hover) 0%, #115e59 100%);
    box-shadow: 0 14px 28px -4px rgba(13, 148, 136, 0.5), 0 10px 14px -6px rgba(13, 148, 136, 0.3);
  }

  .raawi-launcher-btn:focus-visible {
    outline: 3px solid var(--primary);
    outline-offset: 3px;
    box-shadow: 0 0 0 4px var(--primary-focus);
  }

  .raawi-launcher-btn:active {
    transform: scale(0.96);
  }

  .raawi-launcher-icon {
    width: 32px;
    height: 32px;
    display: block;
    pointer-events: none;
  }

  /* Backdrop Overlay for Modal Dialog */
  .raawi-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.35);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    z-index: 2147483641;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }

  .raawi-backdrop.open {
    opacity: 1;
    pointer-events: auto;
  }

  /* Reading Guide Ruler (Shadow DOM Contained) */
  .raawi-reading-ruler {
    position: fixed;
    left: 0;
    right: 0;
    height: 4px;
    background: #3b82f6;
    box-shadow: 0 0 12px rgba(59, 130, 246, 0.6);
    pointer-events: none !important;
    z-index: 2147483640;
    display: none;
    transition: top 0.04s ease-out;
  }

  /* Reading Focus Mask Overlays (Shadow DOM Contained) */
  .raawi-reading-mask-overlay {
    position: fixed;
    left: 0;
    right: 0;
    background: rgba(15, 23, 42, 0.65);
    pointer-events: none !important;
    z-index: 2147483640;
    display: none;
  }

  /* Panel Container */
  .raawi-panel-container {
    position: fixed;
    bottom: 96px;
    width: 390px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 120px);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg), 0 0 0 1px rgba(15, 23, 42, 0.05);
    display: none;
    flex-direction: column;
    overflow: hidden;
    z-index: 2147483642;
    pointer-events: auto;
    transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Mobile Sheet Grab Handle (Hidden on Desktop) */
  .raawi-grab-handle {
    display: none;
  }

  :host([dir="rtl"]) .raawi-panel-container {
    right: 24px;
    left: auto;
    font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
  }

  :host([dir="ltr"]) .raawi-panel-container {
    left: 24px;
    right: auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }

  .raawi-panel-container.open {
    display: flex;
    animation: raawi-fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes raawi-fade-in {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Header Topbar */
  .raawi-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    gap: 10px;
  }

  .raawi-brand-group {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
  }

  .raawi-brand-icon {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
  }

  .raawi-brand-title {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.25;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .raawi-header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  /* Language Switcher */
  .raawi-lang-switch {
    display: inline-flex;
    align-items: center;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    padding: 2px;
    box-sizing: border-box;
  }

  .raawi-lang-btn {
    border: none;
    background: transparent;
    min-height: 28px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    border-radius: var(--radius-full);
    color: var(--text-secondary);
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  /* Accessible touch target 44x44px */
  .raawi-lang-btn::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: 44px;
    min-height: 44px;
  }

  .raawi-lang-btn.active {
    background: var(--primary);
    color: #ffffff;
    box-shadow: var(--shadow-sm);
  }

  .raawi-lang-btn:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .raawi-icon-btn {
    border: 1px solid transparent;
    background: transparent;
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    border-radius: var(--radius-md);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 15px;
    transition: all 0.15s ease;
    position: relative;
  }

  /* Accessible touch target 44x44px */
  .raawi-icon-btn::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: 44px;
    min-height: 44px;
  }

  .raawi-icon-btn:hover {
    background: var(--surface-elevated);
    border-color: var(--border);
    color: var(--text-primary);
  }

  .raawi-icon-btn:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  /* Tab Bar */
  .raawi-tab-bar {
    display: flex;
    background: var(--surface-elevated);
    border-bottom: 1px solid var(--border);
    padding: 4px 6px 0;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .raawi-tab-bar::-webkit-scrollbar {
    display: none;
  }

  .raawi-tab-btn {
    flex: 1;
    border: none;
    background: transparent;
    min-height: 44px;
    padding: 8px 8px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-secondary);
    border-bottom: 2.5px solid transparent;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    text-align: center;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-top-left-radius: var(--radius-sm);
    border-top-right-radius: var(--radius-sm);
    position: relative;
  }

  .raawi-tab-icon {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    display: inline-block;
  }

  .raawi-tab-btn:hover {
    color: var(--text-primary);
    background: rgba(240, 253, 250, 0.6);
  }

  .raawi-tab-btn:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: -2px;
  }

  .raawi-tab-btn.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
    background: var(--surface);
    font-weight: 700;
  }

  /* Tab Content Body */
  .raawi-tab-body {
    padding: 16px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* Control Card */
  .raawi-control-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .raawi-control-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .raawi-control-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1;
  }

  .raawi-control-icon-wrap {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    background: #f0fdfa;
    color: var(--primary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .raawi-control-icon-wrap svg {
    width: 17px;
    height: 17px;
  }

  .raawi-control-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .raawi-control-desc {
    font-size: 11.5px;
    color: var(--text-muted);
    line-height: 1.35;
  }

  .raawi-numeric-range {
    direction: ltr;
    unicode-bidi: isolate;
    display: inline-block;
  }

  /* Badges & Page Insights */
  .raawi-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    border-radius: var(--radius-full);
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
  }

  .raawi-badge-success {
    background: #dcfce7;
    color: #15803d;
  }

  .raawi-badge-info {
    background: #e0f2fe;
    color: #0369a1;
  }

  .raawi-badge-warning {
    background: #fef3c7;
    color: #b45309;
  }

  .raawi-badge-danger {
    background: #fee2e2;
    color: #b91c1c;
  }

  .raawi-badge-neutral {
    background: #f1f5f9;
    color: #475569;
  }

  .raawi-btn-refresh {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: 1px solid var(--border);
    background: var(--surface-elevated);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .raawi-btn-refresh:hover:not(:disabled) {
    background: var(--surface);
    border-color: var(--primary);
    color: var(--primary);
  }

  .raawi-btn-refresh:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .raawi-insights-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: var(--radius-md);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .raawi-insights-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .raawi-insights-summary {
    font-size: 12px;
    color: #334155;
    line-height: 1.5;
  }

  .raawi-insights-meta {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 11px;
    color: #64748b;
  }

  /* Landmark Navigation */
  .raawi-landmarks-nav {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }

  .raawi-landmarks-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .raawi-landmark-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 160px;
    overflow-y: auto;
  }

  .raawi-landmark-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    gap: 8px;
  }

  .raawi-landmark-info {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  .raawi-landmark-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .raawi-landmark-jump-btn {
    border: none;
    background: var(--primary);
    color: #ffffff;
    border-radius: var(--radius-sm);
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
  }

  .raawi-landmark-jump-btn:hover {
    background: var(--primary-hover);
  }

  .raawi-form-guidance {
    margin-top: 6px;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    font-size: 11px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Stepper Group */
  .raawi-stepper-group {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: space-between;
  }

  .raawi-stepper-btn {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--surface-elevated);
    color: var(--text-primary);
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    position: relative;
  }

  .raawi-stepper-btn::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: 44px;
    min-height: 44px;
  }

  .raawi-stepper-btn:hover {
    background: var(--surface);
    border-color: var(--primary);
    color: var(--primary);
  }

  .raawi-stepper-btn:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .raawi-stepper-value {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--primary);
    min-width: 52px;
    text-align: center;
  }

  .raawi-stepper-progress {
    width: 100%;
    margin-top: 6px;
  }

  .raawi-progress-track {
    width: 100%;
    height: 5px;
    background: #e2e8f0;
    border-radius: var(--radius-full);
    overflow: hidden;
    position: relative;
  }

  .raawi-progress-fill {
    height: 100%;
    background: var(--primary);
    border-radius: var(--radius-full);
    transition: width 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Switch Toggle */
  .raawi-toggle {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    flex-shrink: 0;
  }

  .raawi-toggle input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .raawi-toggle-slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background-color: #cbd5e1;
    transition: 0.2s;
    border-radius: 24px;
  }

  .raawi-toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.2s;
    border-radius: 50%;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  .raawi-toggle input:checked + .raawi-toggle-slider {
    background-color: var(--primary);
  }

  .raawi-toggle input:focus-visible + .raawi-toggle-slider {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .raawi-toggle input:checked + .raawi-toggle-slider:before {
    transform: translateX(20px);
  }

  /* Accessibility Profile Cards (Presets) */
  .raawi-preset-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .raawi-preset-btn {
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    padding: 10px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    text-align: center;
    transition: all 0.15s ease;
  }

  .raawi-preset-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: start;
    padding: 12px;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface);
    gap: 4px;
  }

  :host([dir="rtl"]) .raawi-preset-card {
    text-align: right;
    align-items: flex-start;
  }

  :host([dir="ltr"]) .raawi-preset-card {
    text-align: left;
    align-items: flex-start;
  }

  .raawi-preset-btn:hover {
    border-color: var(--primary);
    color: var(--primary);
  }

  .raawi-preset-card:hover {
    border-color: var(--primary);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  .raawi-preset-btn.active {
    background: var(--primary-light);
    border-color: var(--primary);
    color: var(--primary);
  }

  .raawi-preset-card.active {
    background: var(--primary-light);
    border-color: var(--primary);
    box-shadow: 0 0 0 1px var(--primary);
  }

  .raawi-preset-icon-wrap {
    width: 30px;
    height: 30px;
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-primary);
    margin-bottom: 4px;
    flex-shrink: 0;
  }

  .raawi-preset-card.active .raawi-preset-icon-wrap {
    background: var(--primary);
    color: #ffffff;
  }

  .raawi-preset-name {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.25;
  }

  .raawi-preset-card.active .raawi-preset-name {
    color: var(--primary);
  }

  .raawi-preset-desc {
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.35;
  }

  /* Segmented Cursor Control */
  .raawi-segmented-control {
    display: inline-flex;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 3px;
    gap: 3px;
  }

  .raawi-segmented-btn {
    border: none;
    background: transparent;
    min-height: 34px;
    padding: 4px 10px;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    position: relative;
    white-space: nowrap;
  }

  .raawi-segmented-btn::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: 44px;
    min-height: 44px;
  }

  .raawi-segmented-btn:hover {
    color: var(--text-primary);
  }

  .raawi-segmented-btn.active {
    background: var(--surface);
    color: var(--primary);
    box-shadow: var(--shadow-sm);
    font-weight: 700;
  }

  .raawi-segmented-btn:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 1px;
  }

  .raawi-cursor-icon {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    display: inline-block;
  }

  /* Action Buttons */
  .raawi-action-btn {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    cursor: pointer;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.15s ease;
  }

  .raawi-action-btn:hover {
    background: var(--surface);
    border-color: var(--primary);
    color: var(--primary);
  }

  /* Panel Footer */
  .raawi-panel-footer {
    padding: 14px 18px;
    background: var(--surface-elevated);
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .raawi-disclaimer {
    font-size: 11px;
    line-height: 1.5;
    color: var(--text-muted);
    text-align: center;
  }

  .raawi-status-badge {
    align-self: center;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    color: var(--primary-hover);
    background: var(--primary-light);
    border: 1px solid rgba(13, 148, 136, 0.2);
    padding: 4px 12px;
    border-radius: var(--radius-full);
  }

  .raawi-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.25);
  }

  /* =========================================================================
     Phase 2A: Standalone TTS Read Aloud & Headings Navigator
     ========================================================================= */

  /* Subcontrol Row (Ruler thickness, Mask height, Zoom level) */
  .raawi-subcontrol-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 10px;
    margin-top: 10px;
    border-top: 1px solid var(--border);
    gap: 8px;
    flex-wrap: wrap;
  }

  .raawi-subcontrol-label {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  /* TTS Controls Row */
  .raawi-tts-controls {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .raawi-tts-btn {
    flex: 1;
    min-height: 44px;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px solid var(--border);
    background: var(--surface-elevated);
    color: var(--text-primary);
    transition: all 0.15s ease;
  }

  .raawi-tts-btn-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .raawi-tts-btn-icon svg {
    width: 100%;
    height: 100%;
  }

  .raawi-tts-btn:hover:not(:disabled) {
    background: var(--surface);
    border-color: var(--primary);
    color: var(--primary);
  }

  .raawi-tts-btn:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .raawi-tts-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .raawi-tts-btn-primary {
    background: var(--primary);
    border-color: var(--primary);
    color: #ffffff;
  }

  .raawi-tts-btn-primary:hover:not(:disabled) {
    background: var(--primary-hover);
    color: #ffffff;
  }

  .raawi-tts-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--radius-full);
    background: var(--surface-elevated);
    color: var(--text-muted);
    border: 1px solid var(--border);
  }

  .raawi-tts-status-playing {
    background: var(--primary-light);
    color: var(--primary-hover);
    border-color: rgba(13, 148, 136, 0.25);
  }

  .raawi-tts-status-paused {
    background: #fef3c7;
    color: #b45309;
    border-color: rgba(245, 158, 11, 0.25);
  }

  .raawi-tts-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--text-muted);
  }

  .raawi-tts-status-playing .raawi-tts-status-dot {
    background-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.25);
  }

  .raawi-tts-status-paused .raawi-tts-status-dot {
    background-color: #f59e0b;
    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.25);
  }

  /* TTS Options Row */
  .raawi-tts-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 10px;
    margin-top: 10px;
    border-top: 1px solid var(--border);
  }

  .raawi-tts-subrow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .raawi-tts-subrow-label {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .raawi-tts-rate-group {
    display: inline-flex;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 2px;
    gap: 2px;
  }

  .raawi-tts-rate-btn {
    border: none;
    background: transparent;
    min-height: 32px;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .raawi-tts-rate-btn:hover {
    color: var(--text-primary);
  }

  .raawi-tts-rate-btn.active {
    background: var(--primary);
    color: #ffffff;
    font-weight: 700;
    box-shadow: var(--shadow-sm);
  }

  .raawi-tts-rate-btn:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 1px;
  }

  .raawi-voice-select-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
  }

  .raawi-select-container {
    position: relative;
    width: 100%;
  }

  .raawi-select {
    width: 100%;
    min-height: 40px;
    padding: 6px 30px 6px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    color: var(--text-primary);
    font-size: 12px;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
  }

  :host([dir="rtl"]) .raawi-select {
    padding: 6px 12px 6px 30px;
  }

  .raawi-select-arrow {
    position: absolute;
    inset-inline-end: 10px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    display: flex;
    align-items: center;
    color: var(--text-muted);
  }

  .raawi-select:focus-visible {
    outline: 2px solid var(--primary);
    border-color: var(--primary);
  }

  .raawi-voice-fallback {
    font-size: 11px;
    color: var(--text-muted);
    font-style: italic;
    padding: 6px 10px;
    background: var(--surface-elevated);
    border-radius: var(--radius-sm);
    border: 1px dashed var(--border);
  }

  /* Headings Header Refresh Button */
  .raawi-btn-refresh {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: 1px solid var(--border);
    background: var(--surface-elevated);
    color: var(--text-secondary);
    border-radius: var(--radius-sm);
    padding: 5px 9px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    min-height: 32px;
    transition: all 0.15s ease;
  }

  .raawi-btn-refresh:hover {
    background: var(--surface);
    border-color: var(--primary);
    color: var(--primary);
  }

  .raawi-btn-refresh:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 1px;
  }

  /* Headings List */
  .raawi-headings-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 240px;
    overflow-y: auto;
    padding-inline-end: 2px;
  }

  .raawi-heading-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    gap: 8px;
    transition: border-color 0.15s ease;
  }

  .raawi-heading-item:hover {
    border-color: var(--primary);
  }

  .raawi-heading-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .raawi-heading-badge-1 {
    background: #ccfbf1;
    color: #0f766e;
    border: 1px solid rgba(13, 148, 136, 0.2);
  }

  .raawi-heading-badge-2 {
    background: #e0f2fe;
    color: #0369a1;
    border: 1px solid rgba(3, 105, 161, 0.2);
  }

  .raawi-heading-badge-3 {
    background: #e0e7ff;
    color: #4338ca;
    border: 1px solid rgba(67, 56, 202, 0.2);
  }

  .raawi-heading-badge-4,
  .raawi-heading-badge-5,
  .raawi-heading-badge-6 {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid rgba(71, 85, 105, 0.2);
  }

  .raawi-heading-text {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
  }

  .raawi-heading-jump-btn {
    border: none;
    background: var(--primary);
    color: #ffffff;
    border-radius: var(--radius-sm);
    min-height: 32px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
    flex-shrink: 0;
    position: relative;
  }

  .raawi-heading-jump-btn::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: 44px;
    min-height: 44px;
  }

  .raawi-heading-jump-btn:hover {
    background: var(--primary-hover);
  }

  .raawi-heading-jump-btn:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .raawi-headings-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    gap: 8px;
    background: var(--surface-elevated);
    border-radius: var(--radius-sm);
    border: 1px dashed var(--border);
    color: var(--text-muted);
    text-align: center;
  }

  .raawi-headings-empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
  }

  .raawi-headings-empty-text {
    font-size: 12px;
    line-height: 1.4;
  }

  /* Screen reader utility */
  .raawi-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  /* Phase 2C / Phase 4: Standalone Magnified Reading Strip (Inclusion Shield UI - Direction C) */
  .raawi-reading-strip {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 2147483646;
    pointer-events: auto;
    background: #0f172a;
    border-top: 3px solid var(--primary, #0d9488);
    box-shadow: 0 -6px 25px rgba(0, 0, 0, 0.35);
    display: flex;
    flex-direction: column;
    max-height: 35vh;
    min-height: 75px;
    box-sizing: border-box;
    transition: transform 0.2s ease, opacity 0.2s ease;
  }

  /* Top Docking (Collision avoidance with sticky footers/action bars) */
  .raawi-reading-strip.raawi-strip-dock-top {
    top: 0;
    bottom: auto;
    border-top: none;
    border-bottom: 3px solid var(--primary, #0d9488);
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.35);
  }

  .raawi-strip-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 16px;
    background: #1e293b;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
    gap: 8px;
  }

  .raawi-reading-strip.raawi-strip-dock-top .raawi-strip-toolbar {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .raawi-strip-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
  }

  .raawi-strip-icon {
    width: 18px;
    height: 18px;
    color: #2dd4bf;
    flex-shrink: 0;
  }

  .raawi-strip-title {
    font-size: 12.5px;
    font-weight: 700;
    color: #f8fafc;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .raawi-strip-badge {
    font-size: 11px;
    font-weight: 700;
    color: #2dd4bf;
    background: rgba(45, 212, 191, 0.12);
    border: 1px solid rgba(45, 212, 191, 0.3);
    border-radius: var(--radius-full, 9999px);
    padding: 1px 7px;
    line-height: 1.4;
    flex-shrink: 0;
  }

  .raawi-strip-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .raawi-strip-scale-group {
    display: flex;
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: var(--radius-sm, 6px);
    padding: 2px;
    gap: 2px;
  }

  .raawi-strip-scale-btn {
    border: none;
    background: transparent;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    color: #94a3b8;
    min-height: 32px;
    min-width: 44px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .raawi-strip-scale-btn:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.08);
  }

  .raawi-strip-scale-btn.active {
    background: var(--primary, #0d9488);
    color: #ffffff;
    font-weight: 700;
    box-shadow: 0 1px 4px rgba(13, 148, 136, 0.4);
  }

  .raawi-strip-scale-btn:focus-visible {
    outline: 2px solid #2dd4bf;
    outline-offset: 1px;
  }

  .raawi-strip-dock-btn,
  .raawi-strip-close-btn {
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.06);
    color: #94a3b8;
    padding: 4px;
    border-radius: var(--radius-sm, 6px);
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
    transition: all 0.15s ease;
  }

  /* 44px hit bounds for touch targets */
  .raawi-strip-dock-btn::after,
  .raawi-strip-close-btn::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: 44px;
    min-height: 44px;
  }

  .raawi-strip-action-icon {
    width: 15px;
    height: 15px;
    display: block;
    pointer-events: none;
  }

  .raawi-strip-dock-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #ffffff;
  }

  .raawi-strip-dock-btn:focus-visible {
    outline: 2px solid #2dd4bf;
    outline-offset: 1px;
  }

  .raawi-strip-close-btn:hover {
    background: #ef4444;
    border-color: #ef4444;
    color: #ffffff;
  }

  .raawi-strip-close-btn:focus-visible {
    outline: 2px solid #ef4444;
    outline-offset: 1px;
  }

  .raawi-strip-mirror {
    padding: 12px 20px 16px 20px;
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1;
    min-height: 40px;
    box-sizing: border-box;
    background: #0f172a;
    scrollbar-width: thin;
    scrollbar-color: #475569 #0f172a;
  }

  .raawi-strip-mirror::-webkit-scrollbar {
    width: 6px;
  }

  .raawi-strip-mirror::-webkit-scrollbar-track {
    background: #0f172a;
  }

  .raawi-strip-mirror::-webkit-scrollbar-thumb {
    background: #475569;
    border-radius: 3px;
  }

  .raawi-strip-text {
    color: #f8fafc;
    word-break: break-word;
    overflow-wrap: break-word;
    transition: font-size 0.15s ease;
  }

  .raawi-strip-text.raawi-scale-150 {
    font-size: 1.5rem;
    line-height: 1.55;
  }

  .raawi-strip-text.raawi-scale-200 {
    font-size: 2.0rem;
    line-height: 1.5;
  }

  .raawi-strip-text.raawi-scale-250 {
    font-size: 2.5rem;
    line-height: 1.45;
  }

  .raawi-strip-text.raawi-scale-300 {
    font-size: 3.0rem;
    line-height: 1.4;
  }

  .raawi-strip-text.fallback {
    color: #94a3b8;
    font-style: italic;
    font-size: 1.25rem !important;
    line-height: 1.5;
  }

  .raawi-strip-text.raawi-font-cairo {
    font-family: 'Cairo', 'Noto Naskh Arabic', 'Tahoma', Arial, sans-serif !important;
    letter-spacing: 0.015em;
  }

  .raawi-strip-text.raawi-font-latin {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
  }

  /* High contrast mode for reading strip */
  .raawi-strip-contrast {
    background: #000000 !important;
    border-top: 3px solid #ffff00 !important;
    box-shadow: 0 -4px 20px rgba(255, 255, 255, 0.2) !important;
  }

  .raawi-strip-contrast.raawi-strip-dock-top {
    border-top: none !important;
    border-bottom: 3px solid #ffff00 !important;
    box-shadow: 0 4px 20px rgba(255, 255, 255, 0.2) !important;
  }

  .raawi-strip-contrast .raawi-strip-toolbar,
  .raawi-strip-contrast .raawi-strip-mirror {
    background: #000000 !important;
  }

  .raawi-strip-contrast .raawi-strip-toolbar {
    border-bottom: 1px solid #ffff00 !important;
  }

  .raawi-strip-contrast .raawi-strip-brand,
  .raawi-strip-contrast .raawi-strip-title,
  .raawi-strip-contrast .raawi-strip-text {
    color: #ffffff !important;
  }

  .raawi-strip-contrast .raawi-strip-icon {
    color: #ffff00 !important;
  }

  .raawi-strip-contrast .raawi-strip-badge {
    background: #000000 !important;
    border: 1px solid #ffff00 !important;
    color: #ffff00 !important;
  }

  .raawi-strip-contrast .raawi-strip-text.fallback {
    color: #ffff00 !important;
  }

  .raawi-strip-contrast .raawi-strip-scale-group {
    background: #111111 !important;
    border: 1px solid #ffff00 !important;
  }

  .raawi-strip-contrast .raawi-strip-scale-btn {
    color: #ffffff !important;
  }

  .raawi-strip-contrast .raawi-strip-scale-btn.active {
    background: #ffff00 !important;
    color: #000000 !important;
    font-weight: 700 !important;
  }

  .raawi-strip-contrast .raawi-strip-dock-btn,
  .raawi-strip-contrast .raawi-strip-close-btn {
    border: 1px solid #ffff00 !important;
    color: #ffff00 !important;
    background: #000000 !important;
  }

  .raawi-strip-contrast .raawi-strip-dock-btn:hover,
  .raawi-strip-contrast .raawi-strip-close-btn:hover {
    background: #ffff00 !important;
    color: #000000 !important;
  }

  /* Reduced motion override for reading strip */
  .raawi-strip-reduced-motion,
  .raawi-strip-reduced-motion * {
    transition: none !important;
    animation: none !important;
  }

  /* Responsive Mobile Refinement (< 768px) */
  @media (max-width: 768px) {
    .raawi-grab-handle {
      display: block;
      width: 44px;
      height: 4px;
      border-radius: 9999px;
      background: var(--border-hover, #cbd5e1);
      margin: 8px auto 0 auto;
      flex-shrink: 0;
    }

    .raawi-panel-container {
      width: 100vw !important;
      max-width: 100vw !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      border-radius: 18px 18px 0 0 !important;
      max-height: 85vh !important;
      border-left: none !important;
      border-right: none !important;
      border-bottom: none !important;
      padding-bottom: env(safe-area-inset-bottom, 12px);
      box-shadow: 0 -8px 30px rgba(15, 23, 42, 0.25) !important;
    }

    :host([dir="rtl"]) .raawi-panel-container,
    :host([dir="ltr"]) .raawi-panel-container {
      left: 0 !important;
      right: 0 !important;
    }

    .raawi-launcher-container {
      bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    }

    :host([dir="rtl"]) .raawi-launcher-container {
      right: 16px;
    }

    :host([dir="ltr"]) .raawi-launcher-container {
      left: 16px;
    }

    .raawi-reading-strip {
      max-height: 40vh;
    }

    .raawi-strip-toolbar {
      padding: 6px 10px;
    }

    .raawi-strip-scale-btn {
      padding: 4px 6px;
      font-size: 11px;
      min-width: 38px;
    }

    .raawi-strip-text.raawi-scale-250 {
      font-size: 2.2rem;
    }

    .raawi-strip-text.raawi-scale-300 {
      font-size: 2.6rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

