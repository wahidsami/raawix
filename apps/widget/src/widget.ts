/**
 * Raawi X Accessibility Widget
 * Provides assistive features without claiming compliance
 */

interface AccessibilitySettings {
  textSize: number; // multiplier (1.0 = 100%)
  lineSpacing: number; // multiplier (1.0 = normal)
  contrastMode: boolean;
  focusHighlight: boolean;
  readingMode: boolean;
  readingGuide: boolean; // Reading guide highlight bar
  readingMask: boolean; // Reading mask (dim except window)
  readingMaskWindowHeight: 'small' | 'medium' | 'large'; // Window height for reading mask
  hideImages: boolean; // Hide images with placeholders
  imageCaptions: boolean; // Show image captions
  stopAnimations: boolean; // Stop CSS animations and transitions
  reduceMotion: boolean; // Reduce motion (prefers-reduced-motion simulation)
  bigCursor: 'off' | 'dark' | 'light'; // Big cursor mode
  magnifier: boolean; // Magnifier lens
  magnifierZoom: number; // Magnification level (1.5 to 5.0)
  voiceMode: 'off' | 'push_to_talk' | 'hands_free'; // Voice command mode (A)
  translateLanguage: 'off' | 'ar' | 'en'; // Translation for narration
}

// Narration Engine Types
interface ReadingSegment {
  id: string;
  type: 'title' | 'summary' | 'section' | 'card' | 'form' | 'action' | 'landmark';
  text: string;
  heading?: string;
  element?: HTMLElement | null;
  priority: number; // Lower = higher priority
}

interface ReadingQueue {
  segments: ReadingSegment[];
  currentIndex: number;
  mode: 'full' | 'summary' | 'detailed-summary';
}

interface NarrationState {
  queue: ReadingQueue | null;
  isSpeaking: boolean;
  isPaused: boolean;
  isStopped: boolean;
  currentUtterance: SpeechSynthesisUtterance | null;
  rate: number; // 0.5 to 2.0
  pitch: number; // 0 to 2.0
  volume: number; // 0 to 1.0
}

// API Guidance Types (matching scanner API)
interface PageGuidance {
  url: string;
  title?: string;
  summary: string;
  landmarks: Array<{ type: string; label?: string; description?: string }>;
  formSteps: Array<{ stepNumber: number; label: string; fields: Array<{ label?: string; type?: string; required?: boolean }> }>;
  keyActions: Array<{ label: string; type: string; description?: string; selector?: string }>;
  // Match metadata
  matchedUrl?: string;
  matchConfidence?: 'high' | 'medium' | 'low';
  scanTimestamp?: {
    startedAt?: string;
    completedAt?: string;
  };
  pageFingerprint?: {
    title?: string;
    firstHeading?: string;
    mainTextHash?: string;
  };
}

interface PageIssues {
  url: string;
  issues: Array<{ title: string; severity: string; description: string }>;
  // Match metadata
  matchedUrl?: string;
  matchConfidence?: 'high' | 'medium' | 'low';
  scanTimestamp?: {
    startedAt?: string;
    completedAt?: string;
  };
  pageFingerprint?: {
    title?: string;
    firstHeading?: string;
    mainTextHash?: string;
  };
}

// Page Package (Third Layer - single fetch)
interface PagePackage {
  siteId: string | null;
  url: string;
  matchedUrl: string;
  matchConfidence: 'high' | 'medium' | 'low';
  generatedAt: string | null;
  fingerprint: {
    title?: string;
    firstHeading?: string;
    mainTextHash?: string;
  } | null;
  assistiveMap: {
    labelOverrides: Record<string, { selector: string; label: string; confidence: string; source: string }>;
    imageDescriptions: Record<string, { selector: string; alt: string; confidence: string; source: string }>;
    actionIntents: Record<string, { selector: string; intent: string; description: string; confidence: string; source: string }>;
    forms?: Array<{ // Form Assist Plan from scanner (new)
      formId: string;
      stepIndex?: number;
      stepTitle?: { en?: string; ar?: string };
      scopeSelector?: string;
      fields: Array<{
        key: string;
        selector: string;
        tag: 'input' | 'select' | 'textarea' | 'button';
        inputType?: string;
        role?: string;
        required: boolean;
        disabled?: boolean;
        label: { en?: string; ar?: string };
        labelSource: 'dom' | 'aria' | 'vision' | 'gemini' | 'override';
        hint?: { en?: string; ar?: string };
        validation?: { pattern?: string; min?: number; max?: number; minLength?: number; maxLength?: number };
      }>;
      uploads: Array<{
        key: string;
        selector: string;
        required?: boolean;
        label: { en?: string; ar?: string };
        acceptedTypes?: string;
        hint?: { en?: string; ar?: string };
      }>;
      actions: Array<{
        key: string;
        selector: string;
        type: 'next' | 'back' | 'save' | 'submit' | 'login' | 'verify';
        label: { en?: string; ar?: string };
        intent?: { en?: string; ar?: string };
      }>;
    }>;
  } | null;
  semanticModel?: Record<string, unknown> | null;
  confidenceSummary: {
    labelOverrides: { high: number; medium: number; low: number };
    imageDescriptions: { high: number; medium: number; low: number };
    actionIntents: { high: number; medium: number; low: number };
  } | null;
  guidance: {
    summary: string;
    landmarks: Array<{ type: string; label?: string; description?: string }>;
    formSteps: Array<{ stepNumber: number; label: string; fields: Array<{ label?: string; type?: string; required?: boolean }> }>;
    keyActions: Array<{ label: string; type: string; description?: string; selector?: string }>;
  } | null;
  issuesSummary: {
    total: number;
    critical: number;
    important: number;
  };
  scanTimestamp: {
    startedAt?: string;
    completedAt?: string;
  } | null;
}

// Form Snapshot Types
interface FormField {
  selector: string;
  inputType: string;
  required: boolean;
  currentValueEmpty: boolean;
  label: string;
  element: HTMLElement | null;
  hint?: string; // From scan plan
  stepTitle?: string; // From scan plan (for voice guidance)
  stepIndex?: number; // From scan plan
  validation?: { // Optional validation info
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

interface FormUpload {
  selector: string;
  label: string;
  context: string;
  element: HTMLInputElement | null;
  acceptedTypes?: string; // From scan plan
  hint?: string; // From scan plan (for voice guidance)
}

interface FormSubmitButton {
  selector: string;
  label: string;
  element: HTMLElement | null;
  actionType?: 'next' | 'back' | 'save' | 'submit' | 'login' | 'verify'; // From scan plan
  intent?: string; // From scan plan (for voice guidance)
}

interface FormSnapshot {
  formElement: HTMLFormElement | null;
  fields: FormField[];
  uploads: FormUpload[];
  submitButtons: FormSubmitButton[];
  totalRequiredFields: number;
  totalRequiredFieldsRemaining: number;
  totalUploads: number;
  formPlans?: Array<any>; // Store original form plans for step titles
}

// WidgetContext - Single source of truth (A)
interface WidgetContext {
  locale: 'en' | 'ar';
  direction: 'ltr' | 'rtl';
  voiceLang: 'en-US' | 'ar-SA';
  theme: 'green';
}

class AccessibilityWidget {
  private settings: AccessibilitySettings = {
    textSize: 1.0,
    lineSpacing: 1.0,
    contrastMode: false,
    focusHighlight: false,
    readingMode: false,
    readingGuide: false,
    readingMask: false,
    readingMaskWindowHeight: 'medium',
    hideImages: false,
    imageCaptions: false,
    stopAnimations: false,
    reduceMotion: false,
    bigCursor: 'off',
    magnifier: false,
    magnifierZoom: 2.0,
    voiceMode: 'push_to_talk', // Default: push_to_talk (A)
    translateLanguage: 'off',
  };

  // WidgetContext - Single source of truth (A)
  private context: WidgetContext = {
    locale: 'en',
    direction: 'ltr',
    voiceLang: 'en-US',
    theme: 'green',
  };

  private currentTab: 'assist' | 'vision' | 'reading' | 'tools' = 'assist';
  private currentPreset: 'none' | 'blind' | 'low-vision' | 'dyslexia' = 'none';

  private button: HTMLElement | null = null;
  private panel: HTMLElement | null = null;
  private isOpen = false;
  private styleElement: HTMLStyleElement | null = null;
  private readingGuideElement: HTMLElement | null = null;
  private readingGuideThrottle: number | null = null;
  private readingMaskTopOverlay: HTMLElement | null = null;
  private readingMaskBottomOverlay: HTMLElement | null = null;
  private readingMaskThrottle: number | null = null;
  private stopAnimationsStyleElement: HTMLStyleElement | null = null;
  private reduceMotionStyleElement: HTMLStyleElement | null = null;
  private bigCursorStyleElement: HTMLStyleElement | null = null;
  private magnifierElement: HTMLDivElement | null = null;
  private magnifierCanvas: HTMLCanvasElement | null = null;
  private magnifierThrottle: number | null = null;
  private hiddenImages: Map<HTMLImageElement, { original: HTMLImageElement; placeholder: HTMLElement }> = new Map();
  private imageCaptionElements: Map<HTMLImageElement, HTMLElement> = new Map();
  
  // Voice mode
  private voiceEnabled: boolean = false;
  private recognition: any = null; // SpeechRecognition
  private synthesis: SpeechSynthesis | null = null;
  private isListening: boolean = false;
  private isWakeOnlyMode: boolean = false; // Wake-only mode for hands_free (B)
  private isActiveListening: boolean = false; // Active command listening after wake (B)
  private activeListeningTimeout: number | null = null; // Timeout for active listening (B)
  private micPermissionGranted: boolean = false; // Mic permission status (C)
  private transcript: string = '';
  private currentActionIndex: number = -1;
  private availableActions: Array<{ label: string; description: string; element: HTMLElement | null }> = [];
  private apiUrl: string = '';
  private scanId: string = '';

  // Narration Engine
  private narrationState: NarrationState = {
    queue: null,
    isSpeaking: false,
    isPaused: false,
    isStopped: false,
    currentUtterance: null,
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  };
  private cachedGuidance: PageGuidance | null = null;
  private cachedIssues: PageIssues | null = null;
  private cachedPagePackage: PagePackage | null = null; // Third Layer - single fetch
  private cachedSemanticModel: Record<string, unknown> | null = null;
  private semanticMode: boolean = false;
  private temporaryActions: Array<{ label: string; description: string; contextTitle?: string; selector?: string; element?: HTMLElement | null }> = []; // For "go to action" command
  
  // Form Assistant state
  private formSnapshot: FormSnapshot | null = null;
  private formAssistantActive: boolean = false;
  private formAssistantState: 'idle' | 'form_detected' | 'collecting_field_value' | 'upload_pending' | 'review' | 'submit_confirm' | 'stopped' = 'idle';
  private currentFieldIndex: number = -1;
  private formObserver: MutationObserver | null = null;
  private routeChangeObserver: MutationObserver | null = null;
  private pendingFileUpload: { element: HTMLInputElement; index: number } | null = null;
  private najizMode: boolean = false; // Login/SSO assist mode
  private loginAssistActive: boolean = false; // Login Assist is active (B)
  private authFlowDetection: { isAuthFlow: boolean; authType: 'nafath' | 'sso' | 'login' | 'unknown'; confidence: 'high' | 'medium' | 'low' } | null = null; // A
  private pendingConfirmation: { type: 'submit' | 'sensitive_field'; value?: string } | null = null;
  private lastSpokenValue: string = ''; // For double confirmation
  private e2eMode: boolean = false; // D: E2E test mode
  private e2eSpokenLog: string[] = []; // D: Log of spoken text in E2E mode

  constructor() {
    // Check feature flag - default false, enable via window.VOICE_ENABLED = true
    // Check both at construction time and allow dynamic check later
    this.voiceEnabled = (window as any).VOICE_ENABLED === true;
    this.init();
  }

  private init(): void {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.createWidget());
    } else {
      this.createWidget();
    }
  }

