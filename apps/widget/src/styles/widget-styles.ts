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

  /* TTS Options Row */
  .raawi-tts-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 6px;
    border-top: 1px solid var(--border);
  }

  .raawi-select {
    width: 100%;
    min-height: 40px;
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    color: var(--text-primary);
    font-size: 12px;
    cursor: pointer;
  }

  .raawi-select:focus-visible {
    outline: 2px solid var(--primary);
  }

  /* Headings List */
  .raawi-headings-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 220px;
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
  }

  .raawi-heading-item:hover {
    border-color: var(--border-hover);
  }

  .raawi-heading-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    background: #e0f2fe;
    color: #0369a1;
    text-transform: uppercase;
    flex-shrink: 0;
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
  }

  .raawi-heading-jump-btn:hover {
    background: var(--primary-hover);
  }

  .raawi-heading-jump-btn:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
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

  /* Phase 2C: Standalone Magnified Reading Strip */
  .raawi-reading-strip {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 2147483646;
    pointer-events: auto;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-top: 3px solid var(--primary, #0d9488);
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    max-height: 35vh;
    min-height: 75px;
    box-sizing: border-box;
    transition: transform 0.2s ease, opacity 0.2s ease;
  }

  .raawi-strip-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 14px;
    background: var(--surface-elevated, #f8fafc);
    border-bottom: 1px solid var(--border, #e2e8f0);
    flex-shrink: 0;
  }

  .raawi-strip-brand {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
  }

  .raawi-strip-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .raawi-strip-scale-group {
    display: flex;
    background: var(--border, #e2e8f0);
    border-radius: var(--radius-sm, 6px);
    padding: 2px;
    gap: 2px;
  }

  .raawi-strip-scale-btn {
    border: none;
    background: transparent;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    color: var(--text-secondary, #475569);
    transition: all 0.15s ease;
  }

  .raawi-strip-scale-btn:hover {
    color: var(--text-primary, #0f172a);
  }

  .raawi-strip-scale-btn.active {
    background: var(--primary, #0d9488);
    color: #ffffff;
  }

  .raawi-strip-scale-btn:focus-visible {
    outline: 2px solid var(--primary, #0d9488);
    outline-offset: 1px;
  }

  .raawi-strip-close-btn {
    border: none;
    background: transparent;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    color: var(--text-muted, #64748b);
    padding: 3px 8px;
    border-radius: var(--radius-sm, 6px);
    min-height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .raawi-strip-close-btn:hover {
    background: #fee2e2;
    color: #e11d48;
  }

  .raawi-strip-close-btn:focus-visible {
    outline: 2px solid #e11d48;
    outline-offset: 1px;
  }

  .raawi-strip-mirror {
    padding: 10px 18px 14px 18px;
    overflow-y: auto;
    flex: 1;
    min-height: 40px;
    box-sizing: border-box;
  }

  .raawi-strip-text {
    line-height: 1.45;
    color: var(--text-primary, #0f172a);
    word-break: break-word;
    transition: font-size 0.15s ease;
  }

  .raawi-strip-text.raawi-scale-150 {
    font-size: 1.5rem;
  }

  .raawi-strip-text.raawi-scale-200 {
    font-size: 2.0rem;
  }

  .raawi-strip-text.raawi-scale-250 {
    font-size: 2.5rem;
  }

  .raawi-strip-text.raawi-scale-300 {
    font-size: 3.0rem;
  }

  .raawi-strip-text.fallback {
    color: var(--text-muted, #64748b);
    font-style: italic;
    font-size: 1.25rem !important;
  }

  .raawi-strip-text.raawi-font-cairo {
    font-family: 'Cairo', 'Noto Naskh Arabic', 'Tahoma', Arial, sans-serif !important;
    letter-spacing: 0.015em;
  }

  .raawi-strip-text.raawi-font-latin {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
  }

  /* High contrast mode for reading strip */
  .raawi-strip-contrast {
    background: #000000 !important;
    border-top: 3px solid #ffff00 !important;
    box-shadow: 0 -4px 20px rgba(255, 255, 255, 0.2) !important;
  }

  .raawi-strip-contrast .raawi-strip-toolbar {
    background: #111111 !important;
    border-bottom: 1px solid #333333 !important;
  }

  .raawi-strip-contrast .raawi-strip-brand,
  .raawi-strip-contrast .raawi-strip-title,
  .raawi-strip-contrast .raawi-strip-text {
    color: #ffffff !important;
  }

  .raawi-strip-contrast .raawi-strip-text.fallback {
    color: #ffff00 !important;
  }

  .raawi-strip-contrast .raawi-strip-scale-group {
    background: #222222 !important;
    border: 1px solid #444444 !important;
  }

  .raawi-strip-contrast .raawi-strip-scale-btn {
    color: #ffffff !important;
  }

  .raawi-strip-contrast .raawi-strip-scale-btn.active {
    background: #ffff00 !important;
    color: #000000 !important;
    font-weight: 700 !important;
  }

  .raawi-strip-contrast .raawi-strip-close-btn {
    color: #ffff00 !important;
  }

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

  @media (max-width: 640px) {
    .raawi-reading-strip {
      max-height: 45vh;
    }

    .raawi-strip-toolbar {
      padding: 4px 8px;
    }

    .raawi-strip-scale-btn {
      padding: 2px 5px;
      font-size: 10px;
    }

    .raawi-strip-text.raawi-scale-250 {
      font-size: 2.1rem;
    }

    .raawi-strip-text.raawi-scale-300 {
      font-size: 2.4rem;
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