  private createWidget(): void {
    // D: Check for E2E mode (?e2e=1)
    const urlParams = new URLSearchParams(window.location.search);
    this.e2eMode = urlParams.get('e2e') === '1';
    if (this.e2eMode) {
      (window as any).__RAAWI_E2E__ = true;
      this.setupE2EMode();
    }

    // Re-check feature flag in case it was set after constructor
    if (!this.voiceEnabled) {
      this.voiceEnabled = (window as any).VOICE_ENABLED === true;
    }

    // Get API configuration
    this.apiUrl = (window as any).RAWI_API_URL || '';
    this.scanId = (window as any).RAWI_SCAN_ID || 'latest';
    this.semanticMode = (window as any).RAAWI_WIDGET_MODE === 'semantic';

    // Inject CSS
    this.injectStyles();

    // Create floating button
    this.createButton();

    // Create panel
    this.createPanel();

    // A: Load voice mode from localStorage (only if user opted in)
    this.loadVoiceModeFromStorage();

    // Initialize voice mode if enabled
    if (this.voiceEnabled) {
      this.initVoiceMode();
      // Pre-fetch page package if API is configured (single fetch for Third Layer)
      if (this.apiUrl) {
        this.fetchPagePackageAsync();
      }
      
      // B: Start wake-only mode if hands_free
      if (this.settings.voiceMode === 'hands_free' && this.micPermissionGranted) {
        setTimeout(() => {
          this.startWakeOnlyMode();
        }, 1000);
      }
    }

    // Detect forms on page load
    this.detectForms();

    // A: Detect auth flow on page load
    this.authFlowDetection = this.detectAuthFlow();
    this.updateLoginAssistUI();

    // Watch for route changes (SPA navigation)
    this.setupRouteChangeObserver();

    // Apply initial settings
    this.applySettings();

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.destroyReadingGuide();
      this.destroyReadingMask();
    });
  }

  private injectStyles(): void {
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'raawi-accessibility-styles';
    
    // Add Cairo font for Arabic (D)
    const cairoFontLink = document.createElement('link');
    cairoFontLink.rel = 'stylesheet';
    cairoFontLink.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap';
    document.head.appendChild(cairoFontLink);
    
    // Add Inter font for English (D)
    const interFontLink = document.createElement('link');
    interFontLink.rel = 'stylesheet';
    interFontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(interFontLink);
    
    this.styleElement.textContent = `
      /* Floating Button - Position based on direction (C) */
      .raawi-accessibility-button {
        position: fixed;
        bottom: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: #4CAF50; /* Raawi green (D) */
        color: white;
        border: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        cursor: pointer;
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: transform 0.2s, box-shadow 0.2s, background-color 0.2s;
      }
      /* LTR: button on left */
      .raawi-accessibility-button[data-direction="ltr"] {
        left: 20px;
        right: auto;
      }
      /* RTL: button on right */
      .raawi-accessibility-button[data-direction="rtl"] {
        right: 20px;
        left: auto;
      }
      .raawi-accessibility-button .raawi-icon {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 50%;
        display: block;
      }
      .raawi-accessibility-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
        background: #45a049; /* Darker green on hover (D) */
      }
      .raawi-accessibility-button:focus {
        outline: 3px solid #4CAF50;
        outline-offset: 2px;
        box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
      }
      .raawi-accessibility-button:active {
        transform: scale(0.95);
        background: #3d8b40; /* Even darker on active (D) */
      }

      /* Panel - Position based on direction (C) */
      .raawi-accessibility-panel {
        position: fixed;
        bottom: 90px;
        width: 380px;
        max-width: calc(100vw - 40px);
        max-height: calc(100vh - 120px);
        background: white;
        border: 2px solid #4CAF50; /* Raawi green border (D) */
        border-radius: 12px; /* More rounded (D) */
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        z-index: 9999;
        display: none;
        flex-direction: column;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; /* Inter for English (D) */
        overflow: hidden;
      }
      /* LTR: panel on left */
      .raawi-accessibility-panel[dir="ltr"] {
        left: 20px;
        right: auto;
      }
      /* RTL: panel on right */
      .raawi-accessibility-panel[dir="rtl"] {
        right: 20px;
        left: auto;
        font-family: 'Cairo', 'Segoe UI', 'Tahoma', 'Arial', sans-serif; /* Cairo for Arabic (D) */
      }
      .raawi-accessibility-panel.open {
        display: flex;
        animation: slideIn 0.3s ease-out;
      }
      
      /* D2: Panel slide animation based on direction */
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* D2: RTL panel slides from right */
      .raawi-accessibility-panel[dir="rtl"].open {
        animation: slideInRTL 0.3s ease-out;
      }
      
      @keyframes slideInRTL {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      /* D2: LTR panel slides from left */
      .raawi-accessibility-panel[dir="ltr"].open {
        animation: slideInLTR 0.3s ease-out;
      }
      
      @keyframes slideInLTR {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      /* RTL font inheritance */
      .raawi-accessibility-panel[dir="rtl"] * {
        font-family: 'Cairo', 'Segoe UI', 'Tahoma', 'Arial', sans-serif;
      }

      /* Top Bar */
      .raawi-panel-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 2px solid #e0e0e0;
        background: #f8f9fa;
        flex-shrink: 0;
      }

      .raawi-panel-topbar[dir="rtl"] {
        flex-direction: row-reverse;
      }

      .raawi-topbar-left {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }

      .raawi-topbar-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .raawi-lang-toggle {
        display: flex;
        border: 1px solid #ccc;
        border-radius: 4px;
        overflow: hidden;
        background: white;
      }

      .raawi-lang-toggle button {
        padding: 4px 10px;
        border: none;
        background: white;
        color: #2c3e50;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        transition: background 0.2s;
      }

      .raawi-lang-toggle button:hover {
        background: #f0f0f0;
      }

      .raawi-lang-toggle button.active {
        background: #3498db;
        color: white;
      }

      .raawi-lang-toggle button:focus {
        outline: 2px solid #2c3e50;
        outline-offset: -2px;
      }

      .raawi-voice-controls {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .raawi-voice-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ccc;
        transition: background 0.2s;
      }

      .raawi-voice-indicator.active {
        background: #27ae60;
        animation: pulse-dot 1.5s infinite;
      }

      @keyframes pulse-dot {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .raawi-quick-actions {
        display: flex;
        gap: 4px;
      }

      .raawi-quick-action-btn {
        padding: 4px 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: white;
        color: #2c3e50;
        cursor: pointer;
        font-size: 11px;
        transition: background 0.2s;
      }

      .raawi-quick-action-btn:hover {
        background: #f0f0f0;
      }

      .raawi-quick-action-btn:focus {
        outline: 2px solid #2c3e50;
        outline-offset: -2px;
      }

      /* Tabs */
      .raawi-panel-tabs {
        display: flex;
        border-bottom: 2px solid #e0e0e0;
        background: #f8f9fa;
        flex-shrink: 0;
      }

      .raawi-panel-tabs[dir="rtl"] {
        flex-direction: row-reverse;
      }

      .raawi-tab {
        flex: 1;
        padding: 12px 16px;
        border: none;
        background: transparent;
        color: #666;
        cursor: pointer;
        font-weight: 500;
        transition: color 0.2s, background 0.2s;
        border-bottom: 3px solid transparent;
        font-size: 13px;
        text-align: center;
      }

      .raawi-tab:hover {
        background: rgba(76, 175, 80, 0.08); /* Light green hover (C1) */
        color: #45a049;
      }

      .raawi-tab.active {
        color: #4CAF50; /* Raawi green (C1) */
        border-bottom-color: #4CAF50; /* Raawi green (C1) */
        background: rgba(76, 175, 80, 0.05); /* Light green background */
        font-weight: 600;
      }
      
      .raawi-tab:focus {
        outline: 2px solid #4CAF50; /* Raawi green focus ring (C4) */
        outline-offset: -2px;
      }

      .raawi-tab:focus {
        outline: 2px solid #2c3e50;
        outline-offset: -2px;
      }

      /* Tab Content */
      .raawi-tab-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: none;
      }

      .raawi-tab-content.active {
        display: block;
      }

      .raawi-accessibility-panel h2 {
        margin: 0 0 20px 0;
        font-size: 1.5em;
        color: #2c3e50;
      }

      .raawi-accessibility-control {
        margin-bottom: 20px;
      }

      .raawi-accessibility-control label,
      .raawi-accessibility-control .raawi-accessibility-label {
        display: block;
        margin-bottom: 8px;
        font-weight: bold;
        color: #2c3e50;
      }

      .raawi-accessibility-control-group {
        display: flex;
        gap: 10px;
        align-items: center;
      }

      /* Tool Card Styling (E, D) */
      .raawi-tool-card {
        margin-bottom: 16px;
        padding: 16px;
        background: #f8f9fa;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        transition: border-color 0.2s, background 0.2s;
      }
      .raawi-tool-card:has(button:disabled),
      .raawi-tool-card-disabled {
        opacity: 0.6;
        border-color: #ccc;
        background: #f5f5f5;
      }
      .raawi-tool-card-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 12px;
      }
      .raawi-tool-icon {
        font-size: 1.5em;
        line-height: 1;
        flex-shrink: 0;
      }
      .raawi-tool-title-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
      }
      .raawi-tool-label {
        font-weight: 600;
        color: #2c3e50;
        font-size: 1em;
      }
      .raawi-tool-subtitle {
        font-size: 0.85em;
        color: #666;
        font-weight: 400;
      }
      .raawi-tool-message {
        font-size: 0.9em;
        color: #666;
        padding: 8px;
        background: #f0f0f0;
        border-radius: 4px;
        margin-bottom: 8px;
      }
      /* Auth Banner (B2) */
      .raawi-auth-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 6px;
        margin-bottom: 12px;
        font-size: 0.9em;
        color: #856404;
      }
      .raawi-auth-banner-icon {
        font-size: 1.2em;
        flex-shrink: 0;
      }
      .raawi-auth-banner-text {
        flex: 1;
      }
      .raawi-active-badge {
        font-size: 0.75em;
        background: #4CAF50;
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-weight: 500;
        margin-inline-start: auto;
      }
      .raawi-tool-card-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .raawi-tool-status {
        font-size: 0.85em;
        color: #666;
        margin-top: 4px;
      }
      .raawi-accessibility-button-small:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: #ccc;
        border-color: #ccc;
      }
      .raawi-accessibility-button-small:disabled:hover {
        transform: none;
        background: #ccc;
      }

      .raawi-accessibility-button-small {
        padding: 10px 20px;
        background: #4CAF50; /* Raawi green (D) */
        color: white;
        border: 2px solid #4CAF50;
        border-radius: 8px; /* Rounded (D) */
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: background 0.2s, border-color 0.2s, transform 0.1s;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .raawi-accessibility-select {
        width: 100%;
        padding: 8px 12px;
        border: 2px solid #3498db;
        border-radius: 4px;
        font-size: 14px;
        background: white;
        color: #2c3e50;
        cursor: pointer;
        transition: border-color 0.2s;
      }
      .raawi-accessibility-select:hover,
      .raawi-accessibility-select:focus {
        border-color: #2980b9;
        outline: 2px solid #3498db;
        outline-offset: 2px;
      }
      input[type="range"] {
        width: 100%;
        height: 8px;
        border-radius: 4px;
        background: #e0e0e0;
        outline: none;
        -webkit-appearance: none;
        appearance: none;
      }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #3498db;
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      input[type="range"]::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #3498db;
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      input[type="range"]:focus {
        outline: 2px solid #2c3e50;
        outline-offset: 2px;
      }
      .raawi-accessibility-button-small:hover {
        background: #45a049; /* Darker green on hover (D) */
        border-color: #45a049;
        transform: translateY(-1px);
      }
      .raawi-accessibility-button-small:focus {
        outline: 2px solid #4CAF50;
        outline-offset: 2px;
        background: #45a049;
      }
      .raawi-accessibility-button-small:active {
        transform: translateY(0);
        background: #3d8b40; /* Even darker on active (D) */
      }

      .raawi-accessibility-toggle {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 26px;
      }

      .raawi-accessibility-toggle input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .raawi-accessibility-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: 0.3s;
        border-radius: 26px;
      }

      .raawi-accessibility-slider:before {
        position: absolute;
        content: "";
        height: 20px;
        width: 20px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
      }

      .raawi-accessibility-toggle input:checked + .raawi-accessibility-slider {
        background-color: #4CAF50; /* Raawi green (C1) */
      }

      .raawi-accessibility-toggle input:focus + .raawi-accessibility-slider {
        outline: 2px solid #4CAF50; /* Raawi green focus ring (C4) */
        outline-offset: 2px;
      }

      .raawi-accessibility-toggle input:checked + .raawi-accessibility-slider:before {
        transform: translateX(24px);
      }

      .raawi-accessibility-value {
        min-width: 50px;
        text-align: center;
        font-weight: bold;
        color: #2c3e50;
      }

      /* Applied Styles */
      :root {
        --raawi-text-size: 1;
        --raawi-line-spacing: 1;
        --raawi-contrast-mode: 0;
        --raawi-focus-highlight: 0;
        --raawi-reading-mode: 0;
      }

      html[data-raawi-text-size] {
        font-size: calc(1em * var(--raawi-text-size)) !important;
      }

      html[data-raawi-text-size] body,
      html[data-raawi-text-size] body * {
        font-size: inherit !important;
      }

      html[data-raawi-line-spacing] * {
        line-height: calc(1.5 * var(--raawi-line-spacing)) !important;
      }

      html[data-raawi-contrast-mode="true"] {
        --raawi-contrast-bg: #000000;
        --raawi-contrast-text: #ffffff;
        --raawi-contrast-link: #ffff00;
      }

      html[data-raawi-contrast-mode="true"] body {
        background: var(--raawi-contrast-bg) !important;
        color: var(--raawi-contrast-text) !important;
      }

      html[data-raawi-contrast-mode="true"] a {
        color: var(--raawi-contrast-link) !important;
      }

      html[data-raawi-focus-highlight="true"] *:focus-visible {
        outline: 4px solid #ff0000 !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 2px #ffffff, 0 0 0 6px #ff0000 !important;
      }

      /* Reading mode - hide common clutter */
      html[data-raawi-reading-mode="true"] nav:not(form nav):not([role="form"] nav),
      html[data-raawi-reading-mode="true"] aside:not(form aside):not([role="form"] aside),
      html[data-raawi-reading-mode="true"] footer:not(form footer):not([role="form"] footer),
      html[data-raawi-reading-mode="true"] [role="navigation"]:not(form [role="navigation"]):not([role="form"] [role="navigation"]),
      html[data-raawi-reading-mode="true"] [role="complementary"]:not(form [role="complementary"]):not([role="form"] [role="complementary"]),
      html[data-raawi-reading-mode="true"] [role="banner"]:not(header):not(form [role="banner"]):not([role="form"] [role="banner"]),
      html[data-raawi-reading-mode="true"] .ad:not(form .ad):not([role="form"] .ad),
      html[data-raawi-reading-mode="true"] .ads:not(form .ads):not([role="form"] .ads),
      html[data-raawi-reading-mode="true"] .advertisement:not(form .advertisement):not([role="form"] .advertisement),
      html[data-raawi-reading-mode="true"] [class*="ad-"]:not(form [class*="ad-"]):not([role="form"] [class*="ad-"]):not([class*="address"]):not([class*="admin"]),
      html[data-raawi-reading-mode="true"] [id*="ad-"]:not(form [id*="ad-"]):not([role="form"] [id*="ad-"]):not([id*="address"]):not([id*="admin"]),
      html[data-raawi-reading-mode="true"] [class*="banner"]:not([role="banner"]):not(form [class*="banner"]):not([role="form"] [class*="banner"]),
      html[data-raawi-reading-mode="true"] [id*="banner"]:not([role="banner"]):not(form [id*="banner"]):not([role="form"] [id*="banner"]) {
        display: none !important;
      }

      /* Always keep forms and their children visible */
      html[data-raawi-reading-mode="true"] form,
      html[data-raawi-reading-mode="true"] [role="form"],
      html[data-raawi-reading-mode="true"] form *,
      html[data-raawi-reading-mode="true"] [role="form"] * {
        display: revert !important;
      }

      /* Voice Mode Styles */
      .raawi-voice-transcript {
        background: #f5f5f5;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 8px;
        min-height: 60px;
        max-height: 120px;
        overflow-y: auto;
        font-size: 0.9em;
        color: #333;
      }

      .raawi-voice-mic-button {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: #e74c3c;
        color: white;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        transition: transform 0.2s, background 0.2s;
      }

      .raawi-voice-mic-button:hover,
      .raawi-voice-mic-button:focus {
        transform: scale(1.1);
        outline: 3px solid #2c3e50;
        outline-offset: 2px;
      }

      .raawi-voice-mic-button.listening {
        background: #27ae60;
        animation: pulse 1.5s infinite;
      }

      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      .raawi-voice-command-help {
        background: #e8f4f8;
        border: 1px solid #3498db;
        border-radius: 4px;
        padding: 12px;
        margin-top: 10px;
        font-size: 0.85em;
      }

      .raawi-voice-command-help h3 {
        margin: 0 0 8px 0;
        font-size: 1em;
        color: #2c3e50;
      }

      .raawi-voice-command-help ul {
        margin: 0;
        padding-left: 20px;
      }

      .raawi-voice-command-help li {
        margin-bottom: 4px;
      }

      /* Reading Guide */
      .raawi-reading-guide {
        position: fixed;
        left: 0;
        right: 0;
        height: 3px;
        background: rgba(52, 152, 219, 0.4);
        pointer-events: none;
        z-index: 9997;
        transition: top 0.1s ease-out;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .raawi-reading-guide[dir="rtl"] {
        left: 0;
        right: 0;
      }

      /* Reading Mask */
      .raawi-reading-mask-overlay {
        position: fixed;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.7);
        pointer-events: none;
        z-index: 9996;
        transition: height 0.2s ease-out, top 0.1s ease-out;
      }

      .raawi-reading-mask-overlay-top {
        top: 0;
      }

      .raawi-reading-mask-overlay-bottom {
        bottom: 0;
      }

      .raawi-mask-height-btn.active {
        background: #27ae60 !important;
        border-color: #27ae60 !important;
      }
    `;
    document.head.appendChild(this.styleElement);
  }

  private createButton(): void {
    this.button = document.createElement('button');
    this.button.className = 'raawi-accessibility-button';
    this.button.setAttribute('data-direction', this.context.direction); // Set direction (C)
    this.button.setAttribute('data-testid', 'raawi-launcher'); // C: E2E test selector
    this.button.setAttribute('aria-label', 'Open accessibility options');
    this.button.setAttribute('aria-expanded', 'false');
    this.button.setAttribute('aria-controls', 'raawi-accessibility-panel');
    
    // Create icon image element
    const iconImg = document.createElement('img');
    const iconUrl = this.getIconDataUrl();
    if (iconUrl) {
      iconImg.src = iconUrl;
      iconImg.alt = '';
      iconImg.className = 'raawi-icon';
      iconImg.setAttribute('aria-hidden', 'true');
      iconImg.style.pointerEvents = 'none'; // Prevent icon from intercepting clicks
      iconImg.onerror = () => {
        // Fallback to text if image fails to load
        iconImg.style.display = 'none';
        if (this.button) {
          this.button.textContent = 'A';
          this.button.style.fontSize = '24px';
          this.button.style.fontWeight = 'bold';
        }
      };
      this.button.appendChild(iconImg);
    } else {
      // Fallback to text if no icon URL
      this.button.textContent = 'A';
      this.button.style.fontSize = '24px';
      this.button.style.fontWeight = 'bold';
    }
    
    this.button.addEventListener('click', () => this.togglePanel());
    this.button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.togglePanel();
      }
    });
    document.body.appendChild(this.button);
  }

  /**
   * Get icon data URL - can be overridden by setting window.RAWI_ICON_DATA_URL
   * Icon can be loaded from URL or provided as data URL
   */
  private getIconDataUrl(): string {
    // Check if icon data URL is provided via window variable (for runtime override)
    if ((window as any).RAWI_ICON_DATA_URL) {
      return (window as any).RAWI_ICON_DATA_URL;
    }
    
    // PRIORITY 1: Load from Raawi X API server (if API URL is configured)
    if (this.apiUrl) {
      // Remove trailing slash if present
      const apiBase = this.apiUrl.replace(/\/$/, '');
      return `${apiBase}/api/widget/icon`;
    }
    
    // PRIORITY 2: Try to load from common local paths (for development/testing)
    // Icon should be served from the same origin as the widget
    const iconPaths = [
      '/RaawixIcon.png',
      '/widget/RaawixIcon.png',
      '/assets/RaawixIcon.png',
      './RaawixIcon.png'
    ];
    
    // Return first path - browser will try to load it
    // If it fails, the onerror handler will show fallback 'A'
    return iconPaths[0];
  }

  private createPanel(): void {
    this.panel = document.createElement('div');
    this.panel.id = 'raawi-accessibility-panel';
    this.panel.className = 'raawi-accessibility-panel';
    this.panel.setAttribute('data-testid', 'raawi-panel'); // C: E2E test selector
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-labelledby', 'raawi-accessibility-title');
    this.panel.setAttribute('aria-modal', 'false'); // Don't trap focus
    this.updatePanelDirection();

    // Translations
    const t = this.getTranslations();

    this.panel.innerHTML = `
      <!-- Top Bar -->
      <div class="raawi-panel-topbar">
        <div class="raawi-topbar-left">
          <div class="raawi-lang-toggle">
            <button id="raawi-lang-en" class="active" data-testid="raawi-lang-switch" aria-label="English">EN</button>
            <button id="raawi-lang-ar" data-testid="raawi-lang-switch" aria-label="Arabic">العربية</button>
          </div>
        </div>
        <div class="raawi-topbar-right">
          ${this.voiceEnabled ? `
          <div class="raawi-voice-controls">
            <div class="raawi-voice-indicator" id="raawi-voice-indicator" aria-label="Voice status"></div>
            <button class="raawi-quick-action-btn" id="raawi-quick-voice-toggle" aria-label="${t.voiceMode}">🎤</button>
          </div>
          ` : ''}
          <div class="raawi-quick-actions">
            <button class="raawi-quick-action-btn" id="raawi-quick-reset" aria-label="${t.resetAll}">↻</button>
            <button class="raawi-quick-action-btn" id="raawi-quick-close" data-testid="raawi-close" aria-label="${t.close}">×</button>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="raawi-panel-tabs" role="tablist">
        <button class="raawi-tab active" data-tab="assist" data-testid="raawi-tab-assist" role="tab" aria-selected="true" aria-controls="raawi-tab-assist">${t.assist}</button>
        <button class="raawi-tab" data-tab="vision" data-testid="raawi-tab-vision" role="tab" aria-selected="false" aria-controls="raawi-tab-vision">${t.vision}</button>
        <button class="raawi-tab" data-tab="reading" data-testid="raawi-tab-reading" role="tab" aria-selected="false" aria-controls="raawi-tab-reading">${t.reading}</button>
        <button class="raawi-tab" data-tab="tools" data-testid="raawi-tab-tools" role="tab" aria-selected="false" aria-controls="raawi-tab-tools">${t.tools}</button>
      </div>

      <!-- Tab Content: Assist -->
      <div id="raawi-tab-assist" class="raawi-tab-content active" role="tabpanel">
        <h2 id="raawi-accessibility-title">${t.accessibilityOptions}</h2>
        
        <!-- Presets Section -->
        <div class="raawi-accessibility-control">
          <span class="raawi-accessibility-label">${t.presets}</span>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
            <button class="raawi-accessibility-button-small raawi-preset-btn" data-preset="blind" data-testid="raawi-preset-blind" style="width: 100%; text-align: start; justify-content: flex-start;">
              ${t.presetBlind}
            </button>
            <button class="raawi-accessibility-button-small raawi-preset-btn" data-preset="low-vision" data-testid="raawi-preset-lowvision" style="width: 100%; text-align: start; justify-content: flex-start;">
              ${t.presetLowVision}
            </button>
            <button class="raawi-accessibility-button-small raawi-preset-btn" data-preset="dyslexia" data-testid="raawi-preset-dyslexia" style="width: 100%; text-align: start; justify-content: flex-start;">
              ${t.presetDyslexia}
            </button>
            <button class="raawi-accessibility-button-small raawi-preset-btn" data-preset="none" style="width: 100%; text-align: start; justify-content: flex-start; background: #95a5a6; border-color: #95a5a6;">
              ${t.presetNone}
            </button>
          </div>
        </div>

        <div class="raawi-accessibility-control">
          <span class="raawi-accessibility-label">${t.textSize}</span>
          <div class="raawi-accessibility-control-group">
            <button class="raawi-accessibility-button-small" id="raawi-text-decrease" aria-label="${t.decreaseTextSize}">-</button>
            <span class="raawi-accessibility-value" id="raawi-text-size-value" aria-live="polite">100%</span>
            <button class="raawi-accessibility-button-small" id="raawi-text-increase" aria-label="${t.increaseTextSize}">+</button>
          </div>
        </div>

        <div class="raawi-accessibility-control">
          <span class="raawi-accessibility-label">${t.lineSpacing}</span>
          <div class="raawi-accessibility-control-group">
            <button class="raawi-accessibility-button-small" id="raawi-line-decrease" aria-label="${t.decreaseLineSpacing}">-</button>
            <span class="raawi-accessibility-value" id="raawi-line-spacing-value" aria-live="polite">100%</span>
            <button class="raawi-accessibility-button-small" id="raawi-line-increase" aria-label="${t.increaseLineSpacing}">+</button>
          </div>
        </div>

        <div class="raawi-accessibility-control">
          <label for="raawi-focus-toggle">${t.focusHighlight}</label>
          <label class="raawi-accessibility-toggle">
            <input type="checkbox" id="raawi-focus-toggle" aria-label="${t.toggleFocusHighlight}">
            <span class="raawi-accessibility-slider"></span>
          </label>
        </div>

        <div class="raawi-accessibility-control">
          <button class="raawi-accessibility-button-small" id="raawi-describe-image" data-testid="raawi-tool-describe-image" style="width: 100%;">${t.describeImage}</button>
        </div>

        <div class="raawi-accessibility-control">
          <button class="raawi-accessibility-button-small" id="raawi-describe-focused" data-testid="raawi-tool-describe-focused" style="width: 100%;">${t.describeFocusedElement}</button>
        </div>

        <div class="raawi-accessibility-control">
          <button class="raawi-accessibility-button-small" id="raawi-what-can-i-do" data-testid="raawi-tool-what-can-i-do" style="width: 100%;">${t.whatCanIDoHere}</button>
        </div>

        <!-- Login Assist (Najiz) Tool Card (B1) -->
        <div class="raawi-tool-card" id="raawi-login-assist-section" style="display: none;">
          <div class="raawi-tool-card-header">
            <span class="raawi-tool-icon" aria-hidden="true">🔐</span>
            <div class="raawi-tool-title-group">
              <span class="raawi-tool-label">${t.loginAssist}</span>
              <span class="raawi-tool-subtitle">${t.loginAssistSubtitle}</span>
            </div>
          </div>
          <div class="raawi-tool-card-content">
            <button class="raawi-accessibility-button-small" id="raawi-login-assist-start" aria-label="${t.startLoginAssist}">
              ${t.startLoginAssist}
            </button>
            <button class="raawi-accessibility-button-small" id="raawi-login-assist-stop" style="display: none;" aria-label="${t.stopLoginAssist}">
              ${t.stopLoginAssist}
            </button>
            <div id="raawi-login-assist-status" class="raawi-tool-status" aria-live="polite"></div>
          </div>
        </div>

        <!-- Auth Flow Banner (B2) -->
        <div id="raawi-auth-banner" class="raawi-auth-banner" style="display: none;" role="alert">
          <span class="raawi-auth-banner-icon">🔐</span>
          <span class="raawi-auth-banner-text">${t.authBannerMessage}</span>
        </div>

        <!-- Form Assistant Tool Card (A1) -->
        <div class="raawi-tool-card" id="raawi-form-assistant-section" data-testid="raawi-tool-form-assistant">
          <div class="raawi-tool-card-header">
            <span class="raawi-tool-icon" aria-hidden="true">📋</span>
            <div class="raawi-tool-title-group">
              <span class="raawi-tool-label">${t.formAssistant}</span>
              <span class="raawi-tool-subtitle">${t.formAssistantSubtitle}</span>
            </div>
            <span id="raawi-form-assistant-active-badge" class="raawi-active-badge" style="display: none;">${t.formAssistantActive}</span>
          </div>
          <div class="raawi-tool-card-content">
            <div id="raawi-form-assistant-no-form-message" class="raawi-tool-message" style="display: none;">
              ${t.formAssistantNoFormMessage}
            </div>
            <button class="raawi-accessibility-button-small" id="raawi-form-assistant-start" disabled aria-label="${t.startFormAssistant}">
              ${t.startFormAssistant}
            </button>
            <button class="raawi-accessibility-button-small" id="raawi-form-assistant-stop" style="display: none;" aria-label="${t.stopFormAssistant}">
              ${t.stopFormAssistant}
            </button>
            <button class="raawi-accessibility-button-small" id="raawi-form-assistant-upload" style="display: none;" aria-label="${t.formAssistantChooseFileButton}">
              ${t.formAssistantChooseFileButton}
            </button>
            <div id="raawi-form-assistant-status" class="raawi-tool-status" aria-live="polite"></div>
          </div>
        </div>

        <div class="raawi-accessibility-control">
          <button class="raawi-accessibility-button-small" id="raawi-reset" style="width: 100%;">${t.resetAll}</button>
        </div>
      </div>

      <!-- Tab Content: Vision -->
      <div id="raawi-tab-vision" class="raawi-tab-content" role="tabpanel">
        <h2>${t.vision}</h2>
        
        <div class="raawi-accessibility-control">
          <label for="raawi-contrast-toggle">${t.highContrastMode}</label>
          <label class="raawi-accessibility-toggle">
            <input type="checkbox" id="raawi-contrast-toggle" aria-label="${t.toggleHighContrast}">
            <span class="raawi-accessibility-slider"></span>
          </label>
        </div>

        <div class="raawi-accessibility-control">
          <label for="raawi-stop-animations-toggle">${t.stopAnimations}</label>
          <label class="raawi-accessibility-toggle">
            <input type="checkbox" id="raawi-stop-animations-toggle" data-testid="raawi-tool-stop-animations" aria-label="${t.toggleStopAnimations}">
            <span class="raawi-accessibility-slider"></span>
          </label>
        </div>

        <div class="raawi-accessibility-control">
          <label for="raawi-reduce-motion-toggle">${t.reduceMotion}</label>
          <label class="raawi-accessibility-toggle">
            <input type="checkbox" id="raawi-reduce-motion-toggle" aria-label="${t.toggleReduceMotion}">
            <span class="raawi-accessibility-slider"></span>
          </label>
        </div>

        <div class="raawi-accessibility-control">
          <label for="raawi-big-cursor-select">${t.bigCursor}</label>
          <select id="raawi-big-cursor-select" class="raawi-accessibility-select" aria-label="${t.selectBigCursor}">
            <option value="off">${t.off}</option>
            <option value="dark">${t.bigDarkCursor}</option>
            <option value="light">${t.bigLightCursor}</option>
          </select>
        </div>

        <div class="raawi-accessibility-control">
          <label for="raawi-magnifier-toggle">${t.magnifier}</label>
          <label class="raawi-accessibility-toggle">
            <input type="checkbox" id="raawi-magnifier-toggle" aria-label="${t.toggleMagnifier}">
            <span class="raawi-accessibility-slider"></span>
          </label>
        </div>

        <div class="raawi-accessibility-control" id="raawi-magnifier-zoom-control" style="display: none;">
          <label for="raawi-magnifier-zoom-slider">${t.magnifierZoom}: <span id="raawi-magnifier-zoom-value" aria-live="polite">${Math.round(this.settings.magnifierZoom * 100)}%</span></label>
          <input type="range" id="raawi-magnifier-zoom-slider" min="1.5" max="5.0" step="0.1" value="${this.settings.magnifierZoom}" aria-label="${t.adjustMagnifierZoom}">
        </div>
      </div>

      <!-- Tab Content: Reading -->
      <div id="raawi-tab-reading" class="raawi-tab-content" role="tabpanel">
        <h2>${t.reading}</h2>
        
        <div class="raawi-accessibility-control">
          <label for="raawi-reading-toggle">${t.readingMode}</label>
          <label class="raawi-accessibility-toggle">
            <input type="checkbox" id="raawi-reading-toggle" aria-label="${t.toggleReadingMode}">
            <span class="raawi-accessibility-slider"></span>
          </label>
        </div>

        <div class="raawi-accessibility-control">
          <label for="raawi-reading-guide-toggle">${t.readingGuide}</label>
          <label class="raawi-accessibility-toggle">
            <input type="checkbox" id="raawi-reading-guide-toggle" data-testid="raawi-tool-reading-guide" aria-label="${t.toggleReadingGuide}">
            <span class="raawi-accessibility-slider"></span>
          </label>
        </div>

        <div class="raawi-accessibility-control">
          <label for="raawi-reading-mask-toggle">${t.readingMask}</label>
          <label class="raawi-accessibility-toggle">
            <input type="checkbox" id="raawi-reading-mask-toggle" data-testid="raawi-tool-reading-mask" aria-label="${t.toggleReadingMask}">
            <span class="raawi-accessibility-slider"></span>
          </label>
        </div>

        <div class="raawi-accessibility-control" id="raawi-reading-mask-height-control" style="display: none;">
          <span class="raawi-accessibility-label">${t.maskWindowHeight}</span>
          <div class="raawi-accessibility-control-group" style="margin-top: 8px;">
            <button class="raawi-accessibility-button-small raawi-mask-height-btn ${this.settings.readingMaskWindowHeight === 'small' ? 'active' : ''}" data-height="small" style="flex: 1;">${t.small}</button>
            <button class="raawi-accessibility-button-small raawi-mask-height-btn ${this.settings.readingMaskWindowHeight === 'medium' ? 'active' : ''}" data-height="medium" style="flex: 1;">${t.medium}</button>
            <button class="raawi-accessibility-button-small raawi-mask-height-btn ${this.settings.readingMaskWindowHeight === 'large' ? 'active' : ''}" data-height="large" style="flex: 1;">${t.large}</button>
          </div>
        </div>

        <div class="raawi-accessibility-control">
          <label for="raawi-hide-images-toggle">${t.hideImages}</label>
          <label class="raawi-accessibility-toggle">
            <input type="checkbox" id="raawi-hide-images-toggle" aria-label="${t.toggleHideImages}">
            <span class="raawi-accessibility-slider"></span>
          </label>
        </div>

        <div class="raawi-accessibility-control">
          <label for="raawi-image-captions-toggle">${t.imageCaptions}</label>
          <label class="raawi-accessibility-toggle">
            <input type="checkbox" id="raawi-image-captions-toggle" aria-label="${t.toggleImageCaptions}">
            <span class="raawi-accessibility-slider"></span>
          </label>
        </div>
        
        ${this.voiceEnabled ? `
        <div class="raawi-accessibility-control" id="raawi-narration-controls">
          <label>${t.pageReading}</label>
          <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px;">
            <button class="raawi-accessibility-button-small" id="raawi-read-page" style="flex: 1; min-width: 80px;">${t.readPage}</button>
            <button class="raawi-accessibility-button-small" id="raawi-read-summary" style="flex: 1; min-width: 80px;">${t.summary}</button>
          </div>
          <div class="raawi-accessibility-control" style="margin-top: 10px;">
            <label for="raawi-translate-language">${t.translateReading}</label>
            <select id="raawi-translate-language" class="raawi-accessibility-select" aria-label="${t.selectTranslationLanguage}">
              <option value="off">${t.off}</option>
              <option value="ar">${t.arabic}</option>
              <option value="en">${t.english}</option>
            </select>
          </div>
          <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px;">
            <button class="raawi-accessibility-button-small" id="raawi-narration-pause" style="flex: 1; min-width: 60px;">${t.pause}</button>
            <button class="raawi-accessibility-button-small" id="raawi-narration-resume" style="flex: 1; min-width: 60px;">${t.resume}</button>
            <button class="raawi-accessibility-button-small" id="raawi-narration-stop" style="flex: 1; min-width: 60px;">${t.stop}</button>
          </div>
          <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px;">
            <button class="raawi-accessibility-button-small" id="raawi-narration-next" style="flex: 1; min-width: 60px;">${t.next}</button>
            <button class="raawi-accessibility-button-small" id="raawi-narration-repeat" style="flex: 1; min-width: 60px;">${t.repeat}</button>
          </div>
          <div style="margin-top: 5px; font-size: 0.85em; color: #666;" id="raawi-narration-status" aria-live="polite"></div>
        </div>
        ` : ''}
      </div>

      <!-- Tab Content: Tools -->
      <div id="raawi-tab-tools" class="raawi-tab-content" role="tabpanel">
        <h2>${t.tools}</h2>
        
        ${this.voiceEnabled ? `
        <div class="raawi-accessibility-control" id="raawi-voice-control">
          <label for="raawi-voice-mode-select">${t.voiceMode}</label>
          <select id="raawi-voice-mode-select" class="raawi-accessibility-select" aria-label="${t.selectVoiceMode}">
            <option value="off">${t.voiceModeOff}</option>
            <option value="push_to_talk">${t.voiceModePushToTalk}</option>
            <option value="hands_free">${t.voiceModeHandsFree}</option>
          </select>
          <div style="font-size: 0.85em; color: #666; margin-top: 4px;">
            ${t.voiceModeDescription}
          </div>
        </div>
        
        <div class="raawi-accessibility-control" id="raawi-voice-transcript-container" style="display: none;">
          <label>${t.transcript}</label>
          <div class="raawi-voice-transcript" id="raawi-voice-transcript" role="log" aria-live="polite" aria-atomic="false"></div>
        </div>
        
        <div class="raawi-accessibility-control" id="raawi-voice-commands" style="display: none;">
          <button class="raawi-accessibility-button-small" id="raawi-voice-list-commands" style="width: 100%;">${t.listCommands}</button>
        </div>
        
        <div class="raawi-accessibility-control" id="raawi-voice-mic-container" style="display: none; text-align: center;">
          <button class="raawi-voice-mic-button" id="raawi-voice-mic-button" aria-label="${t.microphoneButton}">
            🎤
          </button>
        </div>
        ` : ''}
      </div>
    `;

    // Append panel to DOM FIRST so elements are findable
    document.body.appendChild(this.panel);
    
    console.log('[RaawiX Widget] Panel appended to DOM, attaching event listeners...');

    // Setup language toggle
    this.setupLanguageToggle();

    // Setup tab navigation
    this.setupTabNavigation();

    // Setup quick actions
    this.setupQuickActions();

    // Setup presets
    this.setupPresets();

    // Attach event listeners - query from panel since it's now in DOM
    // Use querySelector on panel to find elements (more reliable than getElementById)
    const textIncrease = this.panel.querySelector('#raawi-text-increase') as HTMLButtonElement;
    const textDecrease = this.panel.querySelector('#raawi-text-decrease') as HTMLButtonElement;
    const lineIncrease = this.panel.querySelector('#raawi-line-increase') as HTMLButtonElement;
    const lineDecrease = this.panel.querySelector('#raawi-line-decrease') as HTMLButtonElement;
    const contrastToggle = this.panel.querySelector('#raawi-contrast-toggle') as HTMLInputElement;
    const focusToggle = this.panel.querySelector('#raawi-focus-toggle') as HTMLInputElement;
    const readingToggle = this.panel.querySelector('#raawi-reading-toggle') as HTMLInputElement;
    const stopAnimationsToggle = this.panel.querySelector('#raawi-stop-animations-toggle') as HTMLInputElement;
    const resetButton = this.panel.querySelector('#raawi-reset') as HTMLButtonElement;
    
    console.log('[RaawiX Widget] Elements found:', {
      textIncrease: !!textIncrease,
      textDecrease: !!textDecrease,
      lineIncrease: !!lineIncrease,
      lineDecrease: !!lineDecrease,
      contrastToggle: !!contrastToggle,
      focusToggle: !!focusToggle,
      readingToggle: !!readingToggle,
      resetButton: !!resetButton,
    });

    if (textIncrease) {
      textIncrease.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.adjustTextSize(0.1);
      });
    }

    if (textDecrease) {
      textDecrease.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.adjustTextSize(-0.1);
      });
    }

    if (lineIncrease) {
      lineIncrease.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.adjustLineSpacing(0.1);
      });
    }

    if (lineDecrease) {
      lineDecrease.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.adjustLineSpacing(-0.1);
      });
    }

    if (contrastToggle) {
      contrastToggle.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setContrastMode((e.target as HTMLInputElement).checked);
      });
    }

    if (focusToggle) {
      focusToggle.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setFocusHighlight((e.target as HTMLInputElement).checked);
      });
    }

    if (readingToggle) {
      readingToggle.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setReadingMode((e.target as HTMLInputElement).checked);
      });
    }

    if (stopAnimationsToggle) {
      stopAnimationsToggle.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setStopAnimations((e.target as HTMLInputElement).checked);
      });
    }

    const reduceMotionToggle = this.panel.querySelector('#raawi-reduce-motion-toggle') as HTMLInputElement;
    if (reduceMotionToggle) {
      reduceMotionToggle.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setReduceMotion((e.target as HTMLInputElement).checked);
      });
    }

    const bigCursorSelect = this.panel.querySelector('#raawi-big-cursor-select') as HTMLSelectElement;
    if (bigCursorSelect) {
      bigCursorSelect.value = this.settings.bigCursor;
      bigCursorSelect.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const value = (e.target as HTMLSelectElement).value as 'off' | 'dark' | 'light';
        this.setBigCursor(value);
      });
    }

    const magnifierToggle = this.panel.querySelector('#raawi-magnifier-toggle') as HTMLInputElement;
    if (magnifierToggle) {
      magnifierToggle.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setMagnifier((e.target as HTMLInputElement).checked);
      });
    }

    const magnifierZoomSlider = this.panel.querySelector('#raawi-magnifier-zoom-slider') as HTMLInputElement;
    if (magnifierZoomSlider) {
      magnifierZoomSlider.addEventListener('input', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.setMagnifierZoom(value);
      });
    }

    const readingGuideToggle = this.panel.querySelector('#raawi-reading-guide-toggle') as HTMLInputElement;
    if (readingGuideToggle) {
      readingGuideToggle.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setReadingGuide((e.target as HTMLInputElement).checked);
      });
    }

    const readingMaskToggle = this.panel.querySelector('#raawi-reading-mask-toggle') as HTMLInputElement;
    if (readingMaskToggle) {
      readingMaskToggle.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setReadingMask((e.target as HTMLInputElement).checked);
      });
    }

    const hideImagesToggle = this.panel.querySelector('#raawi-hide-images-toggle') as HTMLInputElement;
    if (hideImagesToggle) {
      hideImagesToggle.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setHideImages((e.target as HTMLInputElement).checked);
      });
    }

    const imageCaptionsToggle = this.panel.querySelector('#raawi-image-captions-toggle') as HTMLInputElement;
    if (imageCaptionsToggle) {
      imageCaptionsToggle.addEventListener('change', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setImageCaptions((e.target as HTMLInputElement).checked);
      });
    }

    // Reading mask height buttons
    const maskHeightButtons = this.panel.querySelectorAll('.raawi-mask-height-btn') as NodeListOf<HTMLButtonElement>;
    maskHeightButtons.forEach((btn) => {
      // Set initial active state
      const btnHeight = btn.getAttribute('data-height') as 'small' | 'medium' | 'large';
      if (btnHeight === this.settings.readingMaskWindowHeight) {
        btn.classList.add('active');
        btn.style.background = '#27ae60';
        btn.style.borderColor = '#27ae60';
      }

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setReadingMaskWindowHeight(btnHeight);
      });
    });

    if (resetButton) {
      resetButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.reset();
      });
    }

    // Describe Image button
    const describeImageButton = this.panel.querySelector('#raawi-describe-image') as HTMLButtonElement;
    if (describeImageButton) {
      describeImageButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.describeImage();
      });
    }

    // Describe Focused Element button
    const describeFocusedButton = this.panel.querySelector('#raawi-describe-focused') as HTMLButtonElement;
    if (describeFocusedButton) {
      describeFocusedButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.describeFocusedElement();
      });
    }

    // What Can I Do Here button
    const whatCanIDoButton = this.panel.querySelector('#raawi-what-can-i-do') as HTMLButtonElement;
    if (whatCanIDoButton) {
      whatCanIDoButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.whatCanIDoHere();
      });
    }

    // Form Assistant buttons
    const formAssistantStart = this.panel.querySelector('#raawi-form-assistant-start') as HTMLButtonElement;
    const formAssistantStop = this.panel.querySelector('#raawi-form-assistant-stop') as HTMLButtonElement;
    const formAssistantUpload = this.panel.querySelector('#raawi-form-assistant-upload') as HTMLButtonElement;
    if (formAssistantStart) {
      formAssistantStart.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.startFormAssistant();
      });
    }
    if (formAssistantStop) {
      formAssistantStop.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.stopFormAssistant();
      });
    }
    if (formAssistantUpload) {
      formAssistantUpload.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.triggerFilePicker();
      });
    }

    // Close on Escape key
    this.panel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closePanel();
        this.button?.focus(); // Return focus to button
      }
    });

    // Login Assist event listeners (B)
    const loginAssistStart = this.panel.querySelector('#raawi-login-assist-start') as HTMLButtonElement | null;
    const loginAssistStop = this.panel.querySelector('#raawi-login-assist-stop') as HTMLButtonElement | null;
    if (loginAssistStart) {
      loginAssistStart.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.startLoginAssist();
      });
    }
    if (loginAssistStop) {
      loginAssistStop.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.stopLoginAssist();
      });
    }

    // Voice mode event listeners
    if (this.voiceEnabled) {
      const voiceModeSelect = this.panel.querySelector('#raawi-voice-mode-select') as HTMLSelectElement;
      const listCommandsBtn = this.panel.querySelector('#raawi-voice-list-commands') as HTMLButtonElement;
      const micButton = this.panel.querySelector('#raawi-voice-mic-button') as HTMLButtonElement | null;

      if (voiceModeSelect) {
        // Set initial value
        voiceModeSelect.value = this.settings.voiceMode;
        
        voiceModeSelect.addEventListener('change', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const mode = (e.target as HTMLSelectElement).value as 'off' | 'push_to_talk' | 'hands_free';
          this.setVoiceModeType(mode);
        });
      }

      if (listCommandsBtn) {
        listCommandsBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.speakCommands();
        });
      }

      // Narration controls
      const readPageBtn = this.panel.querySelector('#raawi-read-page') as HTMLButtonElement | null;
      const readSummaryBtn = this.panel.querySelector('#raawi-read-summary') as HTMLButtonElement | null;
      const pauseBtn = this.panel.querySelector('#raawi-narration-pause') as HTMLButtonElement | null;
      const resumeBtn = this.panel.querySelector('#raawi-narration-resume') as HTMLButtonElement | null;
      const stopBtn = this.panel.querySelector('#raawi-narration-stop') as HTMLButtonElement | null;
      const nextBtn = this.panel.querySelector('#raawi-narration-next') as HTMLButtonElement | null;
      const repeatBtn = this.panel.querySelector('#raawi-narration-repeat') as HTMLButtonElement | null;

      if (readPageBtn) {
        readPageBtn.addEventListener('click', () => this.startFullNarration());
      }
      if (readSummaryBtn) {
        readSummaryBtn.addEventListener('click', () => this.startSummaryNarration());
      }
      if (pauseBtn) {
        pauseBtn.addEventListener('click', () => this.pauseNarration());
      }
      if (resumeBtn) {
        resumeBtn.addEventListener('click', () => this.resumeNarration());
      }
      if (stopBtn) {
        stopBtn.addEventListener('click', () => this.stopNarration());
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', () => this.skipToNextSegment());
      }
      if (repeatBtn) {
        repeatBtn.addEventListener('click', () => this.repeatCurrentSegment());
      }

      // Translation dropdown
      const translateSelect = this.panel.querySelector('#raawi-translate-language') as HTMLSelectElement | null;
      if (translateSelect) {
        translateSelect.value = this.settings.translateLanguage;
        translateSelect.addEventListener('change', (e) => {
          const value = (e.target as HTMLSelectElement).value as 'off' | 'ar' | 'en';
          this.settings.translateLanguage = value;
          this.applySettings();
        });
      }

      if (micButton) {
        // Push-to-talk: hold button
        micButton.addEventListener('mousedown', (e) => {
          if (this.settings.voiceMode === 'push_to_talk') {
            e.preventDefault();
            this.startListening();
          }
        });

        micButton.addEventListener('mouseup', (e) => {
          if (this.settings.voiceMode === 'push_to_talk') {
            e.preventDefault();
            this.stopListening();
          }
        });

        micButton.addEventListener('mouseleave', (e) => {
          if (this.settings.voiceMode === 'push_to_talk' && this.isListening) {
            e.preventDefault();
            this.stopListening();
          }
        });

        // Continuous mode: click to toggle
        micButton.addEventListener('click', (e) => {
          if (this.settings.voiceMode === 'hands_free') {
            e.preventDefault();
            this.toggleListening();
          }
        });

        // Keyboard support
        micButton.addEventListener('keydown', (e) => {
          if (this.settings.voiceMode === 'push_to_talk' && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            this.startListening();
          }
        });

        micButton.addEventListener('keyup', (e) => {
          if (this.settings.voiceMode === 'push_to_talk' && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            this.stopListening();
          }
        });
      }
    }
  }

  private togglePanel(): void {
    if (this.isOpen) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  private openPanel(): void {
    if (!this.panel || !this.button) return;
    this.isOpen = true;
    this.panel.classList.add('open');
    this.button.setAttribute('aria-expanded', 'true');
    // Don't move focus - let user navigate naturally
  }

  private closePanel(): void {
    if (!this.panel || !this.button) return;
    this.isOpen = false;
    this.panel.classList.remove('open');
    this.button.setAttribute('aria-expanded', 'false');
  }

  // ==================== Translation and UI Support ====================

  private getTranslations(): Record<string, string> {
    const translations: Record<string, Record<string, string>> = {
      en: {
        accessibilityOptions: 'Accessibility Options',
        assist: 'Assist',
        vision: 'Vision',
        reading: 'Reading',
        tools: 'Tools',
        textSize: 'Text Size',
        lineSpacing: 'Line Spacing',
        highContrastMode: 'High Contrast Mode',
        focusHighlight: 'Focus Highlight',
        readingMode: 'Reading Mode',
        readingGuide: 'Reading guide',
        toggleReadingGuide: 'Toggle reading guide',
        readingMask: 'Reading mask',
        toggleReadingMask: 'Toggle reading mask',
        maskWindowHeight: 'Window height',
        hideImages: 'Hide images',
        toggleHideImages: 'Toggle hide images',
        imageCaptions: 'Image captions',
        toggleImageCaptions: 'Toggle image captions',
        small: 'Small',
        medium: 'Medium',
        large: 'Large',
        stopAnimations: 'Stop animations',
        toggleStopAnimations: 'Toggle stop animations',
        reduceMotion: 'Reduce motion',
        toggleReduceMotion: 'Toggle reduce motion',
        bigCursor: 'Big cursor',
        selectBigCursor: 'Select big cursor mode',
        bigDarkCursor: 'Big dark cursor',
        bigLightCursor: 'Big light cursor',
        magnifier: 'Magnifier',
        toggleMagnifier: 'Toggle magnifier',
        magnifierZoom: 'Zoom',
        adjustMagnifierZoom: 'Adjust magnifier zoom level',
        voiceMode: 'Voice Mode',
        pushToTalk: 'Push to Talk',
        transcript: 'Transcript',
        listCommands: 'List Commands',
        microphoneButton: 'Microphone button',
        pageReading: 'Page Reading',
        readPage: 'Read Page',
        summary: 'Summary',
        translateReading: 'Translate Reading',
        selectTranslationLanguage: 'Select translation language for narration',
        off: 'Off',
        arabic: 'Arabic',
        english: 'English',
        pause: 'Pause',
        resume: 'Resume',
        stop: 'Stop',
        next: 'Next',
        repeat: 'Repeat',
        resetAll: 'Reset All',
        close: 'Close',
        increaseTextSize: 'Increase text size',
        decreaseTextSize: 'Decrease text size',
        increaseLineSpacing: 'Increase line spacing',
        decreaseLineSpacing: 'Decrease line spacing',
        toggleHighContrast: 'Toggle high contrast mode',
        toggleFocusHighlight: 'Toggle focus highlight',
        toggleReadingMode: 'Toggle reading mode',
        toggleVoiceMode: 'Toggle voice mode',
        selectVoiceMode: 'Select voice mode',
        voiceModeOff: 'Off',
        voiceModePushToTalk: 'Push to Talk',
        voiceModeHandsFree: 'Hands Free (Wake Phrase)',
        voiceModeDescription: 'Hands Free: Say "hi raawi" or "هلا راوي" to activate',
        togglePushToTalk: 'Toggle push to talk',
        presets: 'Presets',
        presetBlind: 'Blind',
        presetLowVision: 'Low Vision',
        presetDyslexia: 'Dyslexia',
        presetNone: 'Custom (No Preset)',
        describeImage: 'Describe Image',
        imageWithoutDescription: 'Image without description',
        decorativeImage: 'Decorative image',
        noImageFound: 'No image found on this section',
        describeFocusedElement: 'Describe focused element',
        noFocusedElement: 'No focused element',
        unlabeled: 'unlabeled',
        button: 'button',
        link: 'link',
        input: 'input',
        editField: 'Edit field',
        checkbox: 'checkbox',
        radio: 'radio',
        menu: 'menu',
        checked: 'checked',
        unchecked: 'unchecked',
        expanded: 'expanded',
        collapsed: 'collapsed',
        disabled: 'disabled',
        required: 'required',
        invalid: 'invalid',
        whatCanIDoHere: 'What can I do here?',
        availableActions: 'Available actions',
        action: 'Action',
        sayGoToAction: 'Say "go to action',
        toFocusIt: 'to focus it',
        noActionsFound: 'No actions found on this page',
        loginAssist: 'Login Assist (Nafath)',
        loginAssistSubtitle: 'Safe navigation guidance for login pages',
        startLoginAssist: 'Start',
        stopLoginAssist: 'Stop',
        authBannerMessage: 'Login page detected. I can guide you safely.',
        formAssistant: 'Form Assistant',
        formAssistantSubtitle: 'Guided form filling with confirmations',
        formAssistantActive: 'Active',
        formAssistantNoFormMessage: 'No form found on this page',
        startFormAssistant: 'Start',
        stopFormAssistant: 'Stop',
        formAssistantHelpMeFill: 'Help me fill the form',
        formAssistantPreviousField: 'Previous field',
        formAssistantSubmit: 'Submit',
        formAssistantStartLoginAssist: 'Start login assist',
        formAssistantStatus: 'Step {current} of {total}, current field: {field}',
        formAssistantNoForm: 'No form detected on this page',
        formAssistantSummary: 'Form has {required} required fields and {uploads} file uploads',
        formAssistantNextField: 'Next field',
        formAssistantRepeat: 'Repeat',
        formAssistantSkip: 'Skip',
        formAssistantReview: 'Review',
        formAssistantStop: 'Stop assistant',
        formAssistantChooseFile: 'Now choose the file from your device. I will open the file picker.',
        formAssistantChooseFileButton: 'Choose File',
        formAssistantFileSelected: 'File selected: {filename}. Continue?',
        formAssistantConfirmSubmit: 'Confirm submit?',
        formAssistantFieldLabel: 'Field: {label}',
        formAssistantFieldRequired: 'Required',
        formAssistantFieldOptional: 'Optional',
        formAssistantEnterValue: 'Please enter the value for {label}',
        formAssistantValueEntered: 'Value entered: {value}',
        formAssistantFieldSkipped: 'Field skipped',
        formAssistantAllFieldsComplete: 'All required fields are complete. Ready to submit?',
      },
      ar: {
        accessibilityOptions: 'خيارات إمكانية الوصول',
        assist: 'مساعدة',
        vision: 'الرؤية',
        reading: 'القراءة',
        tools: 'أدوات',
        textSize: 'حجم النص',
        lineSpacing: 'تباعد الأسطر',
        highContrastMode: 'وضع التباين العالي',
        focusHighlight: 'تمييز التركيز',
        readingMode: 'وضع القراءة',
        readingGuide: 'دليل القراءة',
        toggleReadingGuide: 'تبديل دليل القراءة',
        readingMask: 'قناع القراءة',
        toggleReadingMask: 'تبديل قناع القراءة',
        maskWindowHeight: 'ارتفاع النافذة',
        hideImages: 'إخفاء الصور',
        toggleHideImages: 'تبديل إخفاء الصور',
        imageCaptions: 'تعليقات الصور',
        toggleImageCaptions: 'تبديل تعليقات الصور',
        small: 'صغير',
        medium: 'متوسط',
        large: 'كبير',
        stopAnimations: 'إيقاف الرسوم المتحركة',
        toggleStopAnimations: 'تبديل إيقاف الرسوم المتحركة',
        reduceMotion: 'تقليل الحركة',
        toggleReduceMotion: 'تبديل تقليل الحركة',
        bigCursor: 'مؤشر كبير',
        selectBigCursor: 'اختر وضع المؤشر الكبير',
        bigDarkCursor: 'مؤشر كبير داكن',
        bigLightCursor: 'مؤشر كبير فاتح',
        magnifier: 'المكبر',
        toggleMagnifier: 'تبديل المكبر',
        magnifierZoom: 'التكبير',
        adjustMagnifierZoom: 'ضبط مستوى تكبير المكبر',
        voiceMode: 'الوضع الصوتي',
        pushToTalk: 'اضغط للتحدث',
        transcript: 'النص',
        listCommands: 'عرض الأوامر',
        microphoneButton: 'زر الميكروفون',
        pageReading: 'قراءة الصفحة',
        readPage: 'قراءة الصفحة',
        summary: 'ملخص',
        translateReading: 'ترجمة القراءة',
        selectTranslationLanguage: 'اختر لغة الترجمة للقراءة',
        off: 'إيقاف',
        arabic: 'العربية',
        english: 'الإنجليزية',
        pause: 'إيقاف مؤقت',
        resume: 'استئناف',
        stop: 'إيقاف',
        next: 'التالي',
        repeat: 'تكرار',
        resetAll: 'إعادة تعيين الكل',
        close: 'إغلاق',
        increaseTextSize: 'زيادة حجم النص',
        decreaseTextSize: 'تقليل حجم النص',
        increaseLineSpacing: 'زيادة تباعد الأسطر',
        decreaseLineSpacing: 'تقليل تباعد الأسطر',
        toggleHighContrast: 'تبديل وضع التباين العالي',
        toggleFocusHighlight: 'تبديل تمييز التركيز',
        toggleReadingMode: 'تبديل وضع القراءة',
        toggleVoiceMode: 'تبديل الوضع الصوتي',
        selectVoiceMode: 'اختر وضع الصوت',
        voiceModeOff: 'إيقاف',
        voiceModePushToTalk: 'اضغط للتحدث',
        voiceModeHandsFree: 'يدوي حر (عبارة الاستيقاظ)',
        voiceModeDescription: 'يدوي حر: قل "هلا راوي" أو "hi raawi" للتفعيل',
        togglePushToTalk: 'تبديل اضغط للتحدث',
        presets: 'الإعدادات المسبقة',
        presetBlind: 'مكفوف',
        presetLowVision: 'ضعف البصر',
        presetDyslexia: 'عسر القراءة',
        presetNone: 'مخصص (بدون إعداد مسبق)',
        describeImage: 'وصف الصورة',
        imageWithoutDescription: 'صورة بدون وصف',
        decorativeImage: 'صورة زخرفية',
        noImageFound: 'لم يتم العثور على صورة في هذا القسم',
        describeFocusedElement: 'وصف العنصر المحدد',
        noFocusedElement: 'لا يوجد عنصر محدد',
        unlabeled: 'بدون تسمية',
        button: 'زر',
        link: 'رابط',
        input: 'حقل إدخال',
        editField: 'حقل تعديل',
        checkbox: 'مربع اختيار',
        radio: 'زر اختيار',
        menu: 'قائمة',
        checked: 'محدد',
        unchecked: 'غير محدد',
        expanded: 'موسع',
        collapsed: 'مطوي',
        disabled: 'معطل',
        required: 'مطلوب',
        invalid: 'غير صالح',
        whatCanIDoHere: 'ماذا يمكنني أن أفعل هنا؟',
        availableActions: 'الإجراءات المتاحة',
        action: 'إجراء',
        sayGoToAction: 'قل "اذهب إلى الإجراء',
        toFocusIt: 'للتركيز عليه',
        noActionsFound: 'لم يتم العثور على إجراءات في هذه الصفحة',
        loginAssist: 'مساعدة تسجيل الدخول (نفاذ)',
        loginAssistSubtitle: 'إرشاد آمن لصفحات تسجيل الدخول',
        startLoginAssist: 'ابدأ',
        stopLoginAssist: 'أوقف',
        authBannerMessage: 'تم اكتشاف صفحة تسجيل دخول. أقدر أساعدك بأمان.',
        formAssistant: 'مساعد تعبئة النماذج',
        formAssistantSubtitle: 'تعبئة خطوة بخطوة مع تأكيدات',
        formAssistantActive: 'نشط',
        formAssistantNoFormMessage: 'لا يوجد نموذج في هذه الصفحة',
        startFormAssistant: 'ابدأ',
        stopFormAssistant: 'أوقف',
        formAssistantHelpMeFill: 'ساعدني في النموذج',
        formAssistantPreviousField: 'الحقل السابق',
        formAssistantSubmit: 'إرسال',
        formAssistantStartLoginAssist: 'ابدأ مساعدة تسجيل الدخول',
        formAssistantStatus: 'الخطوة {current} من {total}، الحقل الحالي: {field}',
        formAssistantNoForm: 'لم يتم اكتشاف نموذج في هذه الصفحة',
        formAssistantSummary: 'النموذج يحتوي على {required} حقول مطلوبة و {uploads} رفع ملفات',
        formAssistantNextField: 'الحقل التالي',
        formAssistantRepeat: 'كرر',
        formAssistantSkip: 'تخطي',
        formAssistantReview: 'مراجعة',
        formAssistantStop: 'أوقف المساعد',
        formAssistantChooseFile: 'الآن اختر الملف من جهازك. سأفتح نافذة اختيار الملف.',
        formAssistantChooseFileButton: 'اختر الملف',
        formAssistantFileSelected: 'تم اختيار الملف: {filename}. المتابعة؟',
        formAssistantConfirmSubmit: 'تأكيد الإرسال؟',
        formAssistantFieldLabel: 'الحقل: {label}',
        formAssistantFieldRequired: 'مطلوب',
        formAssistantFieldOptional: 'اختياري',
        formAssistantEnterValue: 'يرجى إدخال القيمة لـ {label}',
        formAssistantValueEntered: 'تم إدخال القيمة: {value}',
        formAssistantFieldSkipped: 'تم تخطي الحقل',
        formAssistantAllFieldsComplete: 'جميع الحقول المطلوبة مكتملة. جاهز للإرسال؟',
        step: 'الخطوة',
      },
    };
    return translations[this.context.locale] || translations.en;
  }

  /**
   * Update WidgetContext - Single source of truth (A)
   * Changing locale updates ALL: direction, voiceLang, theme
   */
  private setContext(locale: 'en' | 'ar'): void {
    this.context = {
      locale,
      direction: locale === 'ar' ? 'rtl' : 'ltr',
      voiceLang: locale === 'ar' ? 'ar-SA' : 'en-US',
      theme: 'green',
    };
    this.applyContext(); // Apply changes to UI, voice, etc.
  }

  /**
   * Apply WidgetContext to all widget elements (B, C, F)
   */
  private applyContext(): void {
    // Update panel direction and language
    this.updatePanelDirection();
    
    // Update button position (D1)
    this.updateButtonPosition();
    
    // Update voice language (B1, B3)
    this.updateVoiceLanguage();
    
    // Update UI texts
    this.updateLanguageButtons();
    this.updatePanelTexts();
    
    // Update all feature texts
    this.updateFeatureTexts();
    
    // B5: Update transcript area direction
    this.updateTranscriptDirection();
  }

  /**
   * Update transcript area direction (B5)
   */
  private updateTranscriptDirection(): void {
    const transcriptEl = document.getElementById('raawi-voice-transcript');
    if (transcriptEl) {
      transcriptEl.setAttribute('dir', this.context.direction);
      transcriptEl.style.textAlign = this.context.direction === 'rtl' ? 'right' : 'left';
    }
  }

  private updatePanelDirection(): void {
    if (!this.panel) return;
    this.panel.setAttribute('dir', this.context.direction);
    this.panel.setAttribute('lang', this.context.locale);
  }

  /**
   * Update button position based on direction (C)
   */
  private updateButtonPosition(): void {
    if (!this.button) return;
    this.button.setAttribute('data-direction', this.context.direction);
  }

  /**
   * Update voice language (B1, B3)
   */
  private updateVoiceLanguage(): void {
    // B3: Update speech recognition language
    if (this.recognition) {
      this.recognition.lang = this.context.voiceLang;
    }
    
    // B1: Ensure TTS voice is selected correctly
    // Voice selection happens in speakNow method
  }

  /**
   * Get best available voice for current locale (B1)
   */
  private getBestVoice(): SpeechSynthesisVoice | null {
    if (!this.synthesis) return null;
    
    const voices = this.synthesis.getVoices();
    if (voices.length === 0) return null;
    
    // B1: Prefer voices matching context.voiceLang
    // For Arabic: prefer ar-SA, then any ar-*
    // For English: prefer en-US, then any en-*
    const preferredLang = this.context.voiceLang;
    
    // First try exact match
    let voice = voices.find(v => v.lang === preferredLang);
    if (voice) return voice;
    
    // Then try language prefix match
    const langPrefix = preferredLang.split('-')[0];
    voice = voices.find(v => v.lang.startsWith(langPrefix + '-'));
    if (voice) return voice;
    
    // Fallback: any voice with same language prefix
    voice = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix.toLowerCase()));
    if (voice) return voice;
    
    // Last resort: first available voice
    return voices[0];
  }

  private setupLanguageToggle(): void {
    const langEn = this.panel?.querySelector('#raawi-lang-en') as HTMLButtonElement;
    const langAr = this.panel?.querySelector('#raawi-lang-ar') as HTMLButtonElement;

    if (langEn) {
      langEn.addEventListener('click', () => {
        this.setContext('en');
      });
    }

    if (langAr) {
      langAr.addEventListener('click', () => {
        this.setContext('ar');
      });
    }
  }

  private updateLanguage(): void {
    // Deprecated - use applyContext() instead
    this.applyContext();
  }

  private updateLanguageButtons(): void {
    const langEn = this.panel?.querySelector('#raawi-lang-en') as HTMLButtonElement;
    const langAr = this.panel?.querySelector('#raawi-lang-ar') as HTMLButtonElement;

    if (langEn && langAr) {
      if (this.context.locale === 'en') {
        langEn.classList.add('active');
        langAr.classList.remove('active');
      } else {
        langAr.classList.add('active');
        langEn.classList.remove('active');
      }
    }
  }

  /**
   * Update all feature texts when language changes
   */
  private updateFeatureTexts(): void {
    // This will be called when context changes
    // Individual features update their texts via getTranslations()
    // which uses this.context.locale
  }

  private updatePanelTexts(): void {
    const t = this.getTranslations();
    const assistTab = this.panel?.querySelector('[data-tab="assist"]');
    const visionTab = this.panel?.querySelector('[data-tab="vision"]');
    const readingTab = this.panel?.querySelector('[data-tab="reading"]');
    const toolsTab = this.panel?.querySelector('[data-tab="tools"]');
    
    if (assistTab) assistTab.textContent = t.assist;
    if (visionTab) visionTab.textContent = t.vision;
    if (readingTab) readingTab.textContent = t.reading;
    if (toolsTab) toolsTab.textContent = t.tools;
  }

  private setupTabNavigation(): void {
    const tabs = this.panel?.querySelectorAll('.raawi-tab') as NodeListOf<HTMLButtonElement>;

    tabs?.forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab') as 'assist' | 'vision' | 'reading' | 'tools';
        this.switchTab(tabName);
      });
    });
  }

  private switchTab(tabName: 'assist' | 'vision' | 'reading' | 'tools'): void {
    this.currentTab = tabName;

    const tabs = this.panel?.querySelectorAll('.raawi-tab') as NodeListOf<HTMLButtonElement>;
    tabs?.forEach((tab) => {
      const isActive = tab.getAttribute('data-tab') === tabName;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    const tabContents = this.panel?.querySelectorAll('.raawi-tab-content') as NodeListOf<HTMLElement>;
    tabContents?.forEach((content) => {
      const isActive = content.id === `raawi-tab-${tabName}`;
      content.classList.toggle('active', isActive);
      content.style.display = isActive ? 'block' : 'none';
    });
  }

  private setupQuickActions(): void {
    const quickClose = this.panel?.querySelector('#raawi-quick-close') as HTMLButtonElement;
    const quickReset = this.panel?.querySelector('#raawi-quick-reset') as HTMLButtonElement;
    const quickVoiceToggle = this.panel?.querySelector('#raawi-quick-voice-toggle') as HTMLButtonElement;

    if (quickClose) {
      quickClose.addEventListener('click', () => {
        this.closePanel();
      });
    }

    if (quickReset) {
      quickReset.addEventListener('click', () => {
        this.reset();
      });
    }

    if (quickVoiceToggle && this.voiceEnabled) {
      quickVoiceToggle.addEventListener('click', () => {
        // A: Toggle between off and push_to_talk (hands_free requires separate UI)
        if (this.settings.voiceMode === 'off') {
          this.settings.voiceMode = 'push_to_talk';
          this.saveVoiceModeToStorage();
          this.toggleListening();
        } else {
          this.settings.voiceMode = 'off';
          this.saveVoiceModeToStorage();
          this.stopListening();
        }
      });
    }
  }

  private setupPresets(): void {
    const presetButtons = this.panel?.querySelectorAll('.raawi-preset-btn') as NodeListOf<HTMLButtonElement>;
    
    presetButtons?.forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset') as 'none' | 'blind' | 'low-vision' | 'dyslexia';
        this.applyPreset(preset);
      });
    });
  }

  private applyPreset(preset: 'none' | 'blind' | 'low-vision' | 'dyslexia'): void {
    this.currentPreset = preset;

    // Update preset button styles
    const presetButtons = this.panel?.querySelectorAll('.raawi-preset-btn') as NodeListOf<HTMLButtonElement>;
    presetButtons?.forEach((btn) => {
      const btnPreset = btn.getAttribute('data-preset') as 'none' | 'blind' | 'low-vision' | 'dyslexia';
      if (btnPreset === preset) {
        btn.style.background = '#27ae60';
        btn.style.borderColor = '#27ae60';
      } else {
        if (btnPreset === 'none') {
          btn.style.background = '#95a5a6';
          btn.style.borderColor = '#95a5a6';
        } else {
          btn.style.background = '#3498db';
          btn.style.borderColor = '#3498db';
        }
      }
    });

    // Apply preset settings
    switch (preset) {
      case 'blind':
        // Blind preset: Focus highlight, voice mode (if enabled), reading mode, larger text/spacing
        this.settings.focusHighlight = true;
        this.settings.readingMode = true;
        this.settings.textSize = 1.2;
        this.settings.lineSpacing = 1.2;
        if (this.voiceEnabled) {
          this.settings.voiceMode = 'push_to_talk';
        }
        break;

      case 'low-vision':
        // Low Vision preset: High contrast, larger text, larger spacing, focus highlight
        this.settings.contrastMode = true;
        this.settings.focusHighlight = true;
        this.settings.textSize = 1.5;
        this.settings.lineSpacing = 1.3;
        break;

      case 'dyslexia':
        // Dyslexia preset: Larger text, larger spacing, reading mode
        this.settings.textSize = 1.3;
        this.settings.lineSpacing = 1.5;
        this.settings.readingMode = true;
        break;

      case 'none':
        // Custom - don't change settings, user has full control
        // This is handled by reset() when needed
        break;
    }

    // Apply the settings
    this.applySettings();
    
    // Set data attribute on body for E2E testing
    document.body.setAttribute('data-raawi-preset', preset);
    this.updateTextSizeDisplay();
    this.updateLineSpacingDisplay();

    // Update UI controls to reflect preset
    this.updateUIControls();
  }

  private updateUIControls(): void {
    // Update toggle states
    const contrastToggle = this.panel?.querySelector('#raawi-contrast-toggle') as HTMLInputElement;
    const focusToggle = this.panel?.querySelector('#raawi-focus-toggle') as HTMLInputElement;
    const readingToggle = this.panel?.querySelector('#raawi-reading-toggle') as HTMLInputElement;
    const readingGuideToggle = this.panel?.querySelector('#raawi-reading-guide-toggle') as HTMLInputElement;
    const readingMaskToggle = this.panel?.querySelector('#raawi-reading-mask-toggle') as HTMLInputElement;
    const hideImagesToggle = this.panel?.querySelector('#raawi-hide-images-toggle') as HTMLInputElement;
    const imageCaptionsToggle = this.panel?.querySelector('#raawi-image-captions-toggle') as HTMLInputElement;
    const stopAnimationsToggle = this.panel?.querySelector('#raawi-stop-animations-toggle') as HTMLInputElement;
    const reduceMotionToggle = this.panel?.querySelector('#raawi-reduce-motion-toggle') as HTMLInputElement;
    const bigCursorSelect = this.panel?.querySelector('#raawi-big-cursor-select') as HTMLSelectElement;
    const magnifierToggle = this.panel?.querySelector('#raawi-magnifier-toggle') as HTMLInputElement;
    const magnifierZoomSlider = this.panel?.querySelector('#raawi-magnifier-zoom-slider') as HTMLInputElement;
    const voiceToggle = this.panel?.querySelector('#raawi-voice-toggle') as HTMLInputElement;

    if (contrastToggle) contrastToggle.checked = this.settings.contrastMode;
    if (focusToggle) focusToggle.checked = this.settings.focusHighlight;
    if (readingToggle) readingToggle.checked = this.settings.readingMode;
    if (readingGuideToggle) readingGuideToggle.checked = this.settings.readingGuide;
    if (hideImagesToggle) hideImagesToggle.checked = this.settings.hideImages;
    if (imageCaptionsToggle) imageCaptionsToggle.checked = this.settings.imageCaptions;
    if (stopAnimationsToggle) stopAnimationsToggle.checked = this.settings.stopAnimations;
    if (reduceMotionToggle) {
      // Don't allow Reduce Motion if Stop Animations is active
      reduceMotionToggle.checked = this.settings.reduceMotion && !this.settings.stopAnimations;
    }
    if (bigCursorSelect) bigCursorSelect.value = this.settings.bigCursor;
    if (magnifierToggle) {
      magnifierToggle.checked = this.settings.magnifier;
      // Show/hide zoom control
      const zoomControl = document.getElementById('raawi-magnifier-zoom-control');
      if (zoomControl) {
        zoomControl.style.display = this.settings.magnifier ? 'block' : 'none';
      }
    }
    if (magnifierZoomSlider) {
      magnifierZoomSlider.value = this.settings.magnifierZoom.toString();
      const zoomValue = document.getElementById('raawi-magnifier-zoom-value');
      if (zoomValue) {
        zoomValue.textContent = `${Math.round(this.settings.magnifierZoom * 100)}%`;
      }
    }
    if (readingMaskToggle) {
      readingMaskToggle.checked = this.settings.readingMask;
      // Show/hide height control
      const heightControl = this.panel?.querySelector('#raawi-reading-mask-height-control') as HTMLElement;
      if (heightControl) {
        heightControl.style.display = this.settings.readingMask ? 'block' : 'none';
      }
    }
    if (voiceToggle && this.voiceEnabled) {
      voiceToggle.checked = this.settings.voiceMode !== 'off';
      // Update voice mode UI if needed
      if (this.settings.voiceMode !== 'off') {
        this.setVoiceMode(true);
      }
    }
  }

  private updateVoiceIndicator(): void {
    const indicator = this.panel?.querySelector('#raawi-voice-indicator') as HTMLElement;
    if (indicator) {
      if (this.settings.voiceMode !== 'off' && this.isListening) {
        indicator.classList.add('active');
      } else {
        indicator.classList.remove('active');
      }
    }
  }

  private clearPreset(): void {
    if (this.currentPreset !== 'none') {
      this.currentPreset = 'none';
      // Update preset button styles
      const presetButtons = this.panel?.querySelectorAll('.raawi-preset-btn') as NodeListOf<HTMLButtonElement>;
      presetButtons?.forEach((btn) => {
        const btnPreset = btn.getAttribute('data-preset') as 'none' | 'blind' | 'low-vision' | 'dyslexia';
        if (btnPreset === 'none') {
          btn.style.background = '#27ae60';
          btn.style.borderColor = '#27ae60';
        } else {
          btn.style.background = '#3498db';
          btn.style.borderColor = '#3498db';
        }
      });
    }
  }

  private adjustTextSize(delta: number): void {
    this.settings.textSize = Math.max(0.8, Math.min(2.0, this.settings.textSize + delta));
    this.clearPreset(); // User manually changed, clear preset
    this.updateTextSizeDisplay();
    this.applySettings();
  }

  private adjustLineSpacing(delta: number): void {
    this.settings.lineSpacing = Math.max(0.8, Math.min(2.0, this.settings.lineSpacing + delta));
    this.clearPreset(); // User manually changed, clear preset
    this.updateLineSpacingDisplay();
    this.applySettings();
  }

  private setContrastMode(enabled: boolean): void {
    this.settings.contrastMode = enabled;
    this.clearPreset(); // User manually changed, clear preset
    this.applySettings();
    console.log('[RaawiX Widget] Contrast mode:', enabled);
  }

  private setStopAnimations(enabled: boolean): void {
    this.settings.stopAnimations = enabled;
    this.clearPreset(); // User manually changed, clear preset
    
    if (enabled) {
      this.injectStopAnimationsStyles();
      this.pauseAnimations();
      // Set data attribute for E2E testing
      document.documentElement.setAttribute('data-raawi-stop-animations', 'true');
      // If Stop Animations is ON, Reduce Motion is redundant - disable it
      if (this.settings.reduceMotion) {
        this.settings.reduceMotion = false;
        this.removeReduceMotionStyles();
        const reduceMotionToggle = document.getElementById('raawi-reduce-motion-toggle') as HTMLInputElement;
        if (reduceMotionToggle) {
          reduceMotionToggle.checked = false;
        }
      }
    } else {
      this.removeStopAnimationsStyles();
      this.resumeAnimations();
      // Remove data attribute
      document.documentElement.removeAttribute('data-raawi-stop-animations');
      // Re-apply Reduce Motion if it was enabled
      if (this.settings.reduceMotion) {
        this.injectReduceMotionStyles();
      }
    }
    
    this.applySettings();
    console.log('[RaawiX Widget] Stop animations:', enabled);
  }

  private setReduceMotion(enabled: boolean): void {
    this.settings.reduceMotion = enabled;
    this.clearPreset(); // User manually changed, clear preset
    
    // If Stop Animations is ON, Reduce Motion is redundant
    if (enabled && this.settings.stopAnimations) {
      this.settings.reduceMotion = false;
      const reduceMotionToggle = document.getElementById('raawi-reduce-motion-toggle') as HTMLInputElement;
      if (reduceMotionToggle) {
        reduceMotionToggle.checked = false;
      }
      console.log('[RaawiX Widget] Reduce Motion disabled because Stop Animations is active');
      return;
    }
    
    if (enabled) {
      this.injectReduceMotionStyles();
    } else {
      this.removeReduceMotionStyles();
    }
    
    this.applySettings();
    console.log('[RaawiX Widget] Reduce motion:', enabled);
  }

  private injectReduceMotionStyles(): void {
    if (this.reduceMotionStyleElement) {
      return; // Already injected
    }

    // Don't inject if Stop Animations is active (it's more aggressive)
    if (this.settings.stopAnimations) {
      return;
    }

    this.reduceMotionStyleElement = document.createElement('style');
    this.reduceMotionStyleElement.id = 'raawi-reduce-motion-styles';
    this.reduceMotionStyleElement.textContent = `
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        transition-delay: 0ms !important;
        scroll-behavior: auto !important;
      }
      
      html:focus-within {
        scroll-behavior: auto !important;
      }
    `;
    document.head.appendChild(this.reduceMotionStyleElement);
  }

  private removeReduceMotionStyles(): void {
    if (this.reduceMotionStyleElement) {
      if (this.reduceMotionStyleElement.parentNode) {
        this.reduceMotionStyleElement.parentNode.removeChild(this.reduceMotionStyleElement);
      }
      this.reduceMotionStyleElement = null;
    }
  }

  private setBigCursor(mode: 'off' | 'dark' | 'light'): void {
    this.settings.bigCursor = mode;
    this.clearPreset(); // User manually changed, clear preset
    
    if (mode === 'off') {
      this.removeBigCursorStyles();
    } else {
      this.injectBigCursorStyles(mode);
    }
    
    this.applySettings();
    console.log('[RaawiX Widget] Big cursor:', mode);
  }

  private injectBigCursorStyles(mode: 'dark' | 'light'): void {
    // Remove existing if any
    if (this.bigCursorStyleElement) {
      this.removeBigCursorStyles();
    }

    // Create SVG cursor data URI
    // Dark cursor: black arrow
    // Light cursor: white arrow with black outline
    const cursorSize = 32; // Larger cursor size
    const hotspotX = 2; // Cursor hotspot (tip of arrow)
    const hotspotY = 2;
    
    // Create SVG strings (properly formatted)
    const svgDark = `<svg xmlns="http://www.w3.org/2000/svg" width="${cursorSize}" height="${cursorSize}" viewBox="0 0 24 24"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" fill="black" stroke="white" stroke-width="1"/></svg>`;
    const svgLight = `<svg xmlns="http://www.w3.org/2000/svg" width="${cursorSize}" height="${cursorSize}" viewBox="0 0 24 24"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" fill="white" stroke="black" stroke-width="2"/></svg>`;

    // Encode SVG for data URI (URL encode)
    const svg = mode === 'dark' ? svgDark : svgLight;
    const encodedSvg = encodeURIComponent(svg);
    const cursorUrl = `data:image/svg+xml,${encodedSvg}`;

    this.bigCursorStyleElement = document.createElement('style');
    this.bigCursorStyleElement.id = 'raawi-big-cursor-styles';
    this.bigCursorStyleElement.textContent = `
      * {
        cursor: url("${cursorUrl}") ${hotspotX} ${hotspotY}, auto !important;
      }
      
      a, button, [role="button"], [tabindex]:not([tabindex="-1"]), input, textarea, select {
        cursor: url("${cursorUrl}") ${hotspotX} ${hotspotY}, pointer !important;
      }
    `;
    document.head.appendChild(this.bigCursorStyleElement);
  }

  private removeBigCursorStyles(): void {
    if (this.bigCursorStyleElement) {
      if (this.bigCursorStyleElement.parentNode) {
        this.bigCursorStyleElement.parentNode.removeChild(this.bigCursorStyleElement);
      }
      this.bigCursorStyleElement = null;
    }
  }

  private setMagnifier(enabled: boolean): void {
    this.settings.magnifier = enabled;
    this.clearPreset(); // User manually changed, clear preset
    
    // Show/hide zoom control
    const zoomControl = document.getElementById('raawi-magnifier-zoom-control');
    if (zoomControl) {
      zoomControl.style.display = enabled ? 'block' : 'none';
    }
    
    if (enabled) {
      this.createMagnifier();
    } else {
      this.destroyMagnifier();
    }
    
    this.applySettings();
    console.log('[RaawiX Widget] Magnifier:', enabled);
  }

  private setMagnifierZoom(zoom: number): void {
    this.settings.magnifierZoom = zoom;
    this.clearPreset(); // User manually changed, clear preset
    
    // Update display value
    const zoomValue = document.getElementById('raawi-magnifier-zoom-value');
    if (zoomValue) {
      zoomValue.textContent = `${Math.round(zoom * 100)}%`;
    }
    
    // Update magnifier if active
    if (this.settings.magnifier && this.magnifierElement) {
      this.updateMagnifierContent();
    }
    
    this.applySettings();
    console.log('[RaawiX Widget] Magnifier zoom:', zoom);
  }

  private createMagnifier(): void {
    if (this.magnifierElement) {
      return; // Already exists
    }

    // Create magnifier container
    this.magnifierElement = document.createElement('div');
    this.magnifierElement.id = 'raawi-magnifier';
    this.magnifierElement.style.cssText = `
      position: fixed;
      width: 200px;
      height: 200px;
      border: 3px solid #3498db;
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      display: none;
      background: white;
    `;

    // Create canvas for magnified content
    this.magnifierCanvas = document.createElement('canvas');
    this.magnifierCanvas.width = 200;
    this.magnifierCanvas.height = 200;
    this.magnifierCanvas.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
    `;
    this.magnifierElement.appendChild(this.magnifierCanvas);

    document.body.appendChild(this.magnifierElement);

    // Add mousemove listener (throttled)
    this.magnifierThrottle = window.setTimeout(() => {}, 0); // Initialize
    document.addEventListener('mousemove', this.handleMagnifierMove);
    document.addEventListener('mouseleave', this.handleMagnifierLeave);
  }

  private handleMagnifierMove = (e: MouseEvent): void => {
    if (!this.magnifierElement || !this.settings.magnifier) {
      return;
    }

    // Throttle updates
    if (this.magnifierThrottle !== null) {
      clearTimeout(this.magnifierThrottle);
    }
    this.magnifierThrottle = window.setTimeout(() => {
      this.updateMagnifierPosition(e.clientX, e.clientY);
      this.updateMagnifierContent();
    }, 16); // ~60fps
  };

  private handleMagnifierLeave = (): void => {
    if (this.magnifierElement) {
      this.magnifierElement.style.display = 'none';
    }
  };

  private updateMagnifierPosition(x: number, y: number): void {
    if (!this.magnifierElement) {
      return;
    }

    const size = 200;
    const offset = size / 2;

    // Position magnifier centered on cursor, but offset to avoid covering cursor
    const left = x - offset;
    const top = y - offset - 30; // Offset upward to avoid covering cursor

    this.magnifierElement.style.left = `${left}px`;
    this.magnifierElement.style.top = `${top}px`;
    this.magnifierElement.style.display = 'block';
  }

  private updateMagnifierContent(): void {
    if (!this.magnifierElement || !this.magnifierCanvas || !this.settings.magnifier) {
      return;
    }

    const rect = this.magnifierElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    this.captureMagnifierArea(centerX, centerY);
  }

  private captureMagnifierArea(centerX: number, centerY: number): void {
    if (!this.magnifierCanvas || !this.magnifierElement) {
      return;
    }

    const zoom = this.settings.magnifierZoom;
    const lensSize = 200;
    const sourceSize = lensSize / zoom;
    const sourceX = centerX - sourceSize / 2;
    const sourceY = centerY - sourceSize / 2;

    const ctx = this.magnifierCanvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, lensSize, lensSize);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, lensSize, lensSize);

    // Try to use html2canvas if available
    if ((window as any).html2canvas) {
      // Use html2canvas to capture the area
      (window as any).html2canvas(document.body, {
        x: Math.max(0, sourceX),
        y: Math.max(0, sourceY),
        width: Math.min(sourceSize, window.innerWidth - Math.max(0, sourceX)),
        height: Math.min(sourceSize, window.innerHeight - Math.max(0, sourceY)),
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      }).then((canvas: HTMLCanvasElement) => {
        if (ctx && this.magnifierCanvas && this.settings.magnifier) {
          ctx.clearRect(0, 0, lensSize, lensSize);
          // Draw the captured area scaled up
          ctx.drawImage(canvas, 0, 0, lensSize, lensSize);
        }
      }).catch(() => {
        // Fallback: show indicator
        this.fallbackMagnifierDisplay(ctx);
      });
    } else {
      // Fallback: use CSS-based approach with background image
      // For now, show a visual indicator
      this.fallbackMagnifierDisplay(ctx);
    }
  }

  private fallbackMagnifierDisplay(ctx: CanvasRenderingContext2D): void {
    // Draw a visual indicator with zoom level
    const gradient = ctx.createRadialGradient(100, 100, 0, 100, 100, 100);
    gradient.addColorStop(0, '#3498db');
    gradient.addColorStop(1, '#2980b9');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 200, 200);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔍', 100, 80);
    ctx.font = '14px Arial';
    ctx.fillText(`${Math.round(this.settings.magnifierZoom * 100)}%`, 100, 110);
    ctx.font = '12px Arial';
    ctx.fillText('Move mouse to magnify', 100, 130);
  }

  private destroyMagnifier(): void {
    if (this.magnifierElement) {
      if (this.magnifierElement.parentNode) {
        this.magnifierElement.parentNode.removeChild(this.magnifierElement);
      }
      this.magnifierElement = null;
    }
    this.magnifierCanvas = null;

    // Remove event listeners
    document.removeEventListener('mousemove', this.handleMagnifierMove);
    document.removeEventListener('mouseleave', this.handleMagnifierLeave);

    if (this.magnifierThrottle !== null) {
      clearTimeout(this.magnifierThrottle);
      this.magnifierThrottle = null;
    }
  }

  private setHideImages(enabled: boolean): void {
    this.settings.hideImages = enabled;
    this.clearPreset(); // User manually changed, clear preset
    
    if (enabled) {
      this.applyHideImages();
    } else {
      this.restoreImages();
    }
    
    this.applySettings();
    console.log('[RaawiX Widget] Hide images:', enabled);
  }

  private setImageCaptions(enabled: boolean): void {
    this.settings.imageCaptions = enabled;
    this.clearPreset(); // User manually changed, clear preset
    
    if (enabled) {
      this.applyImageCaptions();
    } else {
      this.removeImageCaptions();
    }
    
    this.applySettings();
    console.log('[RaawiX Widget] Image captions:', enabled);
  }

  private applyHideImages(): void {
    // Find all images on the page (excluding placeholders and images already processed)
    const images = document.querySelectorAll('img:not([data-raawi-placeholder])');
    
    images.forEach((img) => {
      const imageElement = img as HTMLImageElement;
      
      // Skip if already processed
      if (this.hiddenImages.has(imageElement)) {
        return;
      }

      // Skip if image is already hidden by display:none (but not by us)
      if (imageElement.style.display === 'none' && !this.hiddenImages.has(imageElement)) {
        // Check if it's in our map
        return;
      }

      // Get original dimensions (use naturalWidth/Height if available, else computed)
      const rect = imageElement.getBoundingClientRect();
      const width = imageElement.naturalWidth || imageElement.width || rect.width || 100;
      const height = imageElement.naturalHeight || imageElement.height || rect.height || 100;

      // Create placeholder
      const placeholder = document.createElement('div');
      placeholder.className = 'raawi-image-placeholder';
      placeholder.setAttribute('data-raawi-placeholder', 'true');
      placeholder.style.cssText = `
        display: inline-block;
        width: ${width}px;
        min-width: ${width}px;
        height: ${height}px;
        min-height: ${height}px;
        background: #e0e0e0;
        border: 2px dashed #999;
        position: relative;
        box-sizing: border-box;
        vertical-align: top;
      `;

      // Add placeholder text
      const placeholderText = document.createElement('span');
      placeholderText.textContent = this.context.locale === 'ar' ? 'صورة مخفية' : 'Image hidden';
      placeholderText.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #666;
        font-size: 12px;
        text-align: center;
        pointer-events: none;
        white-space: nowrap;
      `;
      placeholder.appendChild(placeholderText);

      // Replace image with placeholder
      if (imageElement.parentNode) {
        imageElement.parentNode.insertBefore(placeholder, imageElement);
        // Hide original image but keep it in DOM for restoration
        imageElement.style.display = 'none';
        // Store original for restoration
        this.hiddenImages.set(imageElement, { original: imageElement, placeholder });
        
        // If captions are enabled, update caption position
        if (this.settings.imageCaptions && this.imageCaptionElements.has(imageElement)) {
          const caption = this.imageCaptionElements.get(imageElement);
          if (caption && caption.parentNode) {
            // Move caption to be after placeholder
            if (placeholder.nextSibling !== caption) {
              if (caption.parentNode) {
                caption.parentNode.removeChild(caption);
              }
              if (placeholder.nextSibling) {
                placeholder.parentNode?.insertBefore(caption, placeholder.nextSibling);
              } else {
                placeholder.parentNode?.appendChild(caption);
              }
            }
          }
        }
      }
    });
  }

  private restoreImages(): void {
    // Restore all hidden images
    this.hiddenImages.forEach(({ original, placeholder }) => {
      if (placeholder.parentNode && original.parentNode === null) {
        // Placeholder is in DOM, original is hidden
        placeholder.parentNode.replaceChild(original, placeholder);
        original.style.display = '';
      } else if (original.style.display === 'none') {
        // Just restore display
        original.style.display = '';
        if (placeholder.parentNode) {
          placeholder.parentNode.removeChild(placeholder);
        }
      }
    });
    
    this.hiddenImages.clear();
  }

  private applyImageCaptions(): void {
    // Find all images (including hidden ones)
    const images = document.querySelectorAll('img');
    
    images.forEach((img) => {
      const imageElement = img as HTMLImageElement;
      
      // Skip if already has caption
      if (this.imageCaptionElements.has(imageElement)) {
        return;
      }

      // Skip if image is inside a figure that already has a figcaption
      const figure = imageElement.closest('figure');
      if (figure && figure.querySelector('figcaption')) {
        return; // Already has a caption
      }

      // Get caption text
      const captionText = this.getImageCaptionText(imageElement);

      // Create caption element
      const caption = document.createElement('div');
      caption.className = 'raawi-image-caption';
      caption.setAttribute('data-raawi-caption', 'true');
      caption.textContent = captionText;
      caption.style.cssText = `
        font-size: 12px;
        color: #666;
        margin-top: 4px;
        padding: 4px 8px;
        background: #f5f5f5;
        border-left: 3px solid #3498db;
        text-align: ${this.context.locale === 'ar' ? 'right' : 'left'};
        display: block;
      `;

      // Insert caption after image (or after placeholder if image is hidden)
      const placeholder = this.hiddenImages.get(imageElement);
      const targetElement = placeholder ? placeholder.placeholder : imageElement;
      
      if (targetElement && targetElement.parentNode) {
        // Insert after the target element
        if (targetElement.nextSibling) {
          targetElement.parentNode.insertBefore(caption, targetElement.nextSibling);
        } else {
          targetElement.parentNode.appendChild(caption);
        }
        this.imageCaptionElements.set(imageElement, caption);
      }
    });
  }

  private removeImageCaptions(): void {
    // Remove all caption elements
    this.imageCaptionElements.forEach((caption) => {
      if (caption.parentNode) {
        caption.parentNode.removeChild(caption);
      }
    });
    
    this.imageCaptionElements.clear();
  }

  private getImageCaptionText(img: HTMLImageElement): string {
    // Priority 1: alt text (if meaningful)
    const alt = img.getAttribute('alt');
    if (alt && alt.trim() && alt.trim() !== '') {
      return alt.trim();
    }

    // Priority 2: assistive map image description
    const assistiveDescription = this.getImageDescriptionFromAssistiveMap(img);
    if (assistiveDescription) {
      return assistiveDescription;
    }

    // Priority 3: fallback
    return this.context.locale === 'ar' ? 'صورة' : 'Image';
  }

  private injectStopAnimationsStyles(): void {
    if (this.stopAnimationsStyleElement) {
      return; // Already injected
    }

    this.stopAnimationsStyleElement = document.createElement('style');
    this.stopAnimationsStyleElement.id = 'raawi-stop-animations-styles';
    this.stopAnimationsStyleElement.textContent = `
      *,
      *::before,
      *::after {
        animation: none !important;
        transition: none !important;
        scroll-behavior: auto !important;
      }
      
      html:focus-within {
        scroll-behavior: auto !important;
      }
    `;
    document.head.appendChild(this.stopAnimationsStyleElement);
  }

  private removeStopAnimationsStyles(): void {
    if (this.stopAnimationsStyleElement) {
      if (this.stopAnimationsStyleElement.parentNode) {
        this.stopAnimationsStyleElement.parentNode.removeChild(this.stopAnimationsStyleElement);
      }
      this.stopAnimationsStyleElement = null;
    }
  }

  private pauseAnimations(): void {
    // Pause GIFs (img elements with animated src)
    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      const src = img.src;
      if (src && (src.endsWith('.gif') || src.includes('.gif?'))) {
        // Store original src
        (img as any)._raawiOriginalSrc = src;
        // Create a data URL placeholder or keep original (GIFs can't be paused via JS easily)
        // For now, we'll just note that GIFs will continue but CSS animations are stopped
      }
    });

    // Pause videos (optional - but don't break controls)
    const videos = document.querySelectorAll('video');
    videos.forEach((video) => {
      if (video.paused === false) {
        // Only pause if currently playing, and store state
        (video as any)._raawiWasPlaying = true;
        video.pause();
      } else {
        (video as any)._raawiWasPlaying = false;
      }
    });
  }

  private resumeAnimations(): void {
    // Restore videos that were playing
    const videos = document.querySelectorAll('video');
    videos.forEach((video) => {
      if ((video as any)._raawiWasPlaying === true) {
        video.play().catch(() => {
          // Ignore play errors (user interaction may be required)
        });
      }
      delete (video as any)._raawiWasPlaying;
    });

    // GIFs will resume automatically when page reloads or src is restored
    // For now, GIFs continue as-is since we can't pause them via JS
  }

  private setFocusHighlight(enabled: boolean): void {
    this.settings.focusHighlight = enabled;
    this.clearPreset(); // User manually changed, clear preset
    this.applySettings();
    console.log('[RaawiX Widget] Focus highlight:', enabled);
  }

  private setReadingMode(enabled: boolean): void {
    this.settings.readingMode = enabled;
    this.clearPreset(); // User manually changed, clear preset
    this.applySettings();
    console.log('[RaawiX Widget] Reading mode:', enabled);
  }

  private setReadingGuide(enabled: boolean): void {
    this.settings.readingGuide = enabled;
    if (enabled) {
      this.createReadingGuide();
    } else {
      this.destroyReadingGuide();
    }
    this.applySettings();
    console.log('[RaawiX Widget] Reading guide:', enabled);
  }

  private createReadingGuide(): void {
    if (this.readingGuideElement) {
      return; // Already exists
    }

    // Create reading guide element
    this.readingGuideElement = document.createElement('div');
    this.readingGuideElement.className = 'raawi-reading-guide';
    this.readingGuideElement.id = 'raawi-reading-guide';
    this.readingGuideElement.setAttribute('data-testid', 'raawi-reading-guide-overlay'); // C: E2E test selector
    this.readingGuideElement.setAttribute('aria-hidden', 'true');
    this.readingGuideElement.style.display = 'none';
    document.body.appendChild(this.readingGuideElement);

    // Add event listeners
    this.setupReadingGuideListeners();
  }

  private destroyReadingGuide(): void {
    if (this.readingGuideElement) {
      this.removeReadingGuideListeners();
      if (this.readingGuideElement.parentNode) {
        this.readingGuideElement.parentNode.removeChild(this.readingGuideElement);
      }
      this.readingGuideElement = null;
    }
  }

  private setupReadingGuideListeners(): void {
    if (!this.readingGuideElement) return;

    // Throttled mousemove handler
    const handleMouseMove = (e: MouseEvent) => {
      if (this.readingGuideThrottle) {
        clearTimeout(this.readingGuideThrottle);
      }

      this.readingGuideThrottle = window.setTimeout(() => {
        if (this.readingGuideElement && this.settings.readingGuide) {
          this.updateReadingGuidePosition(e.clientY);
        }
      }, 16); // ~60fps throttling
    };

    // Focus handler
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && this.readingGuideElement && this.settings.readingGuide) {
        const rect = target.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        this.updateReadingGuidePosition(centerY);
      }
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('focusin', handleFocus, { passive: true });

    // Store handlers for cleanup
    (this.readingGuideElement as any)._mouseMoveHandler = handleMouseMove;
    (this.readingGuideElement as any)._focusHandler = handleFocus;
  }

  private removeReadingGuideListeners(): void {
    if (!this.readingGuideElement) return;

    const mouseMoveHandler = (this.readingGuideElement as any)._mouseMoveHandler;
    const focusHandler = (this.readingGuideElement as any)._focusHandler;

    if (mouseMoveHandler) {
      document.removeEventListener('mousemove', mouseMoveHandler);
    }
    if (focusHandler) {
      document.removeEventListener('focusin', focusHandler);
    }

    if (this.readingGuideThrottle) {
      clearTimeout(this.readingGuideThrottle);
      this.readingGuideThrottle = null;
    }
  }

  private updateReadingGuidePosition(y: number): void {
    if (!this.readingGuideElement) return;

    // Update direction based on current language
    const direction = this.context.locale === 'ar' ? 'rtl' : 'ltr';
    this.readingGuideElement.setAttribute('dir', direction);

    // Show the guide
    this.readingGuideElement.style.display = 'block';
    
    // Position at mouse/focus Y coordinate (center the bar on the position)
    const barHeight = 3;
    const top = y - barHeight / 2;
    this.readingGuideElement.style.top = `${Math.max(0, Math.min(top, window.innerHeight - barHeight))}px`;
  }

  private setReadingMask(enabled: boolean): void {
    this.settings.readingMask = enabled;
    
    // Show/hide height control
    const heightControl = this.panel?.querySelector('#raawi-reading-mask-height-control') as HTMLElement;
    if (heightControl) {
      heightControl.style.display = enabled ? 'block' : 'none';
    }

    if (enabled) {
      this.createReadingMask();
    } else {
      this.destroyReadingMask();
    }
    this.applySettings();
    console.log('[RaawiX Widget] Reading mask:', enabled);
  }

  private setReadingMaskWindowHeight(height: 'small' | 'medium' | 'large'): void {
    this.settings.readingMaskWindowHeight = height;

    // Update button states
    const heightButtons = this.panel?.querySelectorAll('.raawi-mask-height-btn') as NodeListOf<HTMLButtonElement>;
    heightButtons?.forEach((btn) => {
      const btnHeight = btn.getAttribute('data-height') as 'small' | 'medium' | 'large';
      if (btnHeight === height) {
        btn.classList.add('active');
        btn.style.background = '#27ae60';
        btn.style.borderColor = '#27ae60';
      } else {
        btn.classList.remove('active');
        btn.style.background = '#3498db';
        btn.style.borderColor = '#3498db';
      }
    });

    // Update mask window if enabled
    if (this.settings.readingMask && this.readingMaskTopOverlay && this.readingMaskBottomOverlay) {
      // Trigger position update to recalculate with new height
      const focusedElement = document.activeElement as HTMLElement;
      if (focusedElement && focusedElement !== document.body) {
        const rect = focusedElement.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        this.updateReadingMaskPosition(centerY);
      }
    }

    this.applySettings();
  }

  private createReadingMask(): void {
    if (this.readingMaskTopOverlay && this.readingMaskBottomOverlay) {
      return; // Already exists
    }

    // Create top overlay
    this.readingMaskTopOverlay = document.createElement('div');
    this.readingMaskTopOverlay.className = 'raawi-reading-mask-overlay raawi-reading-mask-overlay-top';
    this.readingMaskTopOverlay.id = 'raawi-reading-mask-top';
    this.readingMaskTopOverlay.setAttribute('data-testid', 'raawi-reading-mask-overlay'); // C: E2E test selector
    this.readingMaskTopOverlay.setAttribute('aria-hidden', 'true');
    this.readingMaskTopOverlay.style.display = 'none';
    document.body.appendChild(this.readingMaskTopOverlay);

    // Create bottom overlay
    this.readingMaskBottomOverlay = document.createElement('div');
    this.readingMaskBottomOverlay.className = 'raawi-reading-mask-overlay raawi-reading-mask-overlay-bottom';
    this.readingMaskBottomOverlay.id = 'raawi-reading-mask-bottom';
    this.readingMaskBottomOverlay.setAttribute('data-testid', 'raawi-reading-mask-overlay'); // C: E2E test selector
    this.readingMaskBottomOverlay.setAttribute('aria-hidden', 'true');
    this.readingMaskBottomOverlay.style.display = 'none';
    document.body.appendChild(this.readingMaskBottomOverlay);

    // Add event listeners
    this.setupReadingMaskListeners();
  }

  private destroyReadingMask(): void {
    if (this.readingMaskTopOverlay) {
      this.removeReadingMaskListeners();
      if (this.readingMaskTopOverlay.parentNode) {
        this.readingMaskTopOverlay.parentNode.removeChild(this.readingMaskTopOverlay);
      }
      this.readingMaskTopOverlay = null;
    }

    if (this.readingMaskBottomOverlay) {
      if (this.readingMaskBottomOverlay.parentNode) {
        this.readingMaskBottomOverlay.parentNode.removeChild(this.readingMaskBottomOverlay);
      }
      this.readingMaskBottomOverlay = null;
    }
  }

  private setupReadingMaskListeners(): void {
    if (!this.readingMaskTopOverlay || !this.readingMaskBottomOverlay) return;

    // Throttled mousemove handler
    const handleMouseMove = (e: MouseEvent) => {
      if (this.readingMaskThrottle) {
        clearTimeout(this.readingMaskThrottle);
      }

      this.readingMaskThrottle = window.setTimeout(() => {
        if (this.readingMaskTopOverlay && this.readingMaskBottomOverlay && this.settings.readingMask) {
          this.updateReadingMaskPosition(e.clientY);
        }
      }, 16); // ~60fps throttling
    };

    // Focus handler
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && this.readingMaskTopOverlay && this.readingMaskBottomOverlay && this.settings.readingMask) {
        const rect = target.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        this.updateReadingMaskPosition(centerY);
      }
    };

    // Window resize handler
    const handleResize = () => {
      if (this.readingMaskTopOverlay && this.readingMaskBottomOverlay && this.settings.readingMask) {
        // Update position based on current focus or mouse
        const focusedElement = document.activeElement as HTMLElement;
        if (focusedElement && focusedElement !== document.body && focusedElement !== document.documentElement) {
          const rect = focusedElement.getBoundingClientRect();
          const centerY = rect.top + rect.height / 2;
          this.updateReadingMaskPosition(centerY);
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('focusin', handleFocus, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    // Store handlers for cleanup
    (this.readingMaskTopOverlay as any)._mouseMoveHandler = handleMouseMove;
    (this.readingMaskTopOverlay as any)._focusHandler = handleFocus;
    (this.readingMaskTopOverlay as any)._resizeHandler = handleResize;

    // Initialize position if there's a focused element
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement && focusedElement !== document.body && focusedElement !== document.documentElement) {
      const rect = focusedElement.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      this.updateReadingMaskPosition(centerY);
    }
  }

  private removeReadingMaskListeners(): void {
    if (!this.readingMaskTopOverlay) return;

    const mouseMoveHandler = (this.readingMaskTopOverlay as any)._mouseMoveHandler;
    const focusHandler = (this.readingMaskTopOverlay as any)._focusHandler;
    const resizeHandler = (this.readingMaskTopOverlay as any)._resizeHandler;

    if (mouseMoveHandler) {
      document.removeEventListener('mousemove', mouseMoveHandler);
    }
    if (focusHandler) {
      document.removeEventListener('focusin', focusHandler);
    }
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
    }

    if (this.readingMaskThrottle) {
      clearTimeout(this.readingMaskThrottle);
      this.readingMaskThrottle = null;
    }
  }

  private updateReadingMaskPosition(y: number): void {
    if (!this.readingMaskTopOverlay || !this.readingMaskBottomOverlay) return;

    // Get window height based on setting
    const windowHeights = {
      small: 80,
      medium: 120,
      large: 180,
    };
    const windowHeight = windowHeights[this.settings.readingMaskWindowHeight];
    const halfHeight = windowHeight / 2;

    // Calculate top and bottom overlay heights
    const topHeight = Math.max(0, y - halfHeight);
    const bottomStart = y + halfHeight;
    const bottomHeight = Math.max(0, window.innerHeight - bottomStart);

    // Update direction based on current language
    const direction = this.context.locale === 'ar' ? 'rtl' : 'ltr';
    this.readingMaskTopOverlay.setAttribute('dir', direction);
    this.readingMaskBottomOverlay.setAttribute('dir', direction);

    // Show overlays
    this.readingMaskTopOverlay.style.display = 'block';
    this.readingMaskBottomOverlay.style.display = 'block';

    // Update positions
    this.readingMaskTopOverlay.style.height = `${topHeight}px`;
    this.readingMaskBottomOverlay.style.height = `${bottomHeight}px`;
  }

  private updateTextSizeDisplay(): void {
    const valueEl = document.getElementById('raawi-text-size-value');
    if (valueEl) {
      valueEl.textContent = `${Math.round(this.settings.textSize * 100)}%`;
    }
  }

  private updateLineSpacingDisplay(): void {
    const valueEl = document.getElementById('raawi-line-spacing-value');
    if (valueEl) {
      valueEl.textContent = `${Math.round(this.settings.lineSpacing * 100)}%`;
    }
  }

  private applySettings(): void {
    const root = document.documentElement;

    // Text size - always set the CSS variable, use attribute as flag
    root.style.setProperty('--raawi-text-size', this.settings.textSize.toString());
    if (this.settings.textSize !== 1.0) {
      root.setAttribute('data-raawi-text-size', '');
    } else {
      root.removeAttribute('data-raawi-text-size');
    }

    // Line spacing - always set the CSS variable, use attribute as flag
    root.style.setProperty('--raawi-line-spacing', this.settings.lineSpacing.toString());
    if (this.settings.lineSpacing !== 1.0) {
      root.setAttribute('data-raawi-line-spacing', '');
    } else {
      root.removeAttribute('data-raawi-line-spacing');
    }

    // Contrast mode
    if (this.settings.contrastMode) {
      root.setAttribute('data-raawi-contrast-mode', 'true');
    } else {
      root.removeAttribute('data-raawi-contrast-mode');
    }

    // Stop animations
    if (this.settings.stopAnimations) {
      if (!this.stopAnimationsStyleElement) {
        this.injectStopAnimationsStyles();
        this.pauseAnimations();
      }
      // If Stop Animations is ON, ensure Reduce Motion is off
      if (this.settings.reduceMotion) {
        this.settings.reduceMotion = false;
        this.removeReduceMotionStyles();
      }
    } else {
      if (this.stopAnimationsStyleElement) {
        this.removeStopAnimationsStyles();
        this.resumeAnimations();
      }
      // Re-apply Reduce Motion if it was enabled
      if (this.settings.reduceMotion) {
        if (!this.reduceMotionStyleElement) {
          this.injectReduceMotionStyles();
        }
      }
    }

    // Reduce motion (only if Stop Animations is not active)
    if (this.settings.reduceMotion && !this.settings.stopAnimations) {
      if (!this.reduceMotionStyleElement) {
        this.injectReduceMotionStyles();
      }
    } else {
      if (this.reduceMotionStyleElement) {
        this.removeReduceMotionStyles();
      }
    }

    // Big cursor
    if (this.settings.bigCursor !== 'off') {
      if (!this.bigCursorStyleElement) {
        this.injectBigCursorStyles(this.settings.bigCursor);
      } else {
        // Update if mode changed
        this.removeBigCursorStyles();
        this.injectBigCursorStyles(this.settings.bigCursor);
      }
    } else {
      if (this.bigCursorStyleElement) {
        this.removeBigCursorStyles();
      }
    }

    // Magnifier
    if (this.settings.magnifier) {
      if (!this.magnifierElement) {
        this.createMagnifier();
      }
      // Update zoom if changed
      if (this.magnifierElement) {
        this.updateMagnifierContent();
      }
    } else {
      if (this.magnifierElement) {
        this.destroyMagnifier();
      }
    }

    // Hide Images
    if (this.settings.hideImages) {
      this.applyHideImages();
    } else {
      this.restoreImages();
    }

    // Image Captions
    if (this.settings.imageCaptions) {
      this.applyImageCaptions();
    } else {
      this.removeImageCaptions();
    }

    // Focus highlight
    if (this.settings.focusHighlight) {
      root.setAttribute('data-raawi-focus-highlight', 'true');
    } else {
      root.removeAttribute('data-raawi-focus-highlight');
    }

    // Reading mode
    if (this.settings.readingMode) {
      root.setAttribute('data-raawi-reading-mode', 'true');
    } else {
      root.removeAttribute('data-raawi-reading-mode');
    }

    // Reading guide
    if (this.settings.readingGuide) {
      if (!this.readingGuideElement) {
        this.createReadingGuide();
      }
    } else {
      if (this.readingGuideElement) {
        this.destroyReadingGuide();
      }
    }

    // Reading mask
    if (this.settings.readingMask) {
      if (!this.readingMaskTopOverlay || !this.readingMaskBottomOverlay) {
        this.createReadingMask();
      }
    } else {
      if (this.readingMaskTopOverlay || this.readingMaskBottomOverlay) {
        this.destroyReadingMask();
      }
    }

    // Update UI controls
    const contrastToggle = document.getElementById('raawi-contrast-toggle') as HTMLInputElement;
    const focusToggle = document.getElementById('raawi-focus-toggle') as HTMLInputElement;
    const readingToggle = document.getElementById('raawi-reading-toggle') as HTMLInputElement;
    const readingGuideToggle = document.getElementById('raawi-reading-guide-toggle') as HTMLInputElement;
    const readingMaskToggle = document.getElementById('raawi-reading-mask-toggle') as HTMLInputElement;
    const stopAnimationsToggle = document.getElementById('raawi-stop-animations-toggle') as HTMLInputElement;
    const reduceMotionToggle = document.getElementById('raawi-reduce-motion-toggle') as HTMLInputElement;
    const bigCursorSelect = document.getElementById('raawi-big-cursor-select') as HTMLSelectElement;
    const magnifierToggle = document.getElementById('raawi-magnifier-toggle') as HTMLInputElement;
    const magnifierZoomSlider = document.getElementById('raawi-magnifier-zoom-slider') as HTMLInputElement;

    if (contrastToggle) contrastToggle.checked = this.settings.contrastMode;
    if (focusToggle) focusToggle.checked = this.settings.focusHighlight;
    if (readingToggle) readingToggle.checked = this.settings.readingMode;
    if (readingGuideToggle) readingGuideToggle.checked = this.settings.readingGuide;
    if (readingMaskToggle) {
      readingMaskToggle.checked = this.settings.readingMask;
      // Show/hide height control
      const heightControl = document.getElementById('raawi-reading-mask-height-control');
      if (heightControl) {
        heightControl.style.display = this.settings.readingMask ? 'block' : 'none';
      }
    }
    if (stopAnimationsToggle) stopAnimationsToggle.checked = this.settings.stopAnimations;
    if (reduceMotionToggle) {
      // Don't allow Reduce Motion if Stop Animations is active
      reduceMotionToggle.checked = this.settings.reduceMotion && !this.settings.stopAnimations;
    }
    if (bigCursorSelect) bigCursorSelect.value = this.settings.bigCursor;
    if (magnifierToggle) {
      magnifierToggle.checked = this.settings.magnifier;
      // Show/hide zoom control
      const zoomControl = document.getElementById('raawi-magnifier-zoom-control');
      if (zoomControl) {
        zoomControl.style.display = this.settings.magnifier ? 'block' : 'none';
      }
    }
    if (magnifierZoomSlider) {
      magnifierZoomSlider.value = this.settings.magnifierZoom.toString();
      const zoomValue = document.getElementById('raawi-magnifier-zoom-value');
      if (zoomValue) {
        zoomValue.textContent = `${Math.round(this.settings.magnifierZoom * 100)}%`;
      }
    }
  }

  private reset(): void {
    this.settings = {
      textSize: 1.0,
      lineSpacing: 1.0,
      contrastMode: false,
      focusHighlight: false,
      readingMode: false,
      readingGuide: false,
      readingMask: false,
      readingMaskWindowHeight: 'medium',
      hideImages: false,
      imageCaptions: false,
      stopAnimations: false,
      reduceMotion: false,
      bigCursor: 'off',
      magnifier: false,
      magnifierZoom: 2.0,
      voiceMode: 'off',
      translateLanguage: 'off',
    };
    
    // Destroy reading guide if it exists
    if (this.readingGuideElement) {
      this.destroyReadingGuide();
    }

    // Destroy reading mask if it exists
    if (this.readingMaskTopOverlay || this.readingMaskBottomOverlay) {
      this.destroyReadingMask();
    }

    // Remove stop animations styles if they exist
    if (this.stopAnimationsStyleElement) {
      this.removeStopAnimationsStyles();
      this.resumeAnimations();
    }

    // Remove reduce motion styles if they exist
    if (this.reduceMotionStyleElement) {
      this.removeReduceMotionStyles();
    }

    // Remove big cursor styles if they exist
    if (this.bigCursorStyleElement) {
      this.removeBigCursorStyles();
    }

    // Destroy magnifier if it exists
    if (this.magnifierElement) {
      this.destroyMagnifier();
    }

    // Restore images and remove captions
    this.restoreImages();
    this.removeImageCaptions();
    this.currentPreset = 'none';
    
    // Reset preset button styles
    const presetButtons = this.panel?.querySelectorAll('.raawi-preset-btn') as NodeListOf<HTMLButtonElement>;
    presetButtons?.forEach((btn) => {
      const btnPreset = btn.getAttribute('data-preset') as 'none' | 'blind' | 'low-vision' | 'dyslexia';
      if (btnPreset === 'none') {
        btn.style.background = '#27ae60';
        btn.style.borderColor = '#27ae60';
      } else {
        btn.style.background = '#3498db';
        btn.style.borderColor = '#3498db';
      }
    });
    
    this.updateTextSizeDisplay();
    this.updateLineSpacingDisplay();
    if (this.isListening) {
      this.stopListening();
    }
    this.updateUIControls();
    this.applySettings();
  }

  // ==================== Narration Engine Implementation ====================

  /**
   * Fetch page package from API (Third Layer - single fetch)
   */
  private async fetchPagePackageAsync(): Promise<void> {
    if (!this.apiUrl) return;

    try {
      // Use page-package endpoint (single fetch)
      const domain = new URL(window.location.href).hostname;
      const url = `${this.apiUrl}/api/widget/page-package?domain=${encodeURIComponent(domain)}&url=${encodeURIComponent(window.location.href)}`;
      const response = await fetch(url);
      if (response.ok) {
        this.cachedPagePackage = await response.json();
        this.cachedSemanticModel = this.cachedPagePackage?.semanticModel || null;
        console.log('[RaawiX Widget] Page package fetched from API');
        
        // Extract guidance and issues from package for backward compatibility
        if (this.cachedPagePackage?.guidance) {
          this.cachedGuidance = {
            url: this.cachedPagePackage.url || '',
            summary: this.cachedPagePackage.guidance.summary || '',
            landmarks: this.cachedPagePackage.guidance.landmarks || [],
            formSteps: this.cachedPagePackage.guidance.formSteps || [],
            keyActions: this.cachedPagePackage.guidance.keyActions || [],
            matchedUrl: this.cachedPagePackage.matchedUrl || '',
            matchConfidence: this.cachedPagePackage.matchConfidence || 'low',
            scanTimestamp: this.cachedPagePackage.scanTimestamp || undefined,
            pageFingerprint: this.cachedPagePackage.fingerprint || undefined,
          };
        }
        
        // Check for stale scan
        if (this.cachedGuidance) {
          this.checkStaleScan(this.cachedGuidance);
          this.showScanFreshness(this.cachedGuidance);
        }
      } else if (response.status === 404) {
        // Page package not found - fall back to separate endpoints
        console.log('[RaawiX Widget] Page package not found, falling back to separate endpoints');
        await this.fetchGuidanceAsync();
      }
    } catch (error) {
      console.warn('[RaawiX Widget] Failed to fetch page package:', error);
      // Fall back to separate endpoints
      await this.fetchGuidanceAsync();
    }
  }

  /**
   * Fetch guidance from API asynchronously (non-blocking) - fallback method
   */
  private async fetchGuidanceAsync(): Promise<void> {
    if (!this.apiUrl) return;

    try {
      const url = `${this.apiUrl}/api/widget/guidance?url=${encodeURIComponent(window.location.href)}&scanId=${this.scanId || 'latest'}`;
      const response = await fetch(url);
      if (response.ok) {
        this.cachedGuidance = await response.json();
        console.log('[RaawiX Widget] Guidance fetched from API');
        
        // Check for stale scan
        this.checkStaleScan(this.cachedGuidance);
        
        // Show scan freshness info
        this.showScanFreshness(this.cachedGuidance);
      }
    } catch (error) {
      console.warn('[RaawiX Widget] Failed to fetch guidance:', error);
    }
  }

  /**
   * Check if scan is stale and show warning if needed
   */
  private checkStaleScan(guidance: PageGuidance | null): void {
    if (!guidance || !guidance.pageFingerprint) {
      return;
    }

    // Compute current page fingerprint
    const currentFingerprint = this.computeCurrentPageFingerprint();
    const scanFingerprint = guidance.pageFingerprint;

    // Compare fingerprints
    const similarity = this.compareFingerprints(currentFingerprint, scanFingerprint);
    
    // Show warning if:
    // - Match confidence is low/medium, OR
    // - Fingerprint similarity is low (< 0.5)
    const shouldWarn = 
      (guidance.matchConfidence === 'low' || guidance.matchConfidence === 'medium') ||
      similarity < 0.5;

    if (shouldWarn) {
      this.showStaleScanWarning();
    }
  }

  /**
   * Compute current page fingerprint from live DOM
   */
  private computeCurrentPageFingerprint(): { title?: string; firstHeading?: string; mainTextHash?: string } {
    const fingerprint: { title?: string; firstHeading?: string; mainTextHash?: string } = {};

    // Title
    const title = document.title?.trim();
    if (title) {
      fingerprint.title = title;
    }

    // First H1 or H2
    const h1 = document.querySelector('h1');
    const h2 = document.querySelector('h2');
    
    if (h1 && h1.textContent) {
      fingerprint.firstHeading = h1.textContent.trim();
    } else if (h2 && h2.textContent) {
      fingerprint.firstHeading = h2.textContent.trim();
    }

    // Main content hash
    const main = document.querySelector('main') || document.body;
    if (main) {
      const textContent = main.textContent?.replace(/\s+/g, ' ').trim() || '';
      const truncatedText = textContent.substring(0, 2000);
      
      if (truncatedText.length > 0) {
        fingerprint.mainTextHash = this.simpleHash(truncatedText);
      }
    }

    return fingerprint;
  }

  /**
   * Simple hash function for browser
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Compare two fingerprints
   */
  private compareFingerprints(
    fp1: { title?: string; firstHeading?: string; mainTextHash?: string },
    fp2: { title?: string; firstHeading?: string; mainTextHash?: string }
  ): number {
    let score = 0;
    let factors = 0;

    if (fp1.title && fp2.title) {
      factors++;
      if (fp1.title.toLowerCase() === fp2.title.toLowerCase()) {
        score += 0.5;
      } else if (fp1.title.toLowerCase().includes(fp2.title.toLowerCase()) || 
                 fp2.title.toLowerCase().includes(fp1.title.toLowerCase())) {
        score += 0.3;
      }
    }

    if (fp1.firstHeading && fp2.firstHeading) {
      factors++;
      if (fp1.firstHeading.toLowerCase() === fp2.firstHeading.toLowerCase()) {
        score += 0.5;
      } else if (fp1.firstHeading.toLowerCase().includes(fp2.firstHeading.toLowerCase()) ||
                 fp2.firstHeading.toLowerCase().includes(fp1.firstHeading.toLowerCase())) {
        score += 0.3;
      }
    }

    if (fp1.mainTextHash && fp2.mainTextHash) {
      factors++;
      if (fp1.mainTextHash === fp2.mainTextHash) {
        score += 1.0;
      }
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Show scan freshness information (subtle, informational)
   */
  private showScanFreshness(guidance: PageGuidance | null): void {
    if (!guidance || !guidance.scanTimestamp) {
      return;
    }

    // Remove existing freshness display if present
    const existing = this.panel?.querySelector('#raawi-scan-freshness');
    if (existing) {
      existing.remove();
    }

    const completedAt = guidance.scanTimestamp.completedAt || guidance.scanTimestamp.startedAt;
    if (!completedAt) {
      return;
    }

    // Format date (e.g., "Jan 15, 2024")
    const scanDate = new Date(completedAt);
    const formattedDate = scanDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const freshness = document.createElement('div');
    freshness.id = 'raawi-scan-freshness';
    freshness.style.cssText = `
      margin-top: 10px;
      padding: 8px;
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      font-size: 0.8em;
      color: #6c757d;
      text-align: center;
    `;
    freshness.textContent = `Guidance based on scan from ${formattedDate}`;
    freshness.setAttribute('aria-live', 'polite');

    // Insert after narration controls or at end of panel
    const narrationControls = this.panel?.querySelector('#raawi-narration-controls');
    if (narrationControls) {
      narrationControls.insertAdjacentElement('afterend', freshness);
    } else if (this.panel) {
      this.panel.appendChild(freshness);
    }
  }

  /**
   * Show non-blocking stale scan warning
   */
  private showStaleScanWarning(): void {
    // Check if warning already shown
    if (this.panel?.querySelector('#raawi-stale-scan-warning')) {
      return;
    }

    const warning = document.createElement('div');
    warning.id = 'raawi-stale-scan-warning';
    warning.style.cssText = `
      margin-top: 10px;
      padding: 10px;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 4px;
      font-size: 0.85em;
      color: #856404;
    `;
    warning.innerHTML = `
      <strong>⚠️ Scan Notice:</strong><br>
      Guidance may be based on an older or different page version. 
      Using DOM-only reading for content, scan data for general hints.
    `;
    warning.setAttribute('role', 'alert');
    warning.setAttribute('aria-live', 'polite');

    // Insert after scan freshness or narration controls
    const freshness = this.panel?.querySelector('#raawi-scan-freshness');
    const narrationControls = this.panel?.querySelector('#raawi-narration-controls');
    
    if (freshness) {
      freshness.insertAdjacentElement('afterend', warning);
    } else if (narrationControls) {
      narrationControls.insertAdjacentElement('afterend', warning);
    } else if (this.panel) {
      this.panel.appendChild(warning);
    }
  }

  /**
   * Fetch issues from API
   */
  private async fetchIssuesAsync(): Promise<PageIssues | null> {
    if (!this.apiUrl) return null;

    if (this.cachedIssues) return this.cachedIssues;

    try {
      const url = `${this.apiUrl}/api/widget/issues?url=${encodeURIComponent(window.location.href)}&scanId=${this.scanId || 'latest'}`;
      const response = await fetch(url);
      if (response.ok) {
        this.cachedIssues = await response.json();
        return this.cachedIssues;
      }
    } catch (error) {
      console.warn('[RaawiX Widget] Failed to fetch issues:', error);
    }
    return null;
  }

  /**
   * Build reading queue from DOM and API guidance
   * 
   * GUIDANCE VS CONTENT CONTRACT:
   * Scan data NEVER replaces live page content. The widget ALWAYS reads live DOM for content
   * and uses scan data ONLY for:
   *   - Page structure and ordering
   *   - Landmarks and navigation hints
   *   - Key actions descriptions
   *   - Known accessibility issues
   * 
   * HYBRID APPROACH:
   * - Always reads LIVE DOM text for actual content (never HTML snapshot)
   * - Never reads HTML snapshot content directly
   * - Uses scan guidance for structure, ordering, and metadata only
   * 
   * This ensures narration reflects current page state while benefiting from scan intelligence.
   */
  private buildReadingQueue(mode: 'full' | 'summary' | 'detailed-summary'): ReadingQueue {
    if (this.semanticMode && this.cachedSemanticModel) {
      return this.buildSemanticReadingQueue(mode);
    }

    const segments: ReadingSegment[] = [];
    let priority = 0;

    // 1. Page title
    const pageTitle = document.title || 'Page';
    segments.push({
      id: 'title',
      type: 'title',
      text: `Page: ${pageTitle}`,
      priority: priority++,
    });

    // 2. Main summary (1-2 sentences)
    let summaryText = '';
    if (this.cachedGuidance?.summary) {
      summaryText = this.cachedGuidance.summary;
    } else {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        summaryText = metaDesc.getAttribute('content') || '';
      } else {
        const main = document.querySelector('main');
        if (main) {
          const firstPara = main.querySelector('p');
          if (firstPara) {
            const text = firstPara.textContent || '';
            summaryText = text.substring(0, 200).split('.').slice(0, 2).join('.') + '.';
          }
        }
      }
    }
    if (!summaryText && this.cachedPagePackage?.semanticModel?.structure) {
      const pageBlock = (this.cachedPagePackage.semanticModel.structure as Array<Record<string, unknown>>).find(
        (block) => block?.type === 'page' || block?.type === 'heading'
      );
      if (pageBlock && typeof pageBlock.content === 'string') {
        summaryText = pageBlock.content;
      }
    }

    if (summaryText) {
      segments.push({
        id: 'summary',
        type: 'summary',
        text: `Summary: ${summaryText}`,
        priority: priority++,
      });
    }

    if (mode === 'summary') {
      return { segments, currentIndex: 0, mode };
    }

    // 3. Sections from main content (H2/H3 + first 1-2 sentences)
    const main = document.querySelector('main');
    if (main) {
      const headings = main.querySelectorAll('h2, h3');
      headings.forEach((heading) => {
        if (this.isElementVisible(heading as HTMLElement) && !this.isElementHidden(heading as HTMLElement)) {
          const headingText = heading.textContent?.trim() || '';
          if (headingText) {
            // Find next paragraph or content
            let contentText = '';
            let nextEl = heading.nextElementSibling;
            while (nextEl && !contentText && nextEl !== main.querySelector('h2, h3')) {
              if (nextEl.tagName === 'P' || nextEl.tagName === 'DIV') {
                const text = nextEl.textContent?.trim() || '';
                if (text.length > 20) {
                  contentText = text.split('.').slice(0, 2).join('.') + '.';
                  break;
                }
              }
              nextEl = nextEl.nextElementSibling;
            }

            segments.push({
              id: `section-${priority}`,
              type: 'section',
              text: contentText ? `${headingText}. ${contentText}` : headingText,
              heading: headingText,
              element: heading as HTMLElement,
              priority: priority++,
            });
          }
        }
      });
    }

    if (mode === 'detailed-summary') {
      return { segments, currentIndex: 0, mode };
    }

    // 4. Cards (from API or DOM)
    if (this.cachedGuidance?.keyActions) {
      const topCards = this.cachedGuidance.keyActions.slice(0, 5);
      topCards.forEach((action, idx) => {
        segments.push({
          id: `card-${idx}`,
          type: 'card',
          text: `${action.label}. ${action.description || ''}`,
          heading: action.label,
          element: action.selector ? document.querySelector(action.selector) as HTMLElement : null,
          priority: priority++,
        });
      });
    } else {
      // Fallback: find cards in DOM
      const cards = main?.querySelectorAll('article, .card, [class*="card"]') || [];
      cards.forEach((card, idx) => {
        if (idx < 5 && this.isElementVisible(card as HTMLElement)) {
          const title = card.querySelector('h2, h3, h4, .title, [class*="title"]');
          const cta = card.querySelector('button, a, [role="button"]');
          const titleText = title?.textContent?.trim() || '';
          const ctaText = cta ? this.getAccessibleLabel(cta as HTMLElement) : '';
          if (titleText) {
            segments.push({
              id: `card-${idx}`,
              type: 'card',
              text: `${titleText}. ${ctaText ? `Action: ${ctaText}` : ''}`,
              heading: titleText,
              element: card as HTMLElement,
              priority: priority++,
            });
          }
        }
      });
    }

    // 5. Forms (from API or DOM)
    if (this.cachedGuidance?.formSteps && this.cachedGuidance.formSteps.length > 0) {
      this.cachedGuidance.formSteps.forEach((step, idx) => {
        const fieldsText = step.fields.map(f => {
          const req = f.required ? 'required' : 'optional';
          return `${f.label || 'Field'} (${f.type || 'text'}, ${req})`;
        }).join(', ');
        segments.push({
          id: `form-${idx}`,
          type: 'form',
          text: `Form: ${step.label}. Fields: ${fieldsText}`,
          heading: step.label,
          priority: priority++,
        });
      });
    } else {
      // Fallback: find forms in DOM
      const forms = document.querySelectorAll('form');
      forms.forEach((form, idx) => {
        if (idx < 2 && this.isElementVisible(form as HTMLElement)) {
          const formLabel = form.getAttribute('aria-label') || form.querySelector('legend, h2, h3')?.textContent || 'Form';
          const fields = form.querySelectorAll('input, textarea, select');
          const fieldsText = Array.from(fields).slice(0, 5).map(f => {
            const label = this.getAccessibleLabel(f as HTMLElement) || 'Field';
            const req = (f as HTMLInputElement).required ? 'required' : 'optional';
            return `${label} (${req})`;
          }).join(', ');
          if (fieldsText) {
            segments.push({
              id: `form-${idx}`,
              type: 'form',
              text: `${formLabel}. Fields: ${fieldsText}`,
              heading: formLabel,
              element: form as HTMLElement,
              priority: priority++,
            });
          }
        }
      });
    }

    // 6. Key actions (top 5)
    if (this.cachedGuidance?.keyActions) {
      this.cachedGuidance.keyActions.slice(0, 5).forEach((action, idx) => {
        segments.push({
          id: `action-${idx}`,
          type: 'action',
          text: `Action: ${action.label}. ${action.description || ''}`,
          heading: action.label,
          element: action.selector ? document.querySelector(action.selector) as HTMLElement : null,
          priority: priority++,
        });
      });
    } else if (this.cachedPagePackage?.semanticModel?.actions) {
      const semanticActions = this.cachedPagePackage.semanticModel.actions as Array<Record<string, unknown>>;
      semanticActions.slice(0, 5).forEach((action, idx) => {
        const label = typeof action?.label === 'string' ? action.label : 'Page action';
        const description = typeof action?.type === 'string' ? `Type: ${action.type}` : '';
        const selector = typeof action?.selector === 'string' ? action.selector : undefined;

        segments.push({
          id: `action-${idx}`,
          type: 'action',
          text: `Action: ${label}. ${description}`,
          heading: label,
          element: selector ? document.querySelector(selector) as HTMLElement : null,
          priority: priority++,
        });
      });
    }

    return { segments, currentIndex: 0, mode };
  }

  private buildSemanticReadingQueue(mode: 'full' | 'summary' | 'detailed-summary'): ReadingQueue {
    const segments: ReadingSegment[] = [];
    let priority = 0;
    const model = this.cachedSemanticModel as any;

    const pageTitle = document.title || model?.metadata?.title || 'Page';
    segments.push({
      id: 'title',
      type: 'title',
      text: `Page: ${pageTitle}`,
      priority: priority++,
    });

    const summaryText = this.getSemanticSummary(model);
    if (summaryText) {
      segments.push({
        id: 'summary',
        type: 'summary',
        text: `Summary: ${summaryText}`,
        priority: priority++,
      });
    }

    if (mode === 'summary') {
      return { segments, currentIndex: 0, mode };
    }

    const sections = this.getSemanticSections(model);
    sections.slice(0, 5).forEach((section, idx) => {
      segments.push({
        id: `section-${idx}`,
        type: 'section',
        text: section.text,
        heading: section.heading,
        element: this.findSemanticElement(section.selector),
        priority: priority++,
      });
    });

    if (mode === 'detailed-summary') {
      return { segments, currentIndex: 0, mode };
    }

    const forms = this.getSemanticForms(model);
    forms.slice(0, 3).forEach((form, idx) => {
      segments.push({
        id: `form-${idx}`,
        type: 'form',
        text: form.text,
        heading: form.heading,
        element: this.findSemanticElement(form.selector),
        priority: priority++,
      });
    });

    const actions = this.getSemanticActions(model);
    actions.slice(0, 5).forEach((action, idx) => {
      segments.push({
        id: `action-${idx}`,
        type: 'action',
        text: action.text,
        heading: action.label,
        element: this.findSemanticElement(action.selector),
        priority: priority++,
      });
    });

    return { segments, currentIndex: 0, mode };
  }

  private getSemanticSummary(model: any): string | null {
    if (!model?.structure || !Array.isArray(model.structure)) {
      return null;
    }

    const pageBlock = model.structure.find((block: any) => block?.type === 'page' && typeof block?.content === 'string');
    if (pageBlock) {
      return pageBlock.content;
    }

    const headingBlock = model.structure.find((block: any) => block?.type === 'heading' && typeof block?.content === 'string');
    if (headingBlock) {
      return headingBlock.content;
    }

    const paragraphBlock = model.structure.find((block: any) => block?.type === 'paragraph' && typeof block?.content === 'string');
    return paragraphBlock?.content || null;
  }

  private getSemanticSections(model: any): Array<{ heading: string; text: string; selector?: string }> {
    if (!model?.structure || !Array.isArray(model.structure)) {
      return [];
    }

    return model.structure
      .filter((block: any) => ['section', 'heading', 'paragraph', 'list'].includes(block?.type))
      .map((block: any) => ({
        heading: typeof block?.label === 'string' ? block.label : (typeof block?.content === 'string' ? block.content.split('.')[0] : 'Section'),
        text: typeof block?.content === 'string' ? block.content : '',
        selector: typeof block?.selector === 'string' ? block.selector : undefined,
      }));
  }

  private getSemanticForms(model: any): Array<{ heading: string; text: string; selector?: string }> {
    if (!model?.structure || !Array.isArray(model.structure)) {
      return [];
    }

    return model.structure
      .filter((block: any) => block?.type === 'form')
      .map((block: any) => ({
        heading: typeof block?.label === 'string' ? block.label : 'Form',
        text: Array.isArray(block?.fields)
          ? block.fields.slice(0, 4).map((field: any) => `${field?.label || 'Field'}${field?.required ? ' (required)' : ''}`).join(', ')
          : 'Form fields available',
        selector: typeof block?.selector === 'string' ? block.selector : undefined,
      }));
  }

  private getSemanticActions(model: any): Array<{ label: string; text: string; selector?: string }> {
    if (!model?.actions || !Array.isArray(model.actions)) {
      return [];
    }

    return model.actions.map((action: any) => ({
      label: typeof action?.label === 'string' ? action.label : (typeof action?.type === 'string' ? action.type : 'Action'),
      text: typeof action?.label === 'string' ? action.label : (typeof action?.type === 'string' ? `Action: ${action.type}` : 'Action'),
      selector: typeof action?.selector === 'string' ? action.selector : undefined,
    }));
  }

  private findSemanticElement(selector?: string): HTMLElement | null {
    if (!selector) {
      return null;
    }

    try {
      return document.querySelector(selector) as HTMLElement | null;
    } catch {
      return null;
    }
  }

  /**
   * Check if element is visible
   */
  private isElementVisible(element: HTMLElement): boolean {
    if (!element.offsetParent) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  /**
   * Check if element is hidden via aria-hidden
   */
  private isElementHidden(element: HTMLElement): boolean {
    return element.getAttribute('aria-hidden') === 'true';
  }

  /**
   * Start full page narration
   */
  private startFullNarration(): void {
    this.stopNarration();
    this.narrationState.queue = this.buildReadingQueue('full');
    this.narrationState.isStopped = false;
    this.narrationState.isPaused = false;
    this.updateNarrationStatus();
    this.speakNextSegment();
  }

  /**
   * Start summary narration
   */
  private startSummaryNarration(): void {
    this.stopNarration();
    this.narrationState.queue = this.buildReadingQueue('summary');
    this.narrationState.isStopped = false;
    this.narrationState.isPaused = false;
    this.updateNarrationStatus();
    this.speakNextSegment();
  }

  /**
   * Start detailed summary narration
   */
  private startDetailedSummaryNarration(): void {
    this.stopNarration();
    this.narrationState.queue = this.buildReadingQueue('detailed-summary');
    this.narrationState.isStopped = false;
    this.narrationState.isPaused = false;
    this.updateNarrationStatus();
    this.speakNextSegment();
  }

  /**
   * Speak next segment in queue
   */
  private speakNextSegment(): void {
    if (!this.narrationState.queue || this.narrationState.isStopped || this.narrationState.isPaused) {
      return;
    }

    const { segments, currentIndex } = this.narrationState.queue;

    if (currentIndex >= segments.length) {
      this.speak('End of page content.', false);
      this.narrationState.isSpeaking = false;
      this.updateNarrationStatus();
      return;
    }

    const segment = segments[currentIndex];
    this.narrationState.isSpeaking = true;
    this.updateNarrationStatus();

    // Scroll to element if available
    if (segment.element) {
      segment.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Add transition for sections after first
    let text = segment.text;
    if (currentIndex > 0 && segment.type === 'section') {
      const transitions = ['Next section:', 'Moving on:', 'Now:'];
      const transition = transitions[currentIndex % transitions.length];
      text = `${transition} ${text}`;
    }

    // Speak chunked (async - handles translation)
    this.speakChunked(text, () => {
      // Move to next segment
      if (this.narrationState.queue) {
        this.narrationState.queue.currentIndex++;
        this.speakNextSegment();
      }
    }).catch((error) => {
      console.warn('[RaawiX Widget] Error in speakChunked:', error);
      // Continue to next segment even on error
      if (this.narrationState.queue) {
        this.narrationState.queue.currentIndex++;
        this.speakNextSegment();
      }
    });
  }

  /**
   * Translate text using API (if enabled)
   */
  private async translateText(text: string, targetLang: 'ar' | 'en'): Promise<string> {
    if (!this.apiUrl || (targetLang !== 'ar' && targetLang !== 'en')) {
      return text; // Fallback to original
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/widget/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          targetLang,
        }),
      });

      if (!response.ok) {
        if (response.status === 501) {
          // Translation disabled - fallback to original
          return text;
        }
        throw new Error(`Translation failed: ${response.status}`);
      }

      const data = await response.json();
      return data.translatedText || text;
    } catch (error) {
      console.warn('[RaawiX Widget] Translation failed, using original text:', error);
      return text; // Fallback to original on error
    }
  }

  /**
   * Speak text in chunks (150-220 chars) with natural pauses
   */
  private async speakChunked(text: string, onComplete?: () => void): Promise<void> {
    if (!this.synthesis) {
      onComplete?.();
      return;
    }

    // Translate if needed
    let textToSpeak = text;
    if (this.settings.translateLanguage !== 'off' && this.apiUrl) {
      try {
        textToSpeak = await this.translateText(text, this.settings.translateLanguage);
      } catch (error) {
        // Fallback to original on translation error
        textToSpeak = text;
      }
    }

    // Split into chunks at sentence boundaries (150-220 chars)
    const chunks: string[] = [];
    const sentences = textToSpeak.split(/([.!?]\s+)/);
    let currentChunk = '';

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (currentChunk.length + sentence.length <= 220) {
        currentChunk += sentence;
      } else {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      }
    }
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // If no chunks (very short text), use as-is
    if (chunks.length === 0) {
      chunks.push(textToSpeak);
    }

    // Speak chunks sequentially
    let chunkIndex = 0;
    const speakChunk = () => {
      if (chunkIndex >= chunks.length || this.narrationState.isStopped) {
        onComplete?.();
        return;
      }

      if (this.narrationState.isPaused) {
        // Wait for resume
        const checkResume = setInterval(() => {
          if (!this.narrationState.isPaused && !this.narrationState.isStopped) {
            clearInterval(checkResume);
            speakChunk();
          } else if (this.narrationState.isStopped) {
            clearInterval(checkResume);
            onComplete?.();
          }
        }, 100);
        return;
      }

      const chunk = chunks[chunkIndex];
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = 'en-US';
      utterance.rate = this.narrationState.rate;
      utterance.pitch = this.narrationState.pitch;
      utterance.volume = this.narrationState.volume;

      utterance.onend = () => {
        chunkIndex++;
        // Small pause between chunks
        setTimeout(() => speakChunk(), 200);
      };

      utterance.onerror = (event) => {
        console.error('[RaawiX Widget] Speech synthesis error:', event);
        chunkIndex++;
        setTimeout(() => speakChunk(), 200);
      };

      this.narrationState.currentUtterance = utterance;
      if (this.synthesis) {
        this.synthesis.speak(utterance);
      }
    };

    speakChunk();
  }

  /**
   * Pause narration
   */
  private pauseNarration(): void {
    if (this.narrationState.isSpeaking) {
      this.narrationState.isPaused = true;
      this.synthesis?.pause();
      this.updateNarrationStatus();
      this.speak('Paused', false);
    }
  }

  /**
   * Resume narration
   */
  private resumeNarration(): void {
    if (this.narrationState.isPaused) {
      this.narrationState.isPaused = false;
      this.synthesis?.resume();
      this.updateNarrationStatus();
      this.speak('Resuming', false);
    }
  }

  /**
   * Stop narration
   */
  private stopNarration(): void {
    this.narrationState.isStopped = true;
    this.narrationState.isPaused = false;
    this.narrationState.isSpeaking = false;
    this.synthesis?.cancel();
    this.narrationState.currentUtterance = null;
    if (this.narrationState.queue) {
      this.narrationState.queue.currentIndex = 0;
    }
    this.updateNarrationStatus();
  }

  /**
   * Skip to next segment
   */
  private skipToNextSegment(): void {
    if (this.narrationState.queue && this.narrationState.queue.currentIndex < this.narrationState.queue.segments.length - 1) {
      this.synthesis?.cancel();
      this.narrationState.queue.currentIndex++;
      this.speakNextSegment();
    }
  }

  /**
   * Repeat current segment
   */
  private repeatCurrentSegment(): void {
    if (this.narrationState.queue && this.narrationState.queue.currentIndex >= 0) {
      this.synthesis?.cancel();
      this.speakNextSegment();
    }
  }

  /**
   * Update narration status display
   */
  private updateNarrationStatus(): void {
    const statusEl = this.panel?.querySelector('#raawi-narration-status') as HTMLElement | null;
    if (!statusEl) return;

    if (!this.narrationState.queue) {
      statusEl.textContent = '';
      return;
    }

    const { segments, currentIndex } = this.narrationState.queue;
    if (segments.length === 0) {
      statusEl.textContent = '';
      return;
    }

    const segment = segments[currentIndex];
    const status = this.narrationState.isPaused 
      ? `Paused: ${segment.heading || segment.type} (${currentIndex + 1} of ${segments.length})`
      : this.narrationState.isSpeaking
      ? `Reading: ${segment.heading || segment.type} (${currentIndex + 1} of ${segments.length})`
      : `Ready: ${currentIndex + 1} of ${segments.length}`;
    
    statusEl.textContent = status;
  }

  // ==================== Voice Mode Implementation ====================

  /**
   * Initialize voice mode (Speech Recognition and Synthesis)
   */
  private initVoiceMode(): void {
    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (typeof SpeechRecognition === 'undefined') {
      console.warn('[RaawiX Widget] Speech Recognition not supported in this browser');
      this.voiceEnabled = false;
      // Hide voice controls if not supported
      const voiceControl = document.getElementById('raawi-voice-control');
      if (voiceControl) voiceControl.style.display = 'none';
      return;
    }

    if (typeof speechSynthesis === 'undefined') {
      console.warn('[RaawiX Widget] Speech Synthesis not supported in this browser');
      this.voiceEnabled = false;
      const voiceControl = document.getElementById('raawi-voice-control');
      if (voiceControl) voiceControl.style.display = 'none';
      return;
    }

    // Initialize Speech Recognition
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognitionClass();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.context.voiceLang; // Use context.voiceLang (F)

    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateVoiceIndicator();
      this.updateMicButton();
      this.addTranscript('Listening...');
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        this.transcript = finalTranscript.trim();
        this.addTranscript(this.transcript);
        
        // B: Wake phrase detection (only in wake-only mode or to restart active listening)
        if (this.detectWakePhrase(this.transcript)) {
          if (this.isWakeOnlyMode && !this.isActiveListening) {
            // C: Check if mic permission is granted
            if (!this.micPermissionGranted) {
              this.showPermissionPrompt();
              return;
            }
            this.handleWakePhrase();
            return; // Don't process as command yet
          } else if (this.isActiveListening) {
            // Wake phrase during active listening - restart timer
            if (this.activeListeningTimeout) {
              clearTimeout(this.activeListeningTimeout);
            }
            this.activeListeningTimeout = window.setTimeout(() => {
              this.stopActiveListening();
            }, 15000);
            return; // Don't process wake phrase as command
          }
        }
        
        // In wake-only mode, ignore non-wake commands
        if (this.isWakeOnlyMode && !this.isActiveListening) {
          return;
        }
        
        // Process command (active listening mode or push-to-talk)
        this.processVoiceCommand(this.transcript);
      } else if (interimTranscript && !this.isWakeOnlyMode) {
        this.addTranscript(interimTranscript, true);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('[RaawiX Widget] Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Ignore - user might be pausing
      } else if (event.error === 'not-allowed') {
        this.micPermissionGranted = false; // C: Track permission status
        this.speakNow(
          this.context.locale === 'ar' 
            ? 'تم رفض إذن الميكروفون. يرجى تفعيل الوصول إلى الميكروفون.'
            : 'Microphone permission denied. Please enable microphone access.',
          { lang: this.context.voiceLang }
        );
        this.stopListening();
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.updateVoiceIndicator();
      this.updateMicButton();
      
      // B: Auto-restart based on voice mode
      if (this.settings.voiceMode === 'hands_free' && this.isWakeOnlyMode) {
        // Restart wake-only mode
        setTimeout(() => {
          if (this.settings.voiceMode === 'hands_free' && this.isWakeOnlyMode && !this.isActiveListening) {
            this.startWakeOnlyMode();
          }
        }, 100);
      } else if (this.settings.voiceMode === 'hands_free' && this.isActiveListening) {
        // Restart active listening if timeout hasn't expired
        if (this.activeListeningTimeout) {
          setTimeout(() => {
            if (this.settings.voiceMode === 'hands_free' && this.isActiveListening) {
              this.startActiveListening();
            }
          }, 100);
        }
      }
    };

    // Initialize Speech Synthesis
    this.synthesis = window.speechSynthesis;

    // Collect available actions from page
    this.collectActions();
  }

  /**
   * Detect wake phrase (B)
   */
  private detectWakePhrase(transcript: string): boolean {
    const normalized = transcript.toLowerCase().trim();
    
    // EN wake phrases
    const enWakePhrases = ['hi raawi', 'hey raawi'];
    // AR wake phrases
    const arWakePhrases = ['هلا راوي', 'يا راوي'];
    
    if (this.context.locale === 'ar') {
      return arWakePhrases.some(phrase => normalized.includes(phrase.toLowerCase()));
    } else {
      return enWakePhrases.some(phrase => normalized.includes(phrase));
    }
  }

  /**
   * Handle wake phrase recognition (B, D, E)
   */
  private handleWakePhrase(): void {
    // Switch to active listening mode
    this.isWakeOnlyMode = false;
    this.isActiveListening = true;
    
    // Start active listening (15 seconds or until "stop")
    this.startActiveListening();
    
    // D: Guided onboarding
    this.speakGuidedOnboarding();
    
    // E: Blind preset suggestion (after a short delay)
    setTimeout(() => {
      this.suggestBlindPreset();
    }, 3000);
  }

  /**
   * Start wake-only mode (B)
   */
  private startWakeOnlyMode(): void {
    if (!this.recognition || this.isListening) return;
    
    this.isWakeOnlyMode = true;
    this.isActiveListening = false;
    
    try {
      this.recognition.start();
    } catch (error) {
      console.error('[RaawiX Widget] Failed to start wake-only mode:', error);
    }
  }

  /**
   * Start active listening mode (B)
   */
  private startActiveListening(): void {
    if (!this.recognition) return;
    
    this.isWakeOnlyMode = false;
    this.isActiveListening = true;
    
    // Clear existing timeout
    if (this.activeListeningTimeout) {
      clearTimeout(this.activeListeningTimeout);
    }
    
    // Set timeout for active listening (15 seconds)
    this.activeListeningTimeout = window.setTimeout(() => {
      this.stopActiveListening();
    }, 15000);
    
    if (!this.isListening) {
      try {
        this.recognition.start();
      } catch (error) {
        console.error('[RaawiX Widget] Failed to start active listening:', error);
      }
    }
  }

  /**
   * Stop active listening and return to wake-only mode (B)
   */
  private stopActiveListening(): void {
    this.isActiveListening = false;
    if (this.activeListeningTimeout) {
      clearTimeout(this.activeListeningTimeout);
      this.activeListeningTimeout = null;
    }
    
    // Return to wake-only mode if hands_free
    if (this.settings.voiceMode === 'hands_free') {
      this.stopListening();
      setTimeout(() => {
        this.startWakeOnlyMode();
      }, 500);
    } else {
      this.stopListening();
    }
  }

  /**
   * Start listening for voice commands
   */
  private startListening(): void {
    if (!this.recognition || this.isListening) return;

    // B: Start wake-only mode if hands_free
    if (this.settings.voiceMode === 'hands_free') {
      this.startWakeOnlyMode();
      return;
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error('[RaawiX Widget] Failed to start recognition:', error);
    }
  }

  /**
   * Stop listening for voice commands
   */
  private stopListening(): void {
    if (!this.recognition || !this.isListening) return;

    this.isWakeOnlyMode = false;
    this.isActiveListening = false;
    if (this.activeListeningTimeout) {
      clearTimeout(this.activeListeningTimeout);
      this.activeListeningTimeout = null;
    }

    try {
      this.recognition.stop();
    } catch (error) {
      console.error('[RaawiX Widget] Failed to stop recognition:', error);
    }
  }

  /**
   * Toggle listening state
   */
  private toggleListening(): void {
    if (this.isListening) {
      this.stopListening();
    } else {
      // C: Check permission before starting
      if (!this.micPermissionGranted) {
        this.requestMicPermission();
        return;
      }
      
      // A: Save voice mode when user starts using it
      if (this.settings.voiceMode === 'off') {
        this.settings.voiceMode = 'push_to_talk';
        this.saveVoiceModeToStorage();
      }
      
      this.startListening();
    }
  }

  /**
   * Request microphone permission (C)
   */
  private async requestMicPermission(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.micPermissionGranted = true;
      // Stop the stream immediately (we just needed permission)
      stream.getTracks().forEach(track => track.stop());
      
      // A: Save voice mode when permission granted (user opted in)
      if (this.settings.voiceMode === 'off') {
        this.settings.voiceMode = 'push_to_talk';
        this.saveVoiceModeToStorage();
      }
      
      // Start listening after permission granted
      this.startListening();
    } catch (error) {
      this.micPermissionGranted = false;
      this.speakNow(
        this.context.locale === 'ar'
          ? 'تم رفض إذن الميكروفون.'
          : 'Microphone permission denied.',
        { lang: this.context.voiceLang }
      );
    }
  }

  /**
   * Show permission prompt (C)
   */
  private showPermissionPrompt(): void {
    const prompt = this.context.locale === 'ar'
      ? 'تفعيل التحكم الصوتي؟'
      : 'Enable voice control?';
    
    // Show prompt in UI (could be a modal or button)
    // For now, we'll speak it and user can click mic button
    this.speakNow(prompt, { lang: this.context.voiceLang });
  }

  /**
   * Guided onboarding after wake (D)
   */
  private speakGuidedOnboarding(): void {
    let message: string;
    
    if (this.context.locale === 'ar') {
      message = 'هلا، أنا حاضر. قل: اقرأ الصفحة، ملخص، ابدأ مساعد النموذج.';
      
      // D: Suggest form assistant if form detected
      if (this.formSnapshot && (this.formSnapshot.fields.length > 0 || this.formSnapshot.uploads.length > 0)) {
        message += ' الصفحة فيها نموذج. قل: ابدأ مساعد النموذج.';
      }
    } else {
      message = "I'm here. Say: read page, summary, start form assistant.";
      
      // D: Suggest form assistant if form detected
      if (this.formSnapshot && (this.formSnapshot.fields.length > 0 || this.formSnapshot.uploads.length > 0)) {
        message += ' This page has a form. Say: start form assistant.';
      }
    }
    
    this.speakNow(message, { lang: this.context.voiceLang });
  }

  /**
   * Suggest Blind preset (E)
   */
  private suggestBlindPreset(): void {
    // Only suggest if preset is not already active
    if (this.currentPreset === 'blind') return;
    
    let message: string;
    
    if (this.context.locale === 'ar') {
      message = 'تبغاني أفعل وضع الكفيف وأبدأ القراءة؟';
    } else {
      message = 'Do you want me to enable Blind preset and start reading?';
    }
    
    this.speakNow(message, { lang: this.context.voiceLang });
    
    // Listen for confirmation (yes/no, نعم/لا)
    // This will be handled in processVoiceCommand
  }

  /**
   * Load voice mode from localStorage (A)
   */
  private loadVoiceModeFromStorage(): void {
    try {
      const stored = localStorage.getItem('raawi-voice-mode-opted-in');
      if (stored === 'true') {
        const mode = localStorage.getItem('raawi-voice-mode') as 'off' | 'push_to_talk' | 'hands_free' | null;
        if (mode && (mode === 'off' || mode === 'push_to_talk' || mode === 'hands_free')) {
          this.settings.voiceMode = mode;
        }
      }
    } catch (e) {
      // localStorage not available or error
      console.warn('[RaawiX Widget] Could not load voice mode from storage:', e);
    }
  }

  /**
   * Save voice mode to localStorage (A)
   */
  private saveVoiceModeToStorage(): void {
    try {
      localStorage.setItem('raawi-voice-mode-opted-in', 'true');
      localStorage.setItem('raawi-voice-mode', this.settings.voiceMode);
    } catch (e) {
      console.warn('[RaawiX Widget] Could not save voice mode to storage:', e);
    }
  }

  /**
   * Update microphone button appearance
   */
  private updateMicButton(): void {
    const micButton = document.getElementById('raawi-voice-mic-button');
    if (micButton) {
      if (this.isListening) {
        micButton.classList.add('listening');
        micButton.setAttribute('aria-label', 'Stop listening');
      } else {
        micButton.classList.remove('listening');
        micButton.setAttribute('aria-label', 'Start listening');
      }
    }
  }

  /**
   * Add text to transcript display (B5)
   */
  private addTranscript(text: string, isInterim: boolean = false): void {
    const transcriptEl = document.getElementById('raawi-voice-transcript');
    if (transcriptEl) {
      // B5: Ensure transcript respects direction
      transcriptEl.setAttribute('dir', this.context.direction);
      transcriptEl.style.textAlign = this.context.direction === 'rtl' ? 'right' : 'left';
      
      if (isInterim) {
        transcriptEl.textContent = text;
        transcriptEl.style.fontStyle = 'italic';
        transcriptEl.style.color = '#666';
      } else {
        transcriptEl.textContent = text;
        transcriptEl.style.fontStyle = 'normal';
        transcriptEl.style.color = '#333';
      }
    }
  }

  /**
   * Process voice command
   */
  private processVoiceCommand(command: string): void {
    const normalized = command.toLowerCase().trim();
    console.log('[RaawiX Widget] Processing command:', normalized);

    const t = this.getTranslations();

    // A2: Start form assistant commands (before checking if active)
    if (!this.formAssistantActive && (
      normalized.includes('start form assistant') || 
      normalized.includes(t.startFormAssistant.toLowerCase()) ||
      normalized.includes('help me fill the form') ||
      normalized.includes(t.formAssistantHelpMeFill.toLowerCase()) ||
      (this.context.locale === 'ar' && (
        normalized.includes('ابدأ مساعد النموذج') ||
        normalized.includes('ساعدني في النموذج')
      ))
    )) {
      this.startFormAssistant();
      return;
    }

    // A2: Start login assist (Najiz mode) (D2)
    if (!this.formAssistantActive && (
      normalized.includes('start login assist') ||
      normalized.includes(t.formAssistantStartLoginAssist.toLowerCase()) ||
      (this.context.locale === 'ar' && normalized.includes('ابدأ مساعدة تسجيل الدخول'))
    )) {
      this.najizMode = true;
      this.startFormAssistant();
      return;
    }

    // Check if form assistant is active and handle its commands first
    if (this.formAssistantActive) {
      if (this.processFormAssistantCommand(command)) {
        return; // Command handled by form assistant
      }
    }

    // Text size commands
    if (normalized.includes('increase text') || normalized.includes('text bigger') || normalized.includes('larger text')) {
      this.adjustTextSize(0.1);
      this.speak('Text size increased');
      return;
    }

    if (normalized.includes('decrease text') || normalized.includes('text smaller') || normalized.includes('smaller text')) {
      this.adjustTextSize(-0.1);
      this.speak('Text size decreased');
      return;
    }

    // Line spacing commands
    if (normalized.includes('increase spacing') || normalized.includes('more spacing') || normalized.includes('line spacing bigger')) {
      this.adjustLineSpacing(0.1);
      this.speak('Line spacing increased');
      return;
    }

    if (normalized.includes('decrease spacing') || normalized.includes('less spacing') || normalized.includes('line spacing smaller')) {
      this.adjustLineSpacing(-0.1);
      this.speak('Line spacing decreased');
      return;
    }

    // Toggle commands
    if (normalized.includes('contrast on') || normalized.includes('enable contrast') || normalized.includes('turn on contrast')) {
      this.setContrastMode(true);
      this.speak('High contrast mode enabled');
      return;
    }

    if (normalized.includes('contrast off') || normalized.includes('disable contrast') || normalized.includes('turn off contrast')) {
      this.setContrastMode(false);
      this.speak('High contrast mode disabled');
      return;
    }

    if (normalized.includes('focus highlight on') || normalized.includes('enable focus') || normalized.includes('turn on focus')) {
      this.setFocusHighlight(true);
      this.speak('Focus highlight enabled');
      return;
    }

    if (normalized.includes('focus highlight off') || normalized.includes('disable focus') || normalized.includes('turn off focus')) {
      this.setFocusHighlight(false);
      this.speak('Focus highlight disabled');
      return;
    }

    if (normalized.includes('reading mode on') || normalized.includes('enable reading') || normalized.includes('turn on reading')) {
      this.setReadingMode(true);
      this.speak('Reading mode enabled');
      return;
    }

    if (normalized.includes('reading mode off') || normalized.includes('disable reading') || normalized.includes('turn off reading')) {
      this.setReadingMode(false);
      this.speak('Reading mode disabled');
      return;
    }

    // B: Handle "stop" command to stop active listening
    if (normalized.includes('stop') && this.isActiveListening) {
      this.stopActiveListening();
      this.speakNow(
        this.context.locale === 'ar' ? 'تم إيقاف الاستماع.' : 'Stopped listening.',
        { lang: this.context.voiceLang }
      );
      return;
    }

    // E: Handle blind preset confirmation
    if (normalized.includes('yes') || normalized.includes('نعم') || normalized.includes('enable') || normalized.includes('فعل')) {
      // Check if we just suggested blind preset
      // For now, we'll enable blind preset if user says yes and it's not already active
      if (this.currentPreset !== 'blind') {
        this.applyPreset('blind');
        // Start reading
        this.startFullNarration();
        this.speakNow(
          this.context.locale === 'ar' 
            ? 'تم تفعيل وضع الكفيف وبدء القراءة.'
            : 'Blind preset enabled. Starting to read.',
          { lang: this.context.voiceLang }
        );
      }
      return;
    }

    if (normalized.includes('no') || normalized.includes('لا') || normalized.includes('skip') || normalized.includes('تخطي')) {
      // User declined blind preset
      this.speakNow(
        this.context.locale === 'ar' ? 'حسناً، لن أفعل الوضع.' : 'Okay, I won\'t enable the preset.',
        { lang: this.context.voiceLang }
      );
      return;
    }

    // Narration commands
    if (normalized.includes('read page') || normalized.includes('read this page') || normalized.includes('read full page')) {
      this.startFullNarration();
      return;
    }

    if (normalized.includes('summary') && !normalized.includes('detailed')) {
      this.startSummaryNarration();
      return;
    }

    if (normalized.includes('detailed summary') || normalized.includes('read detailed')) {
      this.startDetailedSummaryNarration();
      return;
    }

    if (normalized.includes('read landmarks') || normalized.includes('list landmarks')) {
      this.readLandmarks();
      return;
    }

    if (normalized.includes('read actions') || normalized.includes('list actions')) {
      this.readActions();
      return;
    }

    if (normalized.includes('read issues') || normalized.includes('list issues')) {
      this.readIssues();
      return;
    }

    // Describe image command (English and Arabic)
    if (normalized.includes('describe image') || normalized.includes('وصف الصورة')) {
      this.describeImage();
      return;
    }

    // Describe focused element command (English and Arabic)
    if (normalized.includes('describe focus') || normalized.includes('describe focused element') || 
        normalized.includes('وصف العنصر') || normalized.includes('وصف العنصر المحدد')) {
      this.describeFocusedElement();
      return;
    }

    // What can I do here command (English and Arabic)
    if (normalized.includes('what can i do here') || normalized.includes('available actions') ||
        normalized.includes('ما الذي يمكنني فعله هنا') || normalized.includes('الإجراءات المتاحة')) {
      this.whatCanIDoHere();
      return;
    }

    // Go to action command (English and Arabic) - only when explicitly requested
    const goToActionMatchEn = normalized.match(/go to action (\d+)/);
    const goToActionMatchAr = normalized.match(/اذهب إلى الإجراء (\d+)/);
    if (goToActionMatchEn || goToActionMatchAr) {
      const actionNumber = parseInt((goToActionMatchEn?.[1] || goToActionMatchAr?.[1] || '0'), 10);
      if (actionNumber > 0) {
        this.goToAction(actionNumber);
        return;
      }
    }

    // "Why" command - explain context of last mentioned action
    if (normalized === 'why' || normalized === 'why this action' || normalized === 'لماذا' || normalized === 'لماذا هذا الإجراء') {
      this.explainActionContext();
      return;
    }

    // Narration control commands
    if (normalized.includes('pause') && !normalized.includes('unpause')) {
      this.pauseNarration();
      return;
    }

    if (normalized.includes('resume') || normalized.includes('continue') || normalized.includes('unpause')) {
      this.resumeNarration();
      return;
    }

    if (normalized.includes('stop') && (normalized.includes('reading') || normalized.includes('narration') || normalized.includes('speaking'))) {
      this.stopNarration();
      return;
    }

    if (normalized.includes('next') && (normalized.includes('section') || normalized.includes('segment'))) {
      this.skipToNextSegment();
      return;
    }

    if (normalized.includes('repeat') || normalized.includes('say again')) {
      this.repeatCurrentSegment();
      return;
    }

    if (normalized.includes('faster') || normalized.includes('speed up')) {
      this.narrationState.rate = Math.min(2.0, this.narrationState.rate + 0.1);
      this.speak(`Reading speed increased to ${Math.round(this.narrationState.rate * 100)}%`, false);
      return;
    }

    if (normalized.includes('slower') || normalized.includes('slow down')) {
      this.narrationState.rate = Math.max(0.5, this.narrationState.rate - 0.1);
      this.speak(`Reading speed decreased to ${Math.round(this.narrationState.rate * 100)}%`, false);
      return;
    }

    // Go to section by heading text (fuzzy match)
    if (normalized.includes('go to section') || normalized.includes('jump to section')) {
      const sectionText = normalized.replace(/go to section|jump to section/g, '').trim();
      if (sectionText && this.narrationState.queue) {
        const match = this.narrationState.queue.segments.find(s => 
          s.heading && s.heading.toLowerCase().includes(sectionText)
        );
        if (match) {
          const index = this.narrationState.queue.segments.indexOf(match);
          this.narrationState.queue.currentIndex = index;
          this.speakNextSegment();
        } else {
          this.speak(`Section "${sectionText}" not found`, false);
        }
      }
      return;
    }

    // Action navigation
    if (normalized.includes('next action') || normalized.includes('next')) {
      this.navigateToNextAction();
      return;
    }

    if (normalized.includes('previous action') || normalized.includes('previous') || normalized.includes('back')) {
      this.navigateToPreviousAction();
      return;
    }

    if (normalized.includes('activate action') || normalized.includes('click action') || normalized.includes('select action')) {
      this.activateCurrentAction();
      return;
    }

    // Help command
    if (normalized.includes('list commands') || normalized.includes('help') || normalized.includes('what can i say')) {
      this.speakCommands();
      return;
    }

    // Unknown command
    this.speak('Command not recognized. Say "list commands" for help.');
  }

  /**
   * Speak text using Speech Synthesis
   * If narration is active, uses narration state settings; otherwise uses defaults
   */
  private speak(text: string, interrupt: boolean = true, useNarrationSettings: boolean = false): void {
    if (!this.synthesis) return;

    if (interrupt && !this.narrationState.isSpeaking) {
      this.synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    
    if (useNarrationSettings || this.narrationState.isSpeaking) {
      utterance.rate = this.narrationState.rate;
      utterance.pitch = this.narrationState.pitch;
      utterance.volume = this.narrationState.volume;
    } else {
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
    }

    utterance.onerror = (event) => {
      console.error('[RaawiX Widget] Speech synthesis error:', event);
    };

    this.synthesis.speak(utterance);
  }

  /**
   * Read page summary (legacy method - now uses narration engine)
   */
  private readPageSummary(): void {
    this.startSummaryNarration();
  }

  /**
   * Setup E2E mode (D)
   */
  private setupE2EMode(): void {
    // D: Expose E2E API
    (window as any).RaawiE2E = {
      injectTranscript: (text: string) => {
        if (this.recognition && this.e2eMode) {
          // Simulate recognition result
          const event = {
            results: [{
              0: { transcript: text },
              isFinal: true,
              length: 1,
            }],
            resultIndex: 0,
          };
          if (this.recognition.onresult) {
            this.recognition.onresult(event as any);
          }
        }
      },
      getSpokenLog: (): string[] => {
        return [...this.e2eSpokenLog];
      },
      clearSpokenLog: (): void => {
        this.e2eSpokenLog = [];
      },
    };
  }

  /**
   * Speak a one-off message without rebuilding the whole queue
   */
  private speakNow(text: string, options: { interrupt?: boolean; lang?: string } = {}): void {
    // D: In E2E mode, log instead of speaking
    if (this.e2eMode) {
      this.e2eSpokenLog.push(text);
      console.log('[RaawiX Widget E2E] Spoke:', text);
      return;
    }

    if (!this.synthesis) return;

    const { interrupt = true, lang } = options;

    if (interrupt) {
      this.synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || this.context.voiceLang; // Use context.voiceLang (B)
    
    // B1: Set voice to best available for locale
    const bestVoice = this.getBestVoice();
    if (bestVoice) {
      utterance.voice = bestVoice;
      // Ensure lang matches voice (in case of mismatch)
      if (bestVoice.lang !== utterance.lang) {
        utterance.lang = bestVoice.lang;
      }
    } else {
      // B1: No matching voice - show fallback notice
      console.warn(`[RaawiX Widget] No voice available for ${this.context.voiceLang}. Using system default.`);
      // Could show toast notification here
    }
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onerror = (event) => {
      console.error('[RaawiX Widget] Speech synthesis error:', event);
      // B1: If voice error, try fallback
      if (event.error === 'not-allowed' || event.error === 'synthesis-failed') {
        // Try without voice selection
        const fallbackUtterance = new SpeechSynthesisUtterance(text);
        fallbackUtterance.lang = this.context.voiceLang;
        if (this.synthesis) {
          this.synthesis.speak(fallbackUtterance);
        }
      }
    };

    this.synthesis.speak(utterance);
  }

  /**
   * Find candidate image element for description
   * Priority:
   * 1. Focused element if it's an image or inside a figure
   * 2. Nearest visible image in viewport (topmost)
   */
  private findCandidateImageElement(): HTMLImageElement | null {
    // Check if focused element is an image or inside a figure
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      // Check if focused element is an image
      if (focusedElement.tagName === 'IMG') {
        return focusedElement as HTMLImageElement;
      }

      // Check if focused element is inside a figure
      const figure = focusedElement.closest('figure');
      if (figure) {
        const img = figure.querySelector('img');
        if (img) {
          return img;
        }
      }

      // Check if focused element contains an image
      const imgInFocused = focusedElement.querySelector('img');
      if (imgInFocused) {
        return imgInFocused;
      }
    }

    // Find nearest visible image in viewport (topmost)
    const images = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
    const viewportImages = images.filter(img => {
      const rect = img.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth &&
        rect.width > 0 &&
        rect.height > 0
      );
    });

    if (viewportImages.length > 0) {
      // Sort by top position (topmost first)
      viewportImages.sort((a, b) => {
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();
        return rectA.top - rectB.top;
      });
      return viewportImages[0];
    }

    return null;
  }

  /**
   * Get image description from assistive map
   */
  private getImageDescriptionFromAssistiveMap(img: HTMLImageElement): string | null {
    if (!this.cachedPagePackage?.assistiveMap?.imageDescriptions) {
      return null;
    }

    const imageDescriptions = this.cachedPagePackage.assistiveMap.imageDescriptions;
    const imgSrc = img.src;
    const imgSelector = this.generateSelector(img);

    // Try to match by selector
    for (const [, desc] of Object.entries(imageDescriptions)) {
      if (!desc.selector || !desc.alt || !desc.alt.trim()) {
        continue;
      }

      // Try exact selector match
      if (this.matchesSelector(img, desc.selector)) {
        return desc.alt;
      }

      // Try if selector is in the image src path
      try {
        const url = new URL(imgSrc, window.location.href);
        if (url.pathname.includes(desc.selector) || url.href.includes(desc.selector)) {
          return desc.alt;
        }
      } catch (e) {
        // Invalid URL, continue
      }

      // Try if generated selector matches
      if (imgSelector && desc.selector.includes(imgSelector)) {
        return desc.alt;
      }
    }

    return null;
  }


  /**
   * Check if element matches a selector
   */
  private matchesSelector(element: Element, selector: string): boolean {
    try {
      // Try exact match
      if (document.querySelector(selector) === element) {
        return true;
      }
      // Try if element matches the selector
      if (element.matches && element.matches(selector)) {
        return true;
      }
      // Try if selector contains src path
      if (element instanceof HTMLImageElement && element.src.includes(selector)) {
        return true;
      }
    } catch (e) {
      // Invalid selector, ignore
    }
    return false;
  }

  /**
   * What can I do here feature
   */
  private whatCanIDoHere(): void {
    const t = this.getTranslations();
    const actions: Array<{ label: string; description: string; contextTitle?: string; selector?: string; element?: HTMLElement | null }> = [];

    // Priority 1: Use page-package guidance.keyActions if available
    if (this.cachedPagePackage?.guidance?.keyActions && this.cachedPagePackage.guidance.keyActions.length > 0) {
      this.cachedPagePackage.guidance.keyActions.slice(0, 5).forEach((action) => {
        let element: HTMLElement | null = null;
        if (action.selector) {
          try {
            element = document.querySelector(action.selector) as HTMLElement;
          } catch (e) {
            // Invalid selector, ignore
          }
        }

        // Merge with assistive map if element exists
        let label = action.label;
        let description = action.description || '';
        let contextTitle: string | undefined = undefined;

        if (element) {
          const labelOverride = this.getLabelOverride(element);
          if (labelOverride) {
            label = labelOverride;
          }

          const actionIntent = this.getActionIntent(element);
          if (actionIntent) {
            description = actionIntent.description || description;
            // Check if actionIntent has contextTitle (if API provides it)
            if ((actionIntent as any).contextTitle) {
              contextTitle = (actionIntent as any).contextTitle;
            }
          }

          // Get context title if not already set
          if (!contextTitle) {
            contextTitle = this.getActionContextTitle(element, label);
          }
        } else {
          // Even without element, try to get context from description
          if (description) {
            // Description might contain context
            contextTitle = description;
          }
        }

        actions.push({
          label,
          description,
          contextTitle,
          selector: action.selector,
          element,
        });
      });
    }

    // Priority 2a: If no keyActions, use semantic actions if available
    if (actions.length === 0 && this.cachedSemanticModel?.actions && Array.isArray(this.cachedSemanticModel.actions)) {
      const semanticActions = (this.cachedSemanticModel.actions as any[]).slice(0, 5);
      semanticActions.forEach((action) => {
        let element: HTMLElement | null = null;
        if (typeof action?.selector === 'string') {
          element = this.findSemanticElement(action.selector);
        }

        actions.push({
          label: typeof action?.label === 'string' ? action.label : (typeof action?.type === 'string' ? action.type : 'Action'),
          description: typeof action?.description === 'string' ? action.description : '',
          contextTitle: typeof action?.label === 'string' ? action.label : undefined,
          selector: typeof action?.selector === 'string' ? action.selector : undefined,
          element,
        });
      });
    }

    // Priority 2: If no keyActions, fallback to scanning DOM for buttons/links in main landmark
    if (actions.length === 0) {
      const main = document.querySelector('main, [role="main"]') || document.body;
      const interactiveElements = main.querySelectorAll('button, a[href], [role="button"], [role="link"], input[type="submit"], input[type="button"]');
      
      Array.from(interactiveElements).slice(0, 5).forEach((el) => {
        if (!this.isElementVisible(el as HTMLElement)) return;

        const element = el as HTMLElement;
        let label = this.getAccessibleLabel(element);
        
        // Check assistive map
        const labelOverride = this.getLabelOverride(element);
        if (labelOverride) {
          label = labelOverride;
        }

        const actionIntent = this.getActionIntent(element);
        const description = actionIntent?.description || '';
        
        // Get context title
        const contextTitle = this.getActionContextTitle(element, label);

        if (label && label.trim()) {
          actions.push({
            label,
            description,
            contextTitle,
            selector: this.generateSelector(element),
            element,
          });
        }
      });
    }

    // Read the actions
    if (actions.length === 0) {
      this.speakNow(t.noActionsFound, { lang: this.context.voiceLang });
      return;
    }

    // Build action list text with context
    const actionTexts = actions.map((action, idx) => {
      const num = idx + 1;
      let text = `${t.action} ${num}: `;
      
      // Format: "Action 1: {label} about {contextTitle}." or "{label}. Context unavailable."
      if (action.contextTitle && action.contextTitle.trim()) {
        if (this.context.locale === 'ar') {
          text += `${action.label} حول ${action.contextTitle}`;
        } else {
          text += `${action.label} about ${action.contextTitle}`;
        }
      } else {
        text += action.label;
        if (this.context.locale === 'ar') {
          text += '. السياق غير متوفر';
        } else {
          text += '. Context unavailable';
        }
      }
      
      // Append description if available
      if (action.description && action.description.trim() && action.description !== action.contextTitle) {
        text += `. ${action.description}`;
      }
      
      text += '.';
      return text;
    });

    let speechText = actionTexts.join(' ');

    // Add instruction for going to actions
    if (actions.length > 0) {
      speechText += `. ${t.sayGoToAction} 1" ${t.toFocusIt}`;
    }

    // Store actions for "go to action" command and "why" command
    this.temporaryActions = actions;

    // Speak the actions
    this.speakNow(speechText, { lang: this.context.voiceLang });
  }

  /**
   * Get context title for an action (card/section title)
   * Priority: assistiveMap.actionIntents.contextTitle > guidance.description > DOM traversal
   */
  private getActionContextTitle(element: HTMLElement, actionLabel: string): string | undefined {
    // Check if label is generic (needs context)
    const genericLabels = ['learn more', 'read more', 'click here', 'more', 'details', 'more info', 'more information', 'see more', 'show more'];
    const isGeneric = genericLabels.some(generic => actionLabel.toLowerCase().includes(generic.toLowerCase()));
    
    // Priority 1: Check assistiveMap.actionIntents for contextTitle
    const actionIntent = this.getActionIntent(element);
    if (actionIntent && (actionIntent as any).contextTitle) {
      return (actionIntent as any).contextTitle;
    }
    
    // Priority 2: Use actionIntent description as context if available
    if (actionIntent && actionIntent.description && isGeneric) {
      return actionIntent.description;
    }
    
    // Priority 3: DOM traversal (only for generic labels or if no context found)
    if (isGeneric || !actionIntent) {
      // Find nearest container (article, section, li, .card, role=article)
      let container: HTMLElement | null = element;
      while (container && container !== document.body) {
        const tagName = container.tagName.toLowerCase();
        const role = container.getAttribute('role');
        const className = container.className || '';
        
        if (tagName === 'article' || tagName === 'section' || tagName === 'li' || 
            className.includes('card') || role === 'article') {
          // Look for heading inside container
          const heading = container.querySelector('h1, h2, h3, h4, h5, h6');
          if (heading) {
            const headingText = heading.textContent?.trim();
            if (headingText) return headingText;
          }
          
          // Try aria-label or aria-labelledby
          const ariaLabel = container.getAttribute('aria-label');
          if (ariaLabel) return ariaLabel;
          
          const ariaLabelledBy = container.getAttribute('aria-labelledby');
          if (ariaLabelledBy) {
            const labelEl = document.getElementById(ariaLabelledBy);
            if (labelEl) {
              const labelText = labelEl.textContent?.trim();
              if (labelText) return labelText;
            }
          }
        }
        
        container = container.parentElement;
      }
      
      // Fallback: Find nearest previous heading in DOM
      let prevSibling: Element | null = element.previousElementSibling;
      while (prevSibling) {
        if (prevSibling.tagName.match(/^H[1-6]$/i)) {
          const headingText = prevSibling.textContent?.trim();
          if (headingText) return headingText;
        }
        prevSibling = prevSibling.previousElementSibling;
      }
      
      // Try parent's previous sibling
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        let sibling = parent.previousElementSibling;
        while (sibling) {
          const heading = sibling.querySelector('h1, h2, h3, h4, h5, h6');
          if (heading) {
            const headingText = heading.textContent?.trim();
            if (headingText) return headingText;
          }
          sibling = sibling.previousElementSibling;
        }
        parent = parent.parentElement;
      }
    }
    
    return undefined;
  }

  /**
   * Get action intent from assistive map
   */
  private getActionIntent(element: HTMLElement): { intent: string; description: string; selector: string } | null {
    if (!this.cachedPagePackage?.assistiveMap?.actionIntents) return null;

    const actionIntents = this.cachedPagePackage.assistiveMap.actionIntents;
    const selector = this.generateSelector(element);

    // Try direct match
    if (actionIntents[selector]) {
      return actionIntents[selector];
    }

    // Try matching by selector value
    for (const [, intent] of Object.entries(actionIntents)) {
      if (intent.selector && this.matchesSelector(element, intent.selector)) {
        return intent;
      }
    }

    return null;
  }

  /**
   * Go to action (focus and scroll to element) - only when explicitly requested
   */
  private goToAction(actionNumber: number): void {
    if (!this.temporaryActions || this.temporaryActions.length === 0) {
      const t = this.getTranslations();
      this.speakNow(t.noActionsFound, { lang: this.context.voiceLang });
      return;
    }

    const index = actionNumber - 1; // Convert to 0-based index
    if (index < 0 || index >= this.temporaryActions.length) {
      const t = this.getTranslations();
      this.speakNow(`${t.action} ${actionNumber} ${t.noActionsFound}`, { lang: this.context.voiceLang });
      return;
    }

    const action = this.temporaryActions[index];
    let element: HTMLElement | null = null;

    // Try to find element by stored reference or selector
    if (action.element) {
      element = action.element;
    } else if (action.selector) {
      try {
        element = document.querySelector(action.selector) as HTMLElement;
      } catch (e) {
        // Invalid selector
      }
    }

    if (element) {
      // Scroll into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Focus the element (only when explicitly requested via "go to action")
      if (element instanceof HTMLButtonElement || 
          element instanceof HTMLAnchorElement ||
          element instanceof HTMLInputElement ||
          element.tabIndex >= 0 ||
          element.getAttribute('role') === 'button' ||
          element.getAttribute('role') === 'link') {
        element.focus();
      }

      // Speak confirmation
      const t = this.getTranslations();
      const confirmation = action.description 
        ? `${t.action} ${actionNumber}: ${action.label}. ${action.description}`
        : `${t.action} ${actionNumber}: ${action.label}`;
      this.speakNow(confirmation, { lang: this.context.voiceLang });
    } else {
      const t = this.getTranslations();
      this.speakNow(`${t.action} ${actionNumber}: ${action.label}. Element not found`, { lang: this.context.voiceLang });
    }
  }

  /**
   * Explain context of last mentioned action ("why" command)
   */
  private explainActionContext(): void {
    if (!this.temporaryActions || this.temporaryActions.length === 0) {
      if (this.context.locale === 'ar') {
        this.speakNow('لا توجد إجراءات متاحة. قل "ماذا يمكنني أن أفعل هنا" لعرض الإجراءات.', { lang: 'ar-SA' });
      } else {
        this.speakNow('No actions available. Say "what can I do here" to list actions.', { lang: 'en-US' });
      }
      return;
    }

    // Use the first action (most recent/important) or allow user to specify
    const action = this.temporaryActions[0];
    
    if (action.contextTitle && action.contextTitle.trim()) {
      if (this.context.locale === 'ar') {
        this.speakNow(`هذا الزر ينتمي إلى "${action.contextTitle}".`, { lang: 'ar-SA' });
      } else {
        this.speakNow(`This button belongs to the "${action.contextTitle}" card.`, { lang: 'en-US' });
      }
    } else {
      if (this.context.locale === 'ar') {
        this.speakNow(`لا يوجد سياق متاح لهذا الإجراء.`, { lang: 'ar-SA' });
      } else {
        this.speakNow('No context available for this action.', { lang: 'en-US' });
      }
    }
  }

  /**
   * Describe focused element feature
   */
  private describeFocusedElement(): void {
    const t = this.getTranslations();
    const focusedElement = document.activeElement as HTMLElement;

    // Check if there's a focused element (and it's not body or document)
    if (!focusedElement || 
        focusedElement === document.body || 
        focusedElement === document.documentElement ||
        focusedElement.tagName === 'BODY' ||
        focusedElement.tagName === 'HTML') {
      this.speakNow(t.noFocusedElement, { lang: this.context.voiceLang });
      return;
    }

    // Get element type
    const tagName = focusedElement.tagName.toLowerCase();
    const role = focusedElement.getAttribute('role') || '';
    let elementType = '';

    if (tagName === 'button' || role === 'button') {
      elementType = t.button;
    } else if (tagName === 'a' || role === 'link') {
      elementType = t.link;
    } else if (tagName === 'input') {
      const inputType = (focusedElement as HTMLInputElement).type || 'text';
      if (inputType === 'checkbox') {
        elementType = t.checkbox;
      } else if (inputType === 'radio') {
        elementType = t.radio;
      } else {
        elementType = t.editField;
      }
    } else if (tagName === 'textarea' || tagName === 'select') {
      elementType = t.editField;
    } else if (role === 'menuitem' || role === 'menu' || tagName === 'menu') {
      elementType = t.menu;
    } else {
      elementType = tagName;
    }

    // Get accessible name (uses getAccessibleLabel which already checks assistive map first)
    const accessibleName = this.getAccessibleLabel(focusedElement);

    // Build description
    let description = '';

    if (accessibleName && accessibleName.trim()) {
      description = `${elementType}, ${accessibleName}`;
    } else {
      description = `${elementType}, ${t.unlabeled}`;
    }

    // Add state information
    const states: string[] = [];

    // Checked state (for checkboxes and radio buttons)
    if (tagName === 'input') {
      const input = focusedElement as HTMLInputElement;
      if (input.type === 'checkbox' || input.type === 'radio') {
        if (input.checked) {
          states.push(t.checked);
        } else {
          states.push(t.unchecked);
        }
      }
    }

    // Expanded/collapsed state
    const expanded = focusedElement.getAttribute('aria-expanded');
    if (expanded === 'true') {
      states.push(t.expanded);
    } else if (expanded === 'false') {
      states.push(t.collapsed);
    }

    // Disabled state
    if (focusedElement.hasAttribute('disabled') || 
        focusedElement.getAttribute('aria-disabled') === 'true') {
      states.push(t.disabled);
    }

    // Required state (for inputs)
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      const input = focusedElement as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (input.hasAttribute('required') || input.getAttribute('aria-required') === 'true') {
        states.push(t.required);
      }
    }

    // Invalid state (for inputs)
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      const input = focusedElement as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (input.getAttribute('aria-invalid') === 'true' || 
          (input as any).validity && !(input as any).validity.valid) {
        states.push(t.invalid);
      }
    }

    // Append states to description
    if (states.length > 0) {
      description += `, ${states.join(', ')}`;
    }

    // Speak the description
    this.speakNow(description, { lang: this.context.voiceLang });
  }

  /**
   * Describe image feature
   */
  private describeImage(): void {
    const t = this.getTranslations();
    const img = this.findCandidateImageElement();

    if (!img) {
      this.speakNow(t.noImageFound, { lang: this.context.voiceLang });
      return;
    }

    // Try assistive map first
    let description = this.getImageDescriptionFromAssistiveMap(img);

    // Fallback to DOM alt text
    if (!description) {
      const alt = img.getAttribute('alt');
      if (alt !== null) {
        if (alt.trim() === '') {
          // Decorative image
          description = t.decorativeImage;
        } else {
          // Meaningful alt text
          description = alt;
        }
      } else {
        // No alt attribute
        description = t.imageWithoutDescription;
      }
    }

    // Speak the description
    this.speakNow(description, { lang: this.context.voiceLang });
  }

  /**
   * Get page description
   */
  private getPageDescription(): string {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      return metaDesc.getAttribute('content') || '';
    }

    const main = document.querySelector('main');
    if (main) {
      const firstPara = main.querySelector('p');
      if (firstPara) {
        return firstPara.textContent?.substring(0, 200) || '';
      }
    }

    return 'No description available';
  }

  /**
   * Read landmarks
   */
  private readLandmarks(): void {
    const landmarks: string[] = [];
    
    const nav = document.querySelector('nav, [role="navigation"]');
    if (nav) landmarks.push('Navigation');

    const main = document.querySelector('main, [role="main"]');
    if (main) landmarks.push('Main content');

    const aside = document.querySelector('aside, [role="complementary"]');
    if (aside) landmarks.push('Sidebar');

    const footer = document.querySelector('footer, [role="contentinfo"]');
    if (footer) landmarks.push('Footer');

    if (landmarks.length > 0) {
      this.speak(`Landmarks found: ${landmarks.join(', ')}`);
    } else {
      this.speak('No landmarks found on this page');
    }
  }

  /**
   * Collect interactive actions from page
   */
  private collectActions(): void {
    this.availableActions = [];
    this.currentActionIndex = -1;

    if (this.semanticMode && this.cachedSemanticModel?.actions && Array.isArray(this.cachedSemanticModel.actions)) {
      const semanticActions = (this.cachedSemanticModel.actions as any[]).slice(0, 10);
      semanticActions.forEach((action) => {
        const label = typeof action?.label === 'string' ? action.label : (typeof action?.type === 'string' ? action.type : 'Action');
        const selector = typeof action?.selector === 'string' ? action.selector : undefined;
        const element = selector ? this.findSemanticElement(selector) : null;
        this.availableActions.push({
          label,
          description: typeof action?.description === 'string' ? action.description : '',
          element,
        });
      });
      return;
    }

    // Find buttons, links, and form controls
    const interactiveElements = document.querySelectorAll(
      'button:not([disabled]), a[href], input[type="submit"], input[type="button"], [role="button"]:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    interactiveElements.forEach((el) => {
      const element = el as HTMLElement;
      if (!element.offsetParent) return; // Skip hidden elements

      const label = this.getAccessibleLabel(element);
      if (label && label.trim().length > 0) {
        const description = this.getActionDescription(element);
        this.availableActions.push({
          label: label,
          description: description,
          element: element,
        });
      }
    });

    console.log('[RaawiX Widget] Collected actions:', this.availableActions.length);
  }

  /**
   * Get accessible label for element (with assistive map override)
   */
  private getAccessibleLabel(element: HTMLElement): string {
    // Check assistive map first (Third Layer) for label override
    const labelOverride = this.getLabelOverride(element);
    if (labelOverride) {
      return labelOverride;
    }

    // Try aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    // Try aria-labelledby
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelEl = document.getElementById(ariaLabelledBy);
      if (labelEl) return labelEl.textContent?.trim() || '';
    }

    // Try associated label
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) return label.textContent?.trim() || '';
    }

    // Try text content
    const text = element.textContent?.trim();
    if (text && text.length > 0 && text.length < 100) return text;

    // Try title
    const title = element.getAttribute('title');
    if (title) return title;

    // For images, check assistive map for description
    if (element.tagName.toLowerCase() === 'img') {
      const imgDesc = this.getImageDescription(element as HTMLImageElement);
      if (imgDesc) {
        return imgDesc;
      }
    }

    return '';
  }

  /**
   * Get action description
   */
  private getActionDescription(element: HTMLElement): string {
    // Check assistive map first (Third Layer)
    const labelOverride = this.getLabelOverride(element);
    if (labelOverride) {
      return labelOverride;
    }

    const ariaDescribedBy = element.getAttribute('aria-describedby');
    if (ariaDescribedBy) {
      const descEl = document.getElementById(ariaDescribedBy);
      if (descEl) return descEl.textContent?.trim() || '';
    }

    // Try to get context from nearby text
    const parent = element.parentElement;
    if (parent) {
      const context = parent.textContent?.trim();
      if (context && context.length < 200) return context;
    }

    return '';
  }

  /**
   * Get label override from assistive map (Third Layer)
   */
  private getLabelOverride(element: HTMLElement): string | null {
    if (!this.cachedPagePackage?.assistiveMap) return null;

    const labelOverrides = this.cachedPagePackage.assistiveMap.labelOverrides;
    const actionIntents = this.cachedPagePackage.assistiveMap.actionIntents;

    // Try to match element by selector
    const selector = this.generateSelector(element);
    
    // Try direct match by selector key
    if (labelOverrides[selector]) {
      return labelOverrides[selector].label;
    }

    // Try matching by selector value in the override objects
    for (const [, override] of Object.entries(labelOverrides)) {
      if (override.selector && this.matchesSelector(element, override.selector)) {
        return override.label;
      }
    }

    // Try action intent
    if (actionIntents[selector]) {
      return actionIntents[selector].intent;
    }

    // Try matching action intent by selector value
    for (const [, intent] of Object.entries(actionIntents)) {
      if (intent.selector && this.matchesSelector(element, intent.selector)) {
        return intent.intent;
      }
    }

    return null;
  }

  /**
   * Get image description from assistive map (Third Layer)
   */
  private getImageDescription(img: HTMLImageElement): string | null {
    if (!this.cachedPagePackage?.assistiveMap) return null;

    const selector = this.generateSelector(img);
    const description = this.cachedPagePackage.assistiveMap.imageDescriptions[selector];
    if (description) {
      return description.alt;
    }

    return null;
  }

  /**
   * Generate stable selector for element (matches scanner logic)
   */
  private generateSelector(element: Element): string {
    // Try id first
    if (element.id) {
      return `#${element.id}`;
    }

    // Try data-testid
    const testId = element.getAttribute('data-testid');
    if (testId) {
      return `[data-testid="${testId}"]`;
    }

    // Try class names
    const classes = Array.from(element.classList).filter(c => c.length > 0);
    if (classes.length > 0) {
      return `.${classes.join('.')}`;
    }

    // Fallback to tag + position
    const tagName = element.tagName.toLowerCase();
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(c => c.tagName === element.tagName);
      const index = siblings.indexOf(element);
      if (index >= 0 && siblings.length > 1) {
        return `${tagName}:nth-of-type(${index + 1})`;
      }
    }

    return tagName;
  }

  /**
   * Read available actions
   */
  private readActions(): void {
    this.collectActions();

    if (this.availableActions.length === 0) {
      this.speak('No actions found on this page');
      return;
    }

    const actionList = this.availableActions.map((a, i) => `${i + 1}. ${a.label}`).join('. ');
    this.speak(`Found ${this.availableActions.length} actions: ${actionList}. Say "next action" to navigate.`);
    
    // Start at first action
    this.currentActionIndex = 0;
    this.highlightCurrentAction();
  }

  /**
   * Navigate to next action
   */
  private navigateToNextAction(): void {
    if (this.availableActions.length === 0) {
      this.collectActions();
    }

    if (this.availableActions.length === 0) {
      this.speak('No actions available');
      return;
    }

    this.currentActionIndex = (this.currentActionIndex + 1) % this.availableActions.length;
    this.highlightCurrentAction();
    this.readCurrentAction();
  }

  /**
   * Navigate to previous action
   */
  private navigateToPreviousAction(): void {
    if (this.availableActions.length === 0) {
      this.collectActions();
    }

    if (this.availableActions.length === 0) {
      this.speak('No actions available');
      return;
    }

    this.currentActionIndex = this.currentActionIndex <= 0 
      ? this.availableActions.length - 1 
      : this.currentActionIndex - 1;
    this.highlightCurrentAction();
    this.readCurrentAction();
  }

  /**
   * Highlight current action
   */
  private highlightCurrentAction(): void {
    // Remove previous highlights
    document.querySelectorAll('.raawi-voice-highlighted').forEach((el) => {
      el.classList.remove('raawi-voice-highlighted');
      (el as HTMLElement).style.outline = '';
      (el as HTMLElement).style.outlineOffset = '';
    });

    if (this.currentActionIndex >= 0 && this.currentActionIndex < this.availableActions.length) {
      const action = this.availableActions[this.currentActionIndex];
      if (action.element) {
        action.element.classList.add('raawi-voice-highlighted');
        action.element.style.outline = '4px solid #ff0000';
        action.element.style.outlineOffset = '2px';
        
        // Scroll into view if needed
        action.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  /**
   * Read current action
   */
  private readCurrentAction(): void {
    if (this.currentActionIndex >= 0 && this.currentActionIndex < this.availableActions.length) {
      const action = this.availableActions[this.currentActionIndex];
      const text = action.description 
        ? `Action ${this.currentActionIndex + 1}: ${action.label}. ${action.description}`
        : `Action ${this.currentActionIndex + 1}: ${action.label}`;
      this.speak(text);
    }
  }

  /**
   * Activate current action
   */
  private activateCurrentAction(): void {
    if (this.currentActionIndex >= 0 && this.currentActionIndex < this.availableActions.length) {
      const action = this.availableActions[this.currentActionIndex];
      if (action.element) {
        // Don't hijack focus - just trigger click
        action.element.click();
        this.speak(`Activated: ${action.label}`);
      }
    } else {
      this.speak('No action selected. Say "read actions" to list available actions.');
    }
  }

  /**
   * Read issues (accessibility problems)
   */
  private async readIssues(): Promise<void> {
    // Try to fetch from API first
    const apiIssues = await this.fetchIssuesAsync();
    
    if (apiIssues && apiIssues.issues && apiIssues.issues.length > 0) {
      const issueCount = apiIssues.issues.length;
      const topIssues = apiIssues.issues.slice(0, 5).map(issue => {
        const severity = issue.severity === 'critical' ? 'critical' : issue.severity === 'important' ? 'important' : 'minor';
        return `${issue.title} (${severity})`;
      }).join('. ');
      this.speak(`Found ${issueCount} known issues on this page. For example: ${topIssues}.`);
      return;
    }

    // Fallback: scan DOM for obvious issues
    const issues: string[] = [];
    
    // Check for images without alt
    const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
    if (imagesWithoutAlt.length > 0) {
      issues.push(`${imagesWithoutAlt.length} images without alt text`);
    }
    
    // Check for buttons/links without accessible names
    const buttons = document.querySelectorAll('button, [role="button"]');
    let unlabeledButtons = 0;
    buttons.forEach((btn) => {
      const element = btn as HTMLElement;
      const hasText = element.textContent && element.textContent.trim().length > 0;
      const hasAriaLabel = element.getAttribute('aria-label');
      const hasAriaLabelledby = element.getAttribute('aria-labelledby');
      if (!hasText && !hasAriaLabel && !hasAriaLabelledby) {
        unlabeledButtons++;
      }
    });
    if (unlabeledButtons > 0) {
      issues.push(`${unlabeledButtons} buttons without labels`);
    }
    
    if (issues.length > 0) {
      this.speak(`Found ${issues.length} potential issues: ${issues.join('. ')}`);
    } else {
      this.speak('No obvious accessibility issues detected on this page');
    }
  }

  // ============================================
  // FORM ASSISTANT (Agent Mode) Implementation
  // ============================================

  /**
   * Detect forms on page load and route changes (A2)
   */
  private detectForms(): void {
    this.formSnapshot = this.buildFormSnapshot();
    this.updateFormAssistantUI();
  }

  /**
   * Setup observer for route changes (SPA navigation) (A2)
   */
  private setupRouteChangeObserver(): void {
    // A2: Throttled MutationObserver for DOM changes
    let detectTimeout: number | null = null;
    const throttledDetect = () => {
      if (detectTimeout) {
        clearTimeout(detectTimeout);
      }
      detectTimeout = window.setTimeout(() => {
        this.detectForms();
      }, 500); // Throttle to 500ms
    };

    // Watch for URL changes (SPA navigation)
    let lastUrl = location.href;
    const checkUrlChange = () => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        // Small delay to allow DOM to update
        setTimeout(() => {
          this.detectForms();
        }, 500);
      }
    };
    
    // A2: MutationObserver for DOM changes (throttled)
    if (this.routeChangeObserver) {
      this.routeChangeObserver.disconnect();
    }
    
    this.routeChangeObserver = new MutationObserver(throttledDetect);
    this.routeChangeObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false, // Only watch for new elements, not attribute changes
    });

    // Check periodically (for SPAs that don't trigger popstate)
    setInterval(checkUrlChange, 1000);

    // Watch for popstate (browser back/forward)
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        this.detectForms();
      }, 500);
    });

    // Watch for DOM changes that might indicate form addition
    if (this.formObserver) {
      this.formObserver.disconnect();
    }

    this.formObserver = new MutationObserver((mutations) => {
      let shouldRecheck = false;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            if (element.tagName === 'FORM' || element.querySelector('form') || 
                (element.querySelectorAll('input, textarea, select').length >= 3)) {
              shouldRecheck = true;
            }
          }
        });
      });
      if (shouldRecheck) {
        this.detectForms();
      }
    });

    this.formObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Build Form Snapshot
   * Priority: assistiveMap.forms (scan-generated) > guidance.formSteps > DOM detection
   */
  private buildFormSnapshot(): FormSnapshot | null {
    // Priority 1: Use scan-generated assistiveMap.forms (primary source of truth)
    if (this.cachedPagePackage?.assistiveMap?.forms && 
        Array.isArray(this.cachedPagePackage.assistiveMap.forms) &&
        this.cachedPagePackage.assistiveMap.forms.length > 0) {
      try {
        const snapshot = this.buildFormSnapshotFromAssistiveMap();
        if (snapshot && (snapshot.fields.length > 0 || snapshot.uploads.length > 0)) {
          console.log('[Form Assistant] Using scan-generated form plan', {
            formsCount: this.cachedPagePackage.assistiveMap.forms.length,
            fieldsCount: snapshot.fields.length,
            uploadsCount: snapshot.uploads.length,
          });
          return snapshot;
        }
      } catch (error) {
        console.warn('[Form Assistant] Failed to build snapshot from assistiveMap.forms, falling back to DOM', error);
        // Fall through to DOM fallback
      }
    }

    // Priority 2: Use guidance.formSteps (legacy)
    if (this.cachedPagePackage?.guidance?.formSteps && this.cachedPagePackage.guidance.formSteps.length > 0) {
      return this.buildFormSnapshotFromGuidance();
    }

    // Priority 3: Detect <form> elements (DOM fallback)
    const forms = document.querySelectorAll('form');
    if (forms.length > 0) {
      return this.buildFormSnapshotFromForm(forms[0] as HTMLFormElement);
    }

    // Priority 4: Detect form-like containers (>=3 inputs) (DOM fallback)
    const formLikeContainer = this.findFormLikeContainer();
    if (formLikeContainer) {
      return this.buildFormSnapshotFromContainer(formLikeContainer);
    }

    return null;
  }

  /**
   * Build snapshot from guidance.formSteps
   */
  private buildFormSnapshotFromGuidance(): FormSnapshot | null {
    if (!this.cachedPagePackage?.guidance?.formSteps) return null;

    const formSteps = this.cachedPagePackage.guidance.formSteps;
    const fields: FormField[] = [];
    const uploads: FormUpload[] = [];
    const submitButtons: FormSubmitButton[] = [];

    formSteps.forEach((step) => {
      step.fields.forEach((field) => {
        if (field.type === 'file') {
          // Find file input
          const fileInput = this.findInputByLabel(field.label || '');
          if (fileInput && (fileInput as HTMLInputElement).type === 'file') {
            uploads.push({
              selector: this.generateSelector(fileInput),
              label: field.label || 'File upload',
              context: step.label || '',
              element: fileInput as HTMLInputElement,
            });
          }
        } else {
          // Find regular input
          const input = this.findInputByLabel(field.label || '');
          if (input) {
            fields.push({
              selector: this.generateSelector(input),
              inputType: field.type || (input as HTMLInputElement).type || 'text',
              required: field.required || false,
              currentValueEmpty: !(input as HTMLInputElement).value,
              label: field.label || this.getAccessibleName(input),
              element: input,
            });
          }
        }
      });
    });

    // Find submit buttons
    const submitBtns = document.querySelectorAll('button[type="submit"], input[type="submit"], [role="button"][aria-label*="submit" i]');
    submitBtns.forEach((btn) => {
      submitButtons.push({
        selector: this.generateSelector(btn),
        label: this.getAccessibleName(btn as HTMLElement),
        element: btn as HTMLElement,
      });
    });

    const requiredFields = fields.filter(f => f.required);
    const remainingRequired = requiredFields.filter(f => f.currentValueEmpty);

    return {
      formElement: null,
      fields,
      uploads,
      submitButtons,
      totalRequiredFields: requiredFields.length,
      totalRequiredFieldsRemaining: remainingRequired.length,
      totalUploads: uploads.length,
    };
  }

  /**
   * Build snapshot from assistiveMap.forms (scan-generated Form Assist Plan)
   * This is the primary source of truth when available
   */
  private buildFormSnapshotFromAssistiveMap(): FormSnapshot | null {
    if (!this.cachedPagePackage?.assistiveMap?.forms || 
        !Array.isArray(this.cachedPagePackage.assistiveMap.forms) ||
        this.cachedPagePackage.assistiveMap.forms.length === 0) {
      return null;
    }

    const forms = this.cachedPagePackage.assistiveMap.forms;
    const fields: FormField[] = [];
    const uploads: FormUpload[] = [];
    const submitButtons: FormSubmitButton[] = [];

    // Process all forms (usually just one, but handle multiple)
    for (const formPlan of forms) {
      // Process fields
      for (const fieldPlan of formPlan.fields || []) {
        try {
          // Try to find element by selector
          let element = document.querySelector(fieldPlan.selector) as HTMLElement | null;
          
          // If selector not found (DOM drift), try fallback matching
          if (!element) {
            console.warn('[Form Assistant] Selector not found, trying fallback matching', {
              selector: fieldPlan.selector,
              label: fieldPlan.label,
            });
            element = this.findFieldByFallback(fieldPlan);
          }

          if (element) {
            // Get label (prefer scan-generated, use current language)
            const label = this.getBilingualLabel(fieldPlan.label);
            
            // Get hint if available
            const hint = fieldPlan.hint ? this.getBilingualLabel(fieldPlan.hint) : undefined;

            fields.push({
              selector: fieldPlan.selector,
              inputType: fieldPlan.inputType || 'text',
              required: fieldPlan.required,
              currentValueEmpty: !this.getFieldValue(element),
              label,
              element,
              // Store additional metadata for voice guidance
              hint,
              stepTitle: formPlan.stepTitle ? this.getBilingualLabel(formPlan.stepTitle) : undefined,
              stepIndex: formPlan.stepIndex,
            });
          } else {
            console.warn('[Form Assistant] Field element not found, skipping', {
              selector: fieldPlan.selector,
              label: fieldPlan.label,
            });
          }
        } catch (e) {
          console.warn('[Form Assistant] Error processing field from scan plan', {
            selector: fieldPlan.selector,
            error: e instanceof Error ? e.message : 'Unknown error',
          });
        }
      }

      // Process uploads
      for (const uploadPlan of formPlan.uploads || []) {
        try {
          let element = document.querySelector(uploadPlan.selector) as HTMLInputElement | null;
          
          if (!element) {
            // Fallback: try to find file input by label
            const label = this.getBilingualLabel(uploadPlan.label);
            element = this.findFileInputByLabel(label);
          }

          if (element && element.type === 'file') {
            const label = this.getBilingualLabel(uploadPlan.label);
            const hint = uploadPlan.hint ? this.getBilingualLabel(uploadPlan.hint) : undefined;

            uploads.push({
              selector: uploadPlan.selector,
              label,
              context: hint || formPlan.stepTitle ? this.getBilingualLabel(formPlan.stepTitle) : '',
              element,
              acceptedTypes: uploadPlan.acceptedTypes,
              hint, // Store hint for voice guidance
            });
          }
        } catch (e) {
          console.warn('[Form Assistant] Error processing upload from scan plan', {
            selector: uploadPlan.selector,
            error: e instanceof Error ? e.message : 'Unknown error',
          });
        }
      }

      // Process actions (submit buttons, etc.)
      for (const actionPlan of formPlan.actions || []) {
        try {
          let element = document.querySelector(actionPlan.selector) as HTMLElement | null;
          
          if (!element) {
            // Fallback: try to find button by label
            const label = this.getBilingualLabel(actionPlan.label);
            element = this.findButtonByLabel(label, actionPlan.type);
          }

          if (element) {
            const label = this.getBilingualLabel(actionPlan.label);
            const intent = actionPlan.intent ? this.getBilingualLabel(actionPlan.intent) : undefined;

            submitButtons.push({
              selector: actionPlan.selector,
              label,
              element,
              actionType: actionPlan.type, // Store action type
              intent, // Store intent for voice guidance
            });
          }
        } catch (e) {
          console.warn('[Form Assistant] Error processing action from scan plan', {
            selector: actionPlan.selector,
            error: e instanceof Error ? e.message : 'Unknown error',
          });
        }
      }
    }

    const requiredFields = fields.filter(f => f.required);
    const remainingRequired = requiredFields.filter(f => f.currentValueEmpty);

    return {
      formElement: null,
      fields,
      uploads,
      submitButtons,
      totalRequiredFields: requiredFields.length,
      totalRequiredFieldsRemaining: remainingRequired.length,
      totalUploads: uploads.length,
      // Store form plan metadata for step titles
      formPlans: forms, // Store for step title access
    };
  }

  /**
   * Find field by fallback matching (when selector fails due to DOM drift)
   */
  private findFieldByFallback(fieldPlan: {
    selector: string;
    tag: string;
    inputType?: string;
    label: { en?: string; ar?: string };
  }): HTMLElement | null {
    const label = this.getBilingualLabel(fieldPlan.label);
    
    // Try to find by label + type
    const inputs = document.querySelectorAll(`${fieldPlan.tag}[type="${fieldPlan.inputType || 'text'}"]`);
    for (const input of Array.from(inputs)) {
      const inputLabel = this.getFieldLabel(input as HTMLElement);
      if (inputLabel.toLowerCase().includes(label.toLowerCase()) || 
          label.toLowerCase().includes(inputLabel.toLowerCase())) {
        return input as HTMLElement;
      }
    }

    // Try to find by label only
    return this.findInputByLabel(label);
  }

  /**
   * Find file input by label
   */
  private findFileInputByLabel(label: string): HTMLInputElement | null {
    const fileInputs = document.querySelectorAll('input[type="file"]');
    for (const input of Array.from(fileInputs)) {
      const inputLabel = this.getFieldLabel(input as HTMLElement);
      if (inputLabel.toLowerCase().includes(label.toLowerCase()) ||
          label.toLowerCase().includes(inputLabel.toLowerCase())) {
        return input as HTMLInputElement;
      }
    }
    return null;
  }

  /**
   * Find button by label and type
   */
  private findButtonByLabel(label: string, type: string): HTMLElement | null {
    const buttons = document.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]');
    for (const button of Array.from(buttons)) {
      const buttonLabel = this.getAccessibleName(button as HTMLElement);
      const buttonType = (button as HTMLInputElement).type || '';
      
      if ((buttonLabel.toLowerCase().includes(label.toLowerCase()) ||
           label.toLowerCase().includes(buttonLabel.toLowerCase())) &&
          (type === 'submit' ? buttonType === 'submit' : true)) {
        return button as HTMLElement;
      }
    }
    return null;
  }

  /**
   * Get bilingual label (prefer current language, fallback to other)
   */
  private getBilingualLabel(labelObj: { en?: string; ar?: string } | string | undefined): string {
    if (!labelObj) return '';
    
    // If it's already a string, return as-is (backward compatibility)
    if (typeof labelObj === 'string') {
      return labelObj;
    }

    // Prefer current language
    if (this.context.locale === 'ar' && labelObj.ar) {
      return labelObj.ar;
    }
    if (this.context.locale === 'en' && labelObj.en) {
      return labelObj.en;
    }

    // Fallback to other language
    if (labelObj.en) return labelObj.en;
    if (labelObj.ar) return labelObj.ar;

    return '';
  }

  /**
   * Build snapshot from HTML <form> element
   */
  private buildFormSnapshotFromForm(form: HTMLFormElement): FormSnapshot {
    const fields: FormField[] = [];
    const uploads: FormUpload[] = [];
    const submitButtons: FormSubmitButton[] = [];

    // Get all inputs, textareas, selects within the form
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach((input) => {
      const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const type = element.type || element.tagName.toLowerCase();

      if (type === 'file') {
        const label = this.getFieldLabel(element);
        uploads.push({
          selector: this.generateSelector(element),
          label,
          context: this.getFieldContext(element),
          element: element as HTMLInputElement,
        });
      } else if (type !== 'submit' && type !== 'button' && type !== 'hidden' && type !== 'reset') {
        const required = element.hasAttribute('required') || 
                        element.getAttribute('aria-required') === 'true';
        const label = this.getFieldLabel(element);
        
        fields.push({
          selector: this.generateSelector(element),
          inputType: type,
          required,
          currentValueEmpty: !this.getFieldValue(element),
          label,
          element,
        });
      }
    });

    // Find submit buttons
    const submitBtns = form.querySelectorAll('button[type="submit"], input[type="submit"]');
    submitBtns.forEach((btn) => {
      submitButtons.push({
        selector: this.generateSelector(btn),
        label: this.getAccessibleName(btn as HTMLElement),
        element: btn as HTMLElement,
      });
    });

    // Also check for primary CTA buttons outside form but nearby
    const nearbyButtons = this.findNearbySubmitButtons(form);
    nearbyButtons.forEach((btn) => {
      if (!submitButtons.find(sb => sb.element === btn)) {
        submitButtons.push({
          selector: this.generateSelector(btn),
          label: this.getAccessibleName(btn),
          element: btn,
        });
      }
    });

    const requiredFields = fields.filter(f => f.required);
    const remainingRequired = requiredFields.filter(f => f.currentValueEmpty);

    return {
      formElement: form,
      fields,
      uploads,
      submitButtons,
      totalRequiredFields: requiredFields.length,
      totalRequiredFieldsRemaining: remainingRequired.length,
      totalUploads: uploads.length,
    };
  }

  /**
   * Build snapshot from form-like container (>=3 inputs)
   */
  private buildFormSnapshotFromContainer(container: HTMLElement): FormSnapshot {
    const fields: FormField[] = [];
    const uploads: FormUpload[] = [];
    const submitButtons: FormSubmitButton[] = [];

    const inputs = container.querySelectorAll('input, textarea, select');
    inputs.forEach((input) => {
      const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const type = element.type || element.tagName.toLowerCase();

      if (type === 'file') {
        const label = this.getFieldLabel(element);
        uploads.push({
          selector: this.generateSelector(element),
          label,
          context: this.getFieldContext(element),
          element: element as HTMLInputElement,
        });
      } else if (type !== 'submit' && type !== 'button' && type !== 'hidden' && type !== 'reset') {
        const required = element.hasAttribute('required') || 
                        element.getAttribute('aria-required') === 'true';
        const label = this.getFieldLabel(element);
        
        fields.push({
          selector: this.generateSelector(element),
          inputType: type,
          required,
          currentValueEmpty: !this.getFieldValue(element),
          label,
          element,
        });
      }
    });

    // Find submit buttons in container
    const submitBtns = container.querySelectorAll('button[type="submit"], input[type="submit"], button.primary, button[class*="submit"], button[class*="cta"]');
    submitBtns.forEach((btn) => {
      submitButtons.push({
        selector: this.generateSelector(btn),
        label: this.getAccessibleName(btn as HTMLElement),
        element: btn as HTMLElement,
      });
    });

    const requiredFields = fields.filter(f => f.required);
    const remainingRequired = requiredFields.filter(f => f.currentValueEmpty);

    return {
      formElement: null,
      fields,
      uploads,
      submitButtons,
      totalRequiredFields: requiredFields.length,
      totalRequiredFieldsRemaining: remainingRequired.length,
      totalUploads: uploads.length,
    };
  }

  /**
   * Find form-like container (>=3 inputs within a container)
   */
  private findFormLikeContainer(): HTMLElement | null {
    // Look for containers with multiple inputs
    const containers = document.querySelectorAll('div, section, article, main, [role="form"], [role="application"]');
    
    for (const container of Array.from(containers)) {
      const inputs = container.querySelectorAll('input, textarea, select');
      if (inputs.length >= 3) {
        // Check if it's not inside a form (to avoid duplicates)
        if (!container.closest('form')) {
          return container as HTMLElement;
        }
      }
    }

    return null;
  }

  /**
   * Get field label (uses assistiveMap first, then DOM)
   */
  private getFieldLabel(element: HTMLElement): string {
    // Priority 1: Assistive map label override
    const labelOverride = this.getLabelOverride(element);
    if (labelOverride) {
      return labelOverride;
    }

    // Priority 2: Accessible name from DOM
    return this.getAccessibleName(element);
  }

  /**
   * Get accessible name from DOM
   */
  private getAccessibleName(element: HTMLElement): string {
    // aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) {
      return ariaLabel.trim();
    }

    // aria-labelledby
    const ariaLabelledby = element.getAttribute('aria-labelledby');
    if (ariaLabelledby) {
      const labelElement = document.getElementById(ariaLabelledby);
      if (labelElement && labelElement.textContent) {
        return labelElement.textContent.trim();
      }
    }

    // label[for]
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label && label.textContent) {
        return label.textContent.trim();
      }
    }

    // Associated label (parent or previous sibling)
    const associatedLabel = element.closest('label');
    if (associatedLabel && associatedLabel.textContent) {
      return associatedLabel.textContent.trim();
    }

    // Placeholder (fallback)
    if (element instanceof HTMLInputElement && element.placeholder) {
      return element.placeholder;
    }

    // Type-based fallback
    const tagName = element.tagName.toLowerCase();
    const type = (element as HTMLInputElement).type || '';
    
    if (tagName === 'input' && type) {
      return `${type} input`;
    } else if (tagName === 'textarea') {
      return 'Text area';
    } else if (tagName === 'select') {
      return 'Select';
    }

    return 'Unlabeled field';
  }

  /**
   * Get field value
   */
  private getFieldValue(element: HTMLElement): string {
    if (element instanceof HTMLInputElement) {
      return element.value || '';
    } else if (element instanceof HTMLTextAreaElement) {
      return element.value || '';
    } else if (element instanceof HTMLSelectElement) {
      return element.value || '';
    }
    return '';
  }

  /**
   * Get field context (nearby heading or container label)
   */
  private getFieldContext(element: HTMLElement): string {
    // Find nearest heading
    let current: HTMLElement | null = element.parentElement;
    while (current && current !== document.body) {
      const heading = current.querySelector('h1, h2, h3, h4, h5, h6');
      if (heading && heading.textContent) {
        return heading.textContent.trim();
      }
      current = current.parentElement;
    }

    // Find container with role or class
    const container = element.closest('[role="group"], [role="region"], .form-group, .field-group');
    if (container) {
      const label = container.querySelector('label, .label, [class*="label"]');
      if (label && label.textContent) {
        return label.textContent.trim();
      }
    }

    return '';
  }

  /**
   * Find input by label text
   */
  private findInputByLabel(labelText: string): HTMLElement | null {
    // Try to find by exact label match
    const labels = Array.from(document.querySelectorAll('label'));
    for (const label of labels) {
      if (label.textContent && label.textContent.trim().toLowerCase() === labelText.toLowerCase()) {
        const forAttr = label.getAttribute('for');
        if (forAttr) {
          const input = document.getElementById(forAttr);
          if (input) return input;
        }
        // Check if label contains input
        const input = label.querySelector('input, textarea, select');
        if (input) return input as HTMLElement;
      }
    }

    // Try to find by aria-label
    const inputs = document.querySelectorAll('input, textarea, select');
    for (const input of Array.from(inputs)) {
      const ariaLabel = input.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.toLowerCase().includes(labelText.toLowerCase())) {
        return input as HTMLElement;
      }
    }

    return null;
  }

  /**
   * Find nearby submit buttons
   */
  private findNearbySubmitButtons(form: HTMLFormElement): HTMLElement[] {
    const buttons: HTMLElement[] = [];
    
    // Check next sibling
    const nextSibling = form.nextElementSibling;
    if (nextSibling) {
      const submitBtn = nextSibling.querySelector('button[type="submit"], button.primary, button[class*="submit"]');
      if (submitBtn) {
        buttons.push(submitBtn as HTMLElement);
      }
    }

    // Check parent's next sibling
    const parent = form.parentElement;
    if (parent) {
      const sibling = parent.nextElementSibling;
      if (sibling) {
        const submitBtn = sibling.querySelector('button[type="submit"], button.primary, button[class*="submit"]');
        if (submitBtn) {
          buttons.push(submitBtn as HTMLElement);
        }
      }
    }

    return buttons;
  }

  /**
   * Update Login Assist UI visibility (B)
   */
  private updateLoginAssistUI(): void {
    const loginSection = this.panel?.querySelector('#raawi-login-assist-section') as HTMLElement | null;
    const authBanner = this.panel?.querySelector('#raawi-auth-banner') as HTMLElement | null;
    const startBtn = this.panel?.querySelector('#raawi-login-assist-start') as HTMLButtonElement | null;
    
    if (!loginSection || !authBanner || !startBtn) return;

    // B: Show/hide based on auth flow detection
    if (this.authFlowDetection && this.authFlowDetection.isAuthFlow) {
      loginSection.style.display = 'block';
      authBanner.style.display = 'flex'; // B2: Show banner
      startBtn.disabled = false;
    } else {
      loginSection.style.display = 'none';
      authBanner.style.display = 'none';
    }
  }

  /**
   * Update Form Assistant UI visibility (A1, A2)
   * Always show card, but enable/disable based on form detection
   */
  private updateFormAssistantUI(): void {
    const formSection = this.panel?.querySelector('#raawi-form-assistant-section') as HTMLElement | null;
    const startBtn = this.panel?.querySelector('#raawi-form-assistant-start') as HTMLButtonElement | null;
    const noFormMessage = this.panel?.querySelector('#raawi-form-assistant-no-form-message') as HTMLElement | null;
    if (!formSection || !startBtn || !noFormMessage) return;

    const hasForm = this.formSnapshot && (this.formSnapshot.fields.length > 0 || this.formSnapshot.uploads.length > 0);
    
    // Always show the card (A1)
    formSection.style.display = 'block';
    
    if (hasForm) {
      // Form detected - enable card
      startBtn.disabled = false;
      noFormMessage.style.display = 'none';
      formSection.classList.remove('raawi-tool-card-disabled');
    } else {
      // No form - disable card with message (A1)
      startBtn.disabled = true;
      noFormMessage.style.display = 'block';
      formSection.classList.add('raawi-tool-card-disabled');
    }
  }

  /**
   * Arabic (Saudi) Voice Scripts - B1: Start prompt
   */
  private getArabicStartScript(): string {
    return 'هلا، أنا مساعد النماذج من راوي. بعطيك خطوة خطوة لين تخلص. تقدر تقول: التالي، كرر، تخطي، مراجعة، إيقاف. ملاحظة: ما راح أرسل أي شيء بدون تأكيدك.';
  }

  /**
   * Arabic (Saudi) Voice Scripts - B2: Field prompt
   */
  private getArabicFieldPrompt(fieldLabel: string, required: boolean, formatHint?: string): string {
    const requiredText = required ? 'مطلوب' : 'اختياري';
    let prompt = `الحقل: ${fieldLabel}. ${requiredText}. املِ علي القيمة.`;
    if (formatHint) {
      prompt += ` ملاحظة: هذا الحقل لازم يكون ${formatHint}.`;
    }
    return prompt;
  }

  /**
   * Arabic (Saudi) Voice Scripts - B3: Normal confirmation
   */
  private getArabicNormalConfirmation(value: string): string {
    return `سمعت: ${value}. صحيح؟`;
  }

  /**
   * Arabic (Saudi) Voice Scripts - B4: Sensitive double confirmation
   */
  private getArabicDoubleConfirmationFirst(value: string): string {
    return `هذا حقل حساس. بأكررها عليك مرتين للتأكد. المرة الأولى: ${value}. صحيح؟`;
  }

  private getArabicDoubleConfirmationSecond(value: string): string {
    return `المرة الثانية للتأكيد: ${value}. تأكد إنها صحيحة؟`;
  }

  private getArabicDoubleConfirmationSuccess(): string {
    return 'تم إدخالها بنجاح.';
  }

  /**
   * Arabic (Saudi) Voice Scripts - B5: Upload
   */
  private getArabicUploadPrompt(docName: string): string {
    return `الحين نحتاج نرفع مرفق: ${docName}. بفتح لك نافذة اختيار الملفات. اختر الملف وبعدين علمني إذا جاهز.`;
  }

  private getArabicUploadSelected(filename: string): string {
    return `تم اختيار الملف: ${filename}. تبي نكمل؟`;
  }

  /**
   * Arabic (Saudi) Voice Scripts - B6: Review + submit
   */
  private getArabicReviewPrompt(summary: string): string {
    return `مراجعة سريعة قبل الإرسال: ${summary}. تنبيه: الإرسال خطوة نهائية. تقول: تأكيد الإرسال.`;
  }

  private getArabicSubmitConfirm(): string {
    return 'تمام. بأضغط إرسال الآن.';
  }

  /**
   * Detect if field requires double confirmation (C1, C2)
   */
  private requiresDoubleConfirmation(field: FormField): boolean {
    const label = this.getBilingualLabel(field.label).toLowerCase();
    const hint = field.hint ? this.getBilingualLabel(field.hint).toLowerCase() : '';

    // C1: Always double-confirm
    const alwaysDoubleConfirm = [
      'هوية', 'إقامة', 'iqama', 'national id', 'رقم الهوية', 'رقم الإقامة',
      'جوال', 'mobile', 'رقم الجوال', 'رقم الهاتف',
      'بريد', 'email', 'البريد الإلكتروني',
      'iban', 'رقم الحساب', 'account number',
      'صك', 'رخصة', 'سجل', 'معاملة', 'رقم',
      'مبلغ', 'amount', 'قيمة',
      'تاريخ الميلاد', 'date of birth', 'dob'
    ];

    for (const keyword of alwaysDoubleConfirm) {
      if (label.includes(keyword) || hint.includes(keyword)) {
        return true;
      }
    }

    // C2: Conditional double-confirm
    const conditionalDoubleConfirm = [
      'الاسم الكامل', 'full name',
      'لوحة', 'plate', 'chassis',
      'سجل تجاري', 'commercial registration', 'establishment'
    ];

    for (const keyword of conditionalDoubleConfirm) {
      if (label.includes(keyword) || hint.includes(keyword)) {
        // Check if it's used for official matching
        if (label.includes('مطابقة') || label.includes('matching') || hint.includes('مطابقة')) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Detect if field is password (C3)
   */
  private isPasswordField(field: FormField): boolean {
    return (field.inputType || '').toLowerCase() === 'password' ||
           this.getBilingualLabel(field.label).toLowerCase().includes('كلمة المرور') ||
           this.getBilingualLabel(field.label).toLowerCase().includes('password');
  }

  /**
   * Detect authentication flow (B: Detect SSO / Nafath / login pages)
   */
  private detectAuthFlow(): { isAuthFlow: boolean; authType: 'nafath' | 'sso' | 'login' | 'unknown'; confidence: 'high' | 'medium' | 'low' } {
    const url = window.location.href.toLowerCase();
    const pageText = document.body.textContent?.toLowerCase() || '';
    
    let isAuthFlow = false;
    let authType: 'nafath' | 'sso' | 'login' | 'unknown' = 'unknown';
    let confidence: 'high' | 'medium' | 'low' = 'low';
    
    // URL heuristics
    const authUrlPatterns = [
      /login|signin|auth|sso|nafath|نفاذ|تسجيل|دخول/i,
    ];
    
    const hasAuthUrl = authUrlPatterns.some(pattern => pattern.test(url));
    
    // Page text heuristics (EN/AR keywords)
    const authKeywords = {
      en: ['login', 'sign in', 'username', 'password', 'authenticate', 'sso', 'single sign on'],
      ar: ['تسجيل الدخول', 'دخول', 'اسم المستخدم', 'كلمة المرور', 'نفاذ', 'تأكيد الهوية'],
    };
    
    const hasAuthText = authKeywords.en.some(kw => pageText.includes(kw)) ||
                       authKeywords.ar.some(kw => pageText.includes(kw));
    
    // Check for login inputs
    const hasLoginInputs = document.querySelectorAll('input[type="password"], input[name*="password"], input[id*="password"], input[name*="username"], input[id*="username"], input[name*="user"], input[id*="user"]').length > 0;
    
    // Check for login buttons
    const hasLoginButtons = document.querySelectorAll('button:contains("login"), button:contains("sign in"), button:contains("تسجيل"), button:contains("دخول")').length > 0 ||
                            Array.from(document.querySelectorAll('button, [role="button"]')).some(btn => {
                              const text = btn.textContent?.toLowerCase() || '';
                              return authKeywords.en.some(kw => text.includes(kw)) ||
                                     authKeywords.ar.some(kw => text.includes(kw));
                            });
    
    // Nafath-specific detection
    const hasNafathText = /نفاذ|nafath/i.test(pageText) || /نفاذ|nafath/i.test(url);
    const hasNafathQR = document.querySelectorAll('img[src*="nafath"], img[alt*="نفاذ"], [class*="nafath"], [id*="nafath"]').length > 0;
    
    // Determine auth flow
    if (hasNafathText || hasNafathQR) {
      isAuthFlow = true;
      authType = 'nafath';
      confidence = hasNafathQR ? 'high' : 'medium';
    } else if (hasAuthUrl && hasLoginInputs && hasLoginButtons) {
      isAuthFlow = true;
      authType = hasAuthUrl && /sso|single.sign.on/i.test(url) ? 'sso' : 'login';
      confidence = 'high';
    } else if (hasLoginInputs && hasLoginButtons) {
      isAuthFlow = true;
      authType = 'login';
      confidence = 'medium';
    } else if (hasAuthUrl || hasAuthText) {
      isAuthFlow = true;
      authType = 'login';
      confidence = 'low';
    }
    
    return { isAuthFlow, authType, confidence };
  }

  /**
   * Detect Najiz mode (legacy - uses detectAuthFlow)
   */
  private detectNajizMode(): boolean {
    if (!this.authFlowDetection) {
      this.authFlowDetection = this.detectAuthFlow();
    }
    return this.authFlowDetection?.isAuthFlow || false;
  }

  /**
   * Get Arabic prompt for Najiz mode detection (D1)
   */
  private getArabicNajizDetectionPrompt(): string {
    return 'واضح إن هذي صفحة تسجيل دخول عبر النفاذ الوطني. أنا بساعدك بالتنقل، لكن أنت اللي تأكد الهوية بنفسك.';
  }

  /**
   * Start Login Assist (C, D, F)
   */
  private startLoginAssist(): void {
    if (!this.authFlowDetection || !this.authFlowDetection.isAuthFlow) {
      return;
    }

    this.loginAssistActive = true;
    this.najizMode = true;

    // F: Telemetry - log login assist started
    console.log('[RaawiX Widget] Login Assist started', {
      authType: this.authFlowDetection?.authType,
      confidence: this.authFlowDetection?.confidence,
      locale: this.context.locale,
    });

    // C: Speak safety announcement
    if (this.context.locale === 'ar') {
      this.speakNow(
        'واضح إن هذي صفحة تسجيل دخول عبر النفاذ الوطني. أنا بساعدك بالتنقل وشرح الخطوات، لكن أنت اللي تأكد الهوية بنفسك.',
        { lang: 'ar-SA' }
      );
    } else {
      this.speakNow(
        'This looks like a government login/SSO flow. I can guide navigation and steps, but you must confirm identity yourself.',
        { lang: 'en-US' }
      );
    }

    // Update UI
    const startBtn = this.panel?.querySelector('#raawi-login-assist-start') as HTMLElement | null;
    const stopBtn = this.panel?.querySelector('#raawi-login-assist-stop') as HTMLElement | null;
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'block';

    // D: Start step guidance
    this.guideLoginSteps();

    // Monitor for login success
    this.monitorForSuccessfulLogin();
  }

  /**
   * Stop Login Assist (F)
   */
  private stopLoginAssist(): void {
    this.loginAssistActive = false;
    this.najizMode = false;

    // F: Telemetry - log login assist stopped
    console.log('[RaawiX Widget] Login Assist stopped');

    const startBtn = this.panel?.querySelector('#raawi-login-assist-start') as HTMLElement | null;
    const stopBtn = this.panel?.querySelector('#raawi-login-assist-stop') as HTMLElement | null;
    if (startBtn) startBtn.style.display = 'block';
    if (stopBtn) stopBtn.style.display = 'none';
  }

  /**
   * Guide login steps (D)
   */
  private guideLoginSteps(): void {
    // D: Find primary CTA button
    const loginButtons = this.findLoginButtons();
    
    if (loginButtons.length > 0) {
      const button = loginButtons[0];
      const prompt = this.context.locale === 'ar'
        ? 'لقيت زر تسجيل الدخول. تبي أروح له؟'
        : 'I found the login button. Do you want me to focus it?';
      
      this.speakNow(prompt, { lang: this.context.voiceLang });
      
      // Store button for potential focus/click
      (this as any).pendingLoginButton = button;
    }

    // D: Check for Nafath approval text
    const nafathText = this.detectNafathApprovalText();
    if (nafathText) {
      setTimeout(() => {
        const prompt = this.context.locale === 'ar'
          ? 'الحين راح يوصلك طلب موافقة في تطبيق نفاذ. وافق من الجوال، وبعدها قل: تم.'
          : 'You will receive an approval request in the Nafath app. Approve from your phone, then say: done.';
        this.speakNow(prompt, { lang: this.context.voiceLang });
      }, 2000);
    }

    // D: Check for OTP inputs
    const otpInputs = this.detectOTPInputs();
    if (otpInputs.length > 0) {
      setTimeout(() => {
        const prompt = this.context.locale === 'ar'
          ? 'أشوف خانات رمز التحقق. املِ علي الرمز رقم رقم.'
          : 'I see verification code fields. Tell me the code digit by digit.';
        this.speakNow(prompt, { lang: this.context.voiceLang });
      }, 2000);
    }
  }

  /**
   * Find login buttons (D)
   */
  private findLoginButtons(): HTMLElement[] {
    const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]')) as HTMLElement[];
    const loginKeywords = ['تسجيل الدخول', 'login', 'sign in', 'دخول', 'تأكيد'];
    
    return buttons.filter(btn => {
      const text = btn.textContent?.toLowerCase() || '';
      const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
      return loginKeywords.some(keyword => text.includes(keyword.toLowerCase()) || ariaLabel.includes(keyword.toLowerCase()));
    });
  }

  /**
   * Detect Nafath approval text (D)
   */
  private detectNafathApprovalText(): boolean {
    const pageText = document.body.textContent?.toLowerCase() || '';
    const nafathKeywords = ['نفاذ', 'nafath', 'موافقة', 'approval', 'تطبيق', 'app'];
    return nafathKeywords.some(keyword => pageText.includes(keyword));
  }

  /**
   * Detect OTP inputs (D)
   */
  private detectOTPInputs(): HTMLElement[] {
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="number"]')) as HTMLInputElement[];
    return inputs.filter(input => {
      const name = input.name?.toLowerCase() || '';
      const id = input.id?.toLowerCase() || '';
      const placeholder = input.placeholder?.toLowerCase() || '';
      const maxLength = input.maxLength;
      
      return (name.includes('otp') || name.includes('code') || name.includes('رمز') || 
              id.includes('otp') || id.includes('code') || id.includes('رمز') ||
              placeholder.includes('code') || placeholder.includes('رمز')) &&
             (maxLength === 1 || maxLength === 6 || maxLength === 4);
    });
  }

  /**
   * Najiz login assist mode - navigation only (legacy, kept for compatibility)
   */
  private handleNajizLoginAssist(): void {
    // This is now handled by startLoginAssist()
    this.startLoginAssist();
  }

  /**
   * Monitor for Nafath verification step (D2)
   */
  private monitorNafathVerification(): void {
    const checkInterval = setInterval(() => {
      if (!this.najizMode || !this.formAssistantActive) {
        clearInterval(checkInterval);
        return;
      }

      const pageText = document.body.innerText.toLowerCase();
      if (pageText.includes('نفاذ') || pageText.includes('nafath') || 
          pageText.includes('تطبيق') || pageText.includes('app')) {
        const prompt = this.context.locale === 'ar'
          ? `الآن وافق على الهوية في تطبيق النفاذ الوطني على جوالك.`
          : `Now approve the identity in the Nafath app on your phone.`;
        this.speakNow(prompt, { lang: this.context.voiceLang });
        clearInterval(checkInterval);
      }
    }, 2000);

    // Stop monitoring after 60 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 60000);
  }

  /**
   * Monitor for successful login and suggest Form Assistant (D, E)
   */
  private monitorForSuccessfulLogin(): void {
    const checkInterval = setInterval(() => {
      if (!this.loginAssistActive && !this.najizMode) {
        clearInterval(checkInterval);
        return;
      }

      if (this.detectSuccessfulLogin()) {
        clearInterval(checkInterval);
        this.najizMode = false; // Switch to normal mode
        
        // D: Announce success
        const prompt = this.context.locale === 'ar'
          ? 'تم تسجيل الدخول. تبي نروح للخدمة؟'
          : 'Login appears successful. Want to proceed to the service?';
        this.speakNow(prompt, { lang: this.context.voiceLang });
        
        // Re-detect forms after login
        this.detectForms();
        
        // E: If form exists, suggest Form Assistant
        setTimeout(() => {
          if (this.formSnapshot && (this.formSnapshot.fields.length > 0 || this.formSnapshot.uploads.length > 0)) {
            const suggestion = this.context.locale === 'ar'
              ? 'الآن تقدر تستخدم مساعد تعبئة النماذج.'
              : 'You can use Form Assistant now.';
            this.speakNow(suggestion, { lang: this.context.voiceLang });
          }
        }, 2000);
        
        // Stop login assist
        this.stopLoginAssist();
      }
    }, 2000); // Check every 2 seconds

    // Stop monitoring after 5 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 300000);
  }

  /**
   * Detect successful login (D)
   */
  private detectSuccessfulLogin(): boolean {
    const pageText = document.body.textContent?.toLowerCase() || '';
    
    // D: Signs of login success
    const successIndicators = [
      'حسابي', 'لوحة التحكم', 'profile', 'dashboard', 'account',
      'مرحباً', 'welcome', 'مرحبا بك'
    ];
    
    const hasSuccessIndicator = successIndicators.some(indicator => pageText.includes(indicator));
    
    // D: Login button disappeared
    const loginButtons = this.findLoginButtons();
    const loginButtonGone = loginButtons.length === 0 && this.authFlowDetection?.isAuthFlow;
    
    // Check for logout button (indicates logged in)
    const logoutButtons = Array.from(document.querySelectorAll('button, a')).filter(el => {
      const text = el.textContent?.toLowerCase() || '';
      return text.includes('تسجيل خروج') || text.includes('logout') || text.includes('خروج');
    });

    return hasSuccessIndicator || loginButtonGone || logoutButtons.length > 0;
  }

  /**
   * Start Form Assistant
   */
  private startFormAssistant(): void {
    if (!this.formSnapshot) {
      const t = this.getTranslations();
      this.speakNow(t.formAssistantNoForm, { lang: this.context.voiceLang });
      return;
    }

    // Detect Najiz mode (D1)
    this.najizMode = this.detectNajizMode();
    if (this.najizMode && this.context.locale === 'ar') {
      this.speakNow(this.getArabicNajizDetectionPrompt(), { lang: 'ar-SA' });
    }

    this.formAssistantActive = true;
    this.formAssistantState = 'form_detected';
    this.currentFieldIndex = -1;
    this.pendingConfirmation = null;
    this.lastSpokenValue = '';

    // Update UI
    const startBtn = this.panel?.querySelector('#raawi-form-assistant-start') as HTMLElement | null;
    const stopBtn = this.panel?.querySelector('#raawi-form-assistant-stop') as HTMLElement | null;
    const uploadBtn = this.panel?.querySelector('#raawi-form-assistant-upload') as HTMLElement | null;
    const activeBadge = this.panel?.querySelector('#raawi-form-assistant-active-badge') as HTMLElement | null;
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'block';
    if (uploadBtn) uploadBtn.style.display = 'none';
    if (activeBadge) activeBadge.style.display = 'inline-block';

    // If Najiz mode, handle login assist (D2)
    if (this.najizMode) {
      this.handleNajizLoginAssist();
      // Monitor for successful login (D3)
      this.monitorForSuccessfulLogin();
      return;
    }

    // A3: Speak onboarding in selected locale
    this.speakFormAssistantOnboarding();

    // Start with first required field
    this.moveToNextRequiredField();
  }

  /**
   * Stop Form Assistant
   */
  private stopFormAssistant(): void {
    this.formAssistantActive = false;
    this.formAssistantState = 'stopped';
    this.currentFieldIndex = -1;
    this.najizMode = false;
    this.pendingConfirmation = null;
    this.lastSpokenValue = '';

    // Update UI
    const startBtn = this.panel?.querySelector('#raawi-form-assistant-start') as HTMLElement | null;
    const stopBtn = this.panel?.querySelector('#raawi-form-assistant-stop') as HTMLElement | null;
    const uploadBtn = this.panel?.querySelector('#raawi-form-assistant-upload') as HTMLElement | null;
    const statusEl = this.panel?.querySelector('#raawi-form-assistant-status') as HTMLElement | null;
    const activeBadge = this.panel?.querySelector('#raawi-form-assistant-active-badge') as HTMLElement | null;
    
    if (startBtn) startBtn.style.display = 'block';
    if (stopBtn) stopBtn.style.display = 'none';
    if (uploadBtn) uploadBtn.style.display = 'none';
    if (statusEl) statusEl.textContent = '';
    if (activeBadge) activeBadge.style.display = 'none';
    
    this.pendingFileUpload = null;

    // Remove focus from current field
    if (document.activeElement && document.activeElement !== document.body) {
      (document.activeElement as HTMLElement).blur();
    }
  }

  /**
   * Speak Form Assistant onboarding (A3)
   */
  private speakFormAssistantOnboarding(): void {
    if (!this.formSnapshot) return;

    const t = this.getTranslations();
    const required = this.formSnapshot.totalRequiredFieldsRemaining;
    const uploads = this.formSnapshot.totalUploads;

    let message: string;
    if (this.context.locale === 'ar') {
      // Use Arabic script (B2)
      message = this.getArabicStartScript();
      // Then add form summary
      const formSummary = t.formAssistantSummary
        .replace('{required}', required.toString())
        .replace('{uploads}', uploads.toString());
      message += ' ' + formSummary;
    } else {
      message = t.formAssistantSummary
        .replace('{required}', required.toString())
        .replace('{uploads}', uploads.toString());
      // Add safety note in English
      message += ' Note: I will not submit anything without your confirmation.';
    }

    this.speakNow(message, { lang: this.context.voiceLang });
  }

  /**
   * Speak form summary (legacy - kept for compatibility)
   */
  private speakFormSummary(): void {
    if (!this.formSnapshot) return;

    const t = this.getTranslations();
    const required = this.formSnapshot.totalRequiredFieldsRemaining;
    const uploads = this.formSnapshot.totalUploads;

    let summary: string;
    if (this.context.locale === 'ar') {
      // Use Arabic script (B1) for start
      summary = this.getArabicStartScript();
      // Then add form summary
      const formSummary = t.formAssistantSummary
        .replace('{required}', required.toString())
        .replace('{uploads}', uploads.toString());
      summary += ' ' + formSummary;
    } else {
      summary = t.formAssistantSummary
        .replace('{required}', required.toString())
        .replace('{uploads}', uploads.toString());
      // Add safety note in English
      summary += ' Note: I will not submit anything without your confirmation.';
    }

    this.speakNow(summary, { lang: this.context.voiceLang });
  }

  /**
   * Move to next required field
   */
  private moveToNextRequiredField(): void {
    if (!this.formSnapshot) return;

    const requiredFields = this.formSnapshot.fields.filter(f => f.required && f.currentValueEmpty);
    
    if (requiredFields.length === 0) {
      // All required fields complete, check uploads
      if (this.formSnapshot.uploads.length > 0) {
        this.handleNextUpload(0);
      } else {
        this.speakFormComplete();
      }
      return;
    }

    this.currentFieldIndex++;
    if (this.currentFieldIndex >= requiredFields.length) {
      this.currentFieldIndex = 0; // Loop back
    }

    const field = requiredFields[this.currentFieldIndex];
    this.focusField(field);
  }

  /**
   * Focus field and ask for value
   */
  private focusField(field: FormField): void {
    if (!field.element) {
      // Try to find element by selector
      try {
        field.element = document.querySelector(field.selector) as HTMLElement;
      } catch (e) {
        // Invalid selector
      }
    }

    if (!field.element) {
      const t = this.getTranslations();
      this.speakNow(`${t.formAssistantFieldLabel.replace('{label}', this.getBilingualLabel(field.label))}. Element not found.`, 
        { lang: this.context.voiceLang });
      return;
    }

    // Update status
    this.updateFormAssistantStatus();
    this.formAssistantState = 'collecting_field_value';

    // Scroll into view
    field.element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // C3: Password fields - never read aloud, instruct manual entry
    if (this.isPasswordField(field)) {
      const prompt = this.context.locale === 'ar' 
        ? 'ادخل كلمة المرور الآن يدويًا، وإذا خلصت قل تم.'
        : 'Please enter your password manually now. When done, say "done".';
      this.speakNow(prompt, { lang: this.context.voiceLang });
      return;
    }

    // Focus (only after user says "next")
    // We'll focus when user explicitly says "next field"
    
    // Speak field info (use scan-generated labels, step titles, and hints)
    const t = this.getTranslations();
    const fieldLabel = this.getBilingualLabel(field.label);
    const requiredText = field.required ? t.formAssistantFieldRequired : t.formAssistantFieldOptional;
    
    // Include step title if available (from scan plan)
    let stepPrefix = '';
    if (field.stepTitle) {
      stepPrefix = `${this.getBilingualLabel(field.stepTitle)}. `;
    } else if (field.stepIndex !== undefined) {
      stepPrefix = `${t.step || 'Step'} ${field.stepIndex + 1}. `;
    }
    
    // Format hint from validation
    let formatHint: string | undefined;
    if (field.validation) {
      if (field.validation.pattern) {
        formatHint = field.inputType === 'email' ? 'بريد إلكتروني' : 
                     field.inputType === 'tel' ? 'رقم هاتف' :
                     field.inputType === 'number' ? 'أرقام' : undefined;
      }
      if (field.validation.minLength && field.validation.maxLength) {
        formatHint = `${field.validation.minLength}-${field.validation.maxLength} أحرف`;
      }
    }
    
    // Use Arabic script (B2) if Arabic, else English
    let prompt: string;
    if (this.context.locale === 'ar') {
      prompt = this.getArabicFieldPrompt(fieldLabel, field.required, formatHint);
      if (stepPrefix) {
        prompt = stepPrefix + prompt;
      }
      // Add hint if available
      if (field.hint) {
        prompt += `. ${this.getBilingualLabel(field.hint)}`;
      }
    } else {
      prompt = `${stepPrefix}${t.formAssistantFieldLabel.replace('{label}', fieldLabel)}. ${requiredText}. ${t.formAssistantEnterValue.replace('{label}', fieldLabel)}`;
      if (formatHint) {
        prompt += ` Note: This field must be ${formatHint}.`;
      }
      if (field.hint) {
        prompt += `. ${this.getBilingualLabel(field.hint)}`;
      }
    }

    this.speakNow(prompt, { lang: this.context.voiceLang });
  }

  /**
   * Update Form Assistant status display
   */
  private updateFormAssistantStatus(): void {
    if (!this.formSnapshot) return;

    const statusEl = this.panel?.querySelector('#raawi-form-assistant-status') as HTMLElement | null;
    if (!statusEl) return;

    const requiredFields = this.formSnapshot.fields.filter(f => f.required);
    const currentField = requiredFields[this.currentFieldIndex];
    
    if (currentField) {
      const t = this.getTranslations();
      const status = t.formAssistantStatus
        .replace('{current}', (this.currentFieldIndex + 1).toString())
        .replace('{total}', requiredFields.length.toString())
        .replace('{field}', currentField.label);
      statusEl.textContent = status;
    }
  }

  /**
   * Handle form field value entry
   */
  private handleFieldValueEntry(value: string): void {
    if (!this.formSnapshot || this.currentFieldIndex < 0) return;

    const requiredFields = this.formSnapshot.fields.filter(f => f.required && f.currentValueEmpty);
    if (this.currentFieldIndex >= requiredFields.length) return;

    const field = requiredFields[this.currentFieldIndex];
    if (!field.element) {
      try {
        field.element = document.querySelector(field.selector) as HTMLElement;
      } catch (e) {
        return;
      }
    }

    if (!field.element) return;

    // C3: Password fields - never read aloud, just confirm "done"
    if (this.isPasswordField(field)) {
      // User said "done" or "تم" - just fill and move on
      this.speakNow(this.context.locale === 'ar' ? 'تم إدخال كلمة المرور.' : 'Password entered.', 
        { lang: this.context.voiceLang });
      field.currentValueEmpty = false;
      setTimeout(() => {
        this.moveToNextRequiredField();
      }, 1000);
      return;
    }

    // C1, C2: Check if double confirmation required
    const needsDoubleConfirm = this.requiresDoubleConfirmation(field);
    
    if (needsDoubleConfirm && !this.pendingConfirmation) {
      // First confirmation
      this.lastSpokenValue = value;
      this.pendingConfirmation = { type: 'sensitive_field', value };
      
      if (this.context.locale === 'ar') {
        this.speakNow(this.getArabicDoubleConfirmationFirst(value), { lang: 'ar-SA' });
      } else {
        this.speakNow(`This is a sensitive field. I'll repeat it twice for confirmation. First time: ${value}. Is that correct?`, 
          { lang: 'en-US' });
      }
      return; // Wait for confirmation
    }

    if (needsDoubleConfirm && this.pendingConfirmation && this.pendingConfirmation.value === value) {
      // Second confirmation
      if (this.context.locale === 'ar') {
        this.speakNow(this.getArabicDoubleConfirmationSecond(value), { lang: 'ar-SA' });
      } else {
        this.speakNow(`Second time for confirmation: ${value}. Please confirm it's correct?`, 
          { lang: 'en-US' });
      }
      // Wait for final confirmation
      return;
    }

    // Normal field - single confirmation
    if (!needsDoubleConfirm) {
      // Fill value
      this.fillFieldValue(field, value);
      
      // Check for validation errors (A7)
      const validationError = this.checkFieldValidation(field);
      if (validationError) {
        this.speakNow(validationError, { lang: this.context.voiceLang });
        return; // Don't move to next field if validation fails
      }
      
      // Confirm (B3)
      if (this.context.locale === 'ar') {
        this.speakNow(this.getArabicNormalConfirmation(value), { lang: 'ar-SA' });
      } else {
        const t = this.getTranslations();
        this.speakNow(t.formAssistantValueEntered.replace('{value}', value), { lang: 'en-US' });
      }
      
      // Wait for user to say "yes" or "correct" - for now, auto-advance after short delay
      // In full implementation, we'd wait for voice confirmation
      setTimeout(() => {
        this.moveToNextRequiredField();
      }, 1500);
    }
  }

  /**
   * Check field validation errors (A7)
   */
  private checkFieldValidation(field: FormField): string | null {
    if (!field.element) return null;

    // Check aria-invalid
    if (field.element.getAttribute('aria-invalid') === 'true') {
      const errorMsg = this.getFieldErrorMessage(field);
      if (this.context.locale === 'ar') {
        return `فيه خطأ في ${this.getBilingualLabel(field.label)}: ${errorMsg}. تبي أصلحها الحين؟`;
      } else {
        return `There's an error in ${this.getBilingualLabel(field.label)}: ${errorMsg}. Would you like to fix it now?`;
      }
    }

    // Check for error messages near field
    const errorElement = this.findFieldErrorMessage(field.element);
    if (errorElement) {
      const errorMsg = errorElement.textContent?.trim() || 'Validation error';
      if (this.context.locale === 'ar') {
        return `فيه خطأ في ${this.getBilingualLabel(field.label)}: ${errorMsg}. تبي أصلحها الحين؟`;
      } else {
        return `There's an error in ${this.getBilingualLabel(field.label)}: ${errorMsg}. Would you like to fix it now?`;
      }
    }

    // Check HTML5 validation
    if (field.element instanceof HTMLInputElement || field.element instanceof HTMLTextAreaElement) {
      if (!field.element.validity.valid) {
        const errorMsg = field.element.validationMessage || 'Invalid value';
        if (this.context.locale === 'ar') {
          return `فيه خطأ في ${this.getBilingualLabel(field.label)}: ${errorMsg}. تبي أصلحها الحين؟`;
        } else {
          return `There's an error in ${this.getBilingualLabel(field.label)}: ${errorMsg}. Would you like to fix it now?`;
        }
      }
    }

    return null;
  }

  /**
   * Get field error message
   */
  private getFieldErrorMessage(field: FormField): string {
    const errorElement = this.findFieldErrorMessage(field.element);
    if (errorElement) {
      return errorElement.textContent?.trim() || 'Validation error';
    }
    return 'Validation error';
  }

  /**
   * Find error message element near field
   */
  private findFieldErrorMessage(element: HTMLElement | null): HTMLElement | null {
    if (!element) return null;

    // Check aria-describedby
    const describedBy = element.getAttribute('aria-describedby');
    if (describedBy) {
      const errorEl = document.getElementById(describedBy);
      if (errorEl && (errorEl.getAttribute('role') === 'alert' || 
                      errorEl.classList.contains('error') ||
                      errorEl.textContent?.toLowerCase().includes('error'))) {
        return errorEl;
      }
    }

    // Check next sibling
    let sibling = element.nextElementSibling;
    if (sibling && (sibling.classList.contains('error') || 
                    sibling.getAttribute('role') === 'alert' ||
                    sibling.textContent?.toLowerCase().includes('error'))) {
      return sibling as HTMLElement;
    }

    // Check parent's next sibling
    const parent = element.parentElement;
    if (parent) {
      sibling = parent.nextElementSibling;
      if (sibling && (sibling.classList.contains('error') || 
                      sibling.getAttribute('role') === 'alert')) {
        return sibling as HTMLElement;
      }
    }

    return null;
  }

  /**
   * Fill field value (helper)
   */
  private fillFieldValue(field: FormField, value: string): void {
    if (!field.element) return;

    // Fill value
    if (field.element instanceof HTMLInputElement || field.element instanceof HTMLTextAreaElement) {
      field.element.value = value;
      // Trigger input event
      field.element.dispatchEvent(new Event('input', { bubbles: true }));
      field.element.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (field.element instanceof HTMLSelectElement) {
      // Try to find option by value or text
      const option = Array.from(field.element.options).find(
        opt => opt.value.toLowerCase() === value.toLowerCase() || 
               opt.text.toLowerCase().includes(value.toLowerCase())
      );
      if (option) {
        field.element.value = option.value;
        field.element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // Update snapshot
    field.currentValueEmpty = !this.getFieldValue(field.element);
  }

  /**
   * Handle file upload
   */
  private handleNextUpload(index: number): void {
    if (!this.formSnapshot || index >= this.formSnapshot.uploads.length) {
      this.speakFormComplete();
      return;
    }

    const upload = this.formSnapshot.uploads[index];
    if (!upload.element) {
      try {
        upload.element = document.querySelector(upload.selector) as HTMLInputElement;
      } catch (e) {
        // Invalid selector
      }
    }

    if (!upload.element) {
      // Skip this upload
      if (index + 1 < this.formSnapshot.uploads.length) {
        this.handleNextUpload(index + 1);
      } else {
        this.speakFormComplete();
      }
      return;
    }

    this.formAssistantState = 'upload_pending';
    
    // Use Arabic script (B5) if Arabic, else English
    const uploadLabel = this.getBilingualLabel(upload.label);
    let uploadPrompt: string;
    if (this.context.locale === 'ar') {
      uploadPrompt = this.getArabicUploadPrompt(uploadLabel);
      if (upload.hint) {
        uploadPrompt = `${this.getBilingualLabel(upload.hint)}. ${uploadPrompt}`;
      }
    } else {
      const t = this.getTranslations();
      uploadPrompt = t.formAssistantChooseFile;
      if (upload.hint) {
        uploadPrompt = `${this.getBilingualLabel(upload.hint)}. ${uploadPrompt}`;
      } else if (upload.acceptedTypes) {
        uploadPrompt = `${uploadPrompt} (${upload.acceptedTypes})`;
      }
    }
    
    this.speakNow(uploadPrompt, { lang: this.context.voiceLang });

    // Store pending upload - will be triggered by user gesture
    this.pendingFileUpload = {
      element: upload.element,
      index,
    };

    // Show upload button (user can click to trigger file picker)
    const uploadBtn = this.panel?.querySelector('#raawi-form-assistant-upload') as HTMLElement | null;
    if (uploadBtn) {
      uploadBtn.style.display = 'block';
    }

    // Also try to auto-trigger (user gesture from "Start form assistant" button might still be valid)
    // Small delay to ensure speech has started
    setTimeout(() => {
      if (this.pendingFileUpload && this.pendingFileUpload.element) {
        try {
          this.triggerFilePicker();
        } catch (e) {
          // If auto-trigger fails (user gesture expired), user can click the button
          console.log('[Form Assistant] File picker auto-trigger failed, user can click button');
        }
      }
    }, 500);
  }

  /**
   * Trigger file picker (must be called from user gesture)
   */
  private triggerFilePicker(): void {
    if (!this.pendingFileUpload) return;

    const fileInput = this.pendingFileUpload.element;
    if (fileInput) {
      fileInput.click();

      // Listen for file selection
      const uploadIndex = this.pendingFileUpload.index;
      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files.length > 0) {
          const filename = fileInput.files[0].name;
          // Use Arabic script (B5) if Arabic, else English
          const confirmation = this.context.locale === 'ar' 
            ? this.getArabicUploadSelected(filename)
            : `File selected: ${filename}. Continue?`;
          this.speakNow(confirmation, { lang: this.context.voiceLang });

          // Hide upload button
          const uploadBtn = this.panel?.querySelector('#raawi-form-assistant-upload') as HTMLElement | null;
          if (uploadBtn) uploadBtn.style.display = 'none';

          // Move to next upload or complete
          this.pendingFileUpload = null;
          if (uploadIndex + 1 < (this.formSnapshot?.uploads.length || 0)) {
            this.handleNextUpload(uploadIndex + 1);
          } else {
            this.speakFormComplete();
          }
        }
      }, { once: true });
    }
  }

  /**
   * Speak form complete message
   */
  private speakFormComplete(): void {
    const t = this.getTranslations();
    this.speakNow(t.formAssistantAllFieldsComplete, { lang: this.context.voiceLang });
  }

  /**
   * Confirm and submit form
   */
  private confirmAndSubmitForm(): void {
    if (!this.formSnapshot) return;

    this.formAssistantState = 'review';
    
    // Build summary for review
    const requiredFields = this.formSnapshot.fields.filter(f => f.required);
    const completedFields = requiredFields.filter(f => !f.currentValueEmpty);
    const summary = this.context.locale === 'ar'
      ? `${completedFields.length} من ${requiredFields.length} حقول مطلوبة مكتملة`
      : `${completedFields.length} of ${requiredFields.length} required fields completed`;

    // Use Arabic script (B6) if Arabic, else English
    if (this.context.locale === 'ar') {
      this.speakNow(this.getArabicReviewPrompt(summary), { lang: 'ar-SA' });
    } else {
      this.speakNow(`Review before submit: ${summary}. Warning: Submit is final. Say "confirm submit".`, 
        { lang: 'en-US' });
    }

    // Wait for user confirmation (they need to say "confirm submit" or click submit)
    // We don't auto-submit - user must explicitly confirm
    this.pendingConfirmation = { type: 'submit' };
  }

  /**
   * Execute submit after confirmation
   */
  private executeSubmit(): void {
    if (!this.formSnapshot || !this.formSnapshot.submitButtons.length) return;

    this.formAssistantState = 'submit_confirm';
    
    if (this.context.locale === 'ar') {
      this.speakNow(this.getArabicSubmitConfirm(), { lang: 'ar-SA' });
    } else {
      this.speakNow('Confirmed. Clicking submit now.', { lang: 'en-US' });
    }

    const submitBtn = this.formSnapshot.submitButtons[0].element;
    if (submitBtn) {
      setTimeout(() => {
        submitBtn.click();
        this.stopFormAssistant();
      }, 1000);
    }
  }

  /**
   * Process form assistant voice commands
   */
  private processFormAssistantCommand(command: string): boolean {
    if (!this.formAssistantActive) return false;

    const normalized = command.toLowerCase().trim();
    const t = this.getTranslations();

    // Next field
    if (normalized.includes('next field') || normalized.includes(t.formAssistantNextField.toLowerCase()) ||
        (this.context.locale === 'ar' && (normalized.includes('التالي') || normalized.includes('الحقل التالي')))) {
      // Focus current field first
      if (this.formSnapshot && this.currentFieldIndex >= 0) {
        const requiredFields = this.formSnapshot.fields.filter(f => f.required && f.currentValueEmpty);
        if (this.currentFieldIndex < requiredFields.length) {
          const field = requiredFields[this.currentFieldIndex];
          if (field.element) {
            field.element.focus();
          }
        }
      }
      this.moveToNextRequiredField();
      return true;
    }

    // Repeat
    if (normalized.includes('repeat') || normalized.includes(t.formAssistantRepeat.toLowerCase()) ||
        (this.context.locale === 'ar' && normalized.includes('كرر'))) {
      if (this.formSnapshot && this.currentFieldIndex >= 0) {
        const requiredFields = this.formSnapshot.fields.filter(f => f.required && f.currentValueEmpty);
        if (this.currentFieldIndex < requiredFields.length) {
          this.focusField(requiredFields[this.currentFieldIndex]);
        }
      }
      return true;
    }

    // Skip
    if (normalized.includes('skip') || normalized.includes(t.formAssistantSkip.toLowerCase()) ||
        (this.context.locale === 'ar' && normalized.includes('تخطي'))) {
      const t = this.getTranslations();
      this.speakNow(t.formAssistantFieldSkipped, { lang: this.context.voiceLang });
      this.moveToNextRequiredField();
      return true;
    }

    // Review
    if (normalized.includes('review') || normalized.includes(t.formAssistantReview.toLowerCase()) ||
        (this.context.locale === 'ar' && normalized.includes('مراجعة'))) {
      this.speakFormSummary();
      return true;
    }

    // Previous field (A2)
    if (normalized.includes('previous field') || normalized.includes(t.formAssistantPreviousField.toLowerCase()) ||
        (this.context.locale === 'ar' && (normalized.includes('السابق') || normalized.includes('الحقل السابق')))) {
      if (this.formSnapshot && this.currentFieldIndex > 0) {
        this.currentFieldIndex--;
        const requiredFields = this.formSnapshot.fields.filter(f => f.required && f.currentValueEmpty);
        if (this.currentFieldIndex < requiredFields.length) {
          this.focusField(requiredFields[this.currentFieldIndex]);
        }
      }
      return true;
    }

    // Stop assistant
    if (normalized.includes('stop assistant') || normalized.includes(t.formAssistantStop.toLowerCase()) ||
        (this.context.locale === 'ar' && (normalized.includes('أوقف') || normalized.includes('توقف')))) {
      this.stopFormAssistant();
      return true;
    }

    // File upload trigger (if pending)
    if (this.pendingFileUpload && (normalized.includes('open file') || normalized.includes('choose file') ||
        (this.context.locale === 'ar' && (normalized.includes('اختر ملف') || normalized.includes('فتح ملف'))))) {
      this.triggerFilePicker();
      return true;
    }

    // Confirmation responses (yes/correct/تم/صحيح)
    if (normalized.includes('yes') || normalized.includes('correct') || normalized.includes('done') ||
        (this.context.locale === 'ar' && (normalized.includes('نعم') || normalized.includes('صحيح') || normalized.includes('تم')))) {
      // Handle double confirmation
      if (this.pendingConfirmation && this.pendingConfirmation.type === 'sensitive_field') {
        // User confirmed first time - ask second time
        if (this.lastSpokenValue) {
          if (this.context.locale === 'ar') {
            this.speakNow(this.getArabicDoubleConfirmationSecond(this.lastSpokenValue), { lang: 'ar-SA' });
          } else {
            this.speakNow(`Second time for confirmation: ${this.lastSpokenValue}. Please confirm it's correct?`, 
              { lang: 'en-US' });
          }
        }
        return true;
      }
      // Handle second confirmation
      if (this.pendingConfirmation && this.pendingConfirmation.type === 'sensitive_field' && this.lastSpokenValue) {
        // User confirmed second time - fill field
        const requiredFields = this.formSnapshot?.fields.filter(f => f.required && f.currentValueEmpty) || [];
        if (this.currentFieldIndex >= 0 && this.currentFieldIndex < requiredFields.length) {
          const field = requiredFields[this.currentFieldIndex];
          this.fillFieldValue(field, this.lastSpokenValue);
          if (this.context.locale === 'ar') {
            this.speakNow(this.getArabicDoubleConfirmationSuccess(), { lang: 'ar-SA' });
          } else {
            this.speakNow('Value entered successfully.', { lang: 'en-US' });
          }
          this.pendingConfirmation = null;
          this.lastSpokenValue = '';
          setTimeout(() => {
            this.moveToNextRequiredField();
          }, 1000);
        }
        return true;
      }
      // Handle normal confirmation
      if (this.formAssistantState === 'collecting_field_value' && !this.pendingConfirmation) {
        // User confirmed value - move to next
        setTimeout(() => {
          this.moveToNextRequiredField();
        }, 500);
        return true;
      }
      // Handle submit confirmation
      if (this.pendingConfirmation && this.pendingConfirmation.type === 'submit') {
        this.executeSubmit();
        return true;
      }
      return true;
    }

    // Submit command (A2)
    if (normalized.includes('submit') || normalized.includes(t.formAssistantSubmit.toLowerCase()) ||
        (this.context.locale === 'ar' && normalized.includes('إرسال'))) {
      this.confirmAndSubmitForm();
      return true;
    }

    // Confirm submit command (A2)
    if (normalized.includes('confirm submit') || normalized.includes(t.formAssistantConfirmSubmit.toLowerCase()) ||
        (this.context.locale === 'ar' && normalized.includes('تأكيد الإرسال'))) {
      if (this.pendingConfirmation && this.pendingConfirmation.type === 'submit') {
        this.executeSubmit();
      } else {
        this.confirmAndSubmitForm();
      }
      return true;
    }

    // If we're in form assistant mode and user provides a value, treat it as field value
    if (this.formSnapshot && this.currentFieldIndex >= 0 && normalized.length > 2) {
      // Check if it's not a command
      const isCommand = normalized.includes('next') || normalized.includes('skip') || normalized.includes('repeat') ||
                       normalized.includes('stop') || normalized.includes('review') || normalized.includes('submit');
      if (!isCommand) {
        this.handleFieldValueEntry(command); // Use original command (not normalized) to preserve value
        return true;
      }
    }

    return false;
  }

  /**
   * Speak available commands
   */
  private speakCommands(): void {
    const commands = [
      'Reading: read page, read summary, detailed summary',
      'Narration controls: pause, resume, stop, next, repeat, faster, slower',
      'Navigation: read landmarks, read actions, read issues',
      'Text controls: increase text, decrease text',
      'Spacing controls: increase spacing, decrease spacing',
      'Toggle controls: contrast on or off, focus highlight on or off, reading mode on or off',
      'Action navigation: next action, previous action, activate action',
      'Section navigation: go to section followed by heading text',
      'Help: list commands'
    ];

    this.speak(`Available commands: ${commands.join('. ')}`);
  }

  /**
   * Set voice mode
   */
  /**
   * Set voice mode type (off | push_to_talk | hands_free)
   */
  private setVoiceModeType(mode: 'off' | 'push_to_talk' | 'hands_free'): void {
    this.settings.voiceMode = mode;
    this.saveVoiceModeToStorage(); // A: Save to localStorage
    this.updateVoiceIndicator();
    
    // Update select element if it exists
    const voiceModeSelect = this.panel?.querySelector('#raawi-voice-mode-select') as HTMLSelectElement | null;
    if (voiceModeSelect) {
      voiceModeSelect.value = mode;
    }
    
    const narrationControls = this.panel?.querySelector('#raawi-narration-controls') as HTMLElement | null;
    const pushToTalkContainer = this.panel?.querySelector('#raawi-voice-push-to-talk') as HTMLElement | null;
    const transcriptContainer = this.panel?.querySelector('#raawi-voice-transcript-container') as HTMLElement | null;
    const commandsContainer = this.panel?.querySelector('#raawi-voice-commands') as HTMLElement | null;
    const micContainer = this.panel?.querySelector('#raawi-voice-mic-container') as HTMLElement | null;

    if (this.settings.voiceMode !== 'off') {
      if (!this.recognition) {
        this.initVoiceMode();
      }
      if (this.settings.voiceMode === 'push_to_talk') {
        // Push-to-talk: don't auto-start, wait for button click
      } else if (this.settings.voiceMode === 'hands_free' && this.micPermissionGranted) {
        this.startWakeOnlyMode();
      }
      if (pushToTalkContainer) pushToTalkContainer.style.display = 'block';
      if (transcriptContainer) transcriptContainer.style.display = 'block';
      if (commandsContainer) commandsContainer.style.display = 'block';
      if (micContainer) micContainer.style.display = 'block';
      if (narrationControls) narrationControls.style.display = 'block';
      this.speakNow(
        this.context.locale === 'ar' ? 'تم تفعيل وضع الصوت.' : 'Voice mode enabled.',
        { lang: this.context.voiceLang }
      );
    } else {
      this.stopListening();
      this.stopNarration();
      if (pushToTalkContainer) pushToTalkContainer.style.display = 'none';
      if (transcriptContainer) transcriptContainer.style.display = 'none';
      if (commandsContainer) commandsContainer.style.display = 'none';
      if (micContainer) micContainer.style.display = 'none';
      if (narrationControls) narrationControls.style.display = 'none';
      this.addTranscript('');
      this.speakNow(
        this.context.locale === 'ar' ? 'تم تعطيل وضع الصوت.' : 'Voice mode disabled.',
        { lang: this.context.voiceLang }
      );
    }
    this.applySettings();
  }

  /**
   * Set voice mode (legacy - kept for compatibility)
   */
  private setVoiceMode(enabled: boolean): void {
    // Convert boolean to new voice mode type
    this.setVoiceModeType(enabled ? 'push_to_talk' : 'off');
  }

  /**
   * Set push-to-talk mode
   */
  private setPushToTalk(enabled: boolean): void {
    this.settings.voiceMode = enabled ? 'push_to_talk' : 'off';
    this.applySettings();

    if (enabled) {
      this.stopListening();
      this.speak('Push to talk mode enabled. Hold the microphone button to speak.');
    } else {
      this.speak('Continuous listening mode enabled');
      if (this.settings.voiceMode) {
        this.startListening();
      }
    }
  }
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
  // Prevent multiple initializations
  if (!(window as any).raawiAccessibilityWidget) {
    (window as any).raawiAccessibilityWidget = new AccessibilityWidget();
  } else {
    // If already initialized, clean up any duplicate buttons/panels
    const existingButtons = document.querySelectorAll('[data-testid="raawi-launcher"]');
    const existingPanels = document.querySelectorAll('[data-testid="raawi-panel"]');
    if (existingButtons.length > 1) {
      // Remove duplicates, keep the most recently attached launcher
      for (let i = 0; i < existingButtons.length - 1; i++) {
        existingButtons[i].remove();
      }
    }
    if (existingPanels.length > 1) {
      for (let i = 0; i < existingPanels.length - 1; i++) {
        existingPanels[i].remove();
      }
    }
  }
}

export default AccessibilityWidget;
