declare class AccessibilityWidget {
    private settings;
    private context;
    private currentTab;
    private currentPreset;
    private button;
    private panel;
    private isOpen;
    private styleElement;
    private readingGuideElement;
    private readingGuideThrottle;
    private readingMaskTopOverlay;
    private readingMaskBottomOverlay;
    private readingMaskThrottle;
    private stopAnimationsStyleElement;
    private reduceMotionStyleElement;
    private bigCursorStyleElement;
    private magnifierElement;
    private magnifierCanvas;
    private magnifierThrottle;
    private hiddenImages;
    private imageCaptionElements;
    private voiceEnabled;
    private recognition;
    private synthesis;
    private isListening;
    private isWakeOnlyMode;
    private isActiveListening;
    private activeListeningTimeout;
    private micPermissionGranted;
    private transcript;
    private currentActionIndex;
    private availableActions;
    private apiUrl;
    private scanId;
    private narrationState;
    private cachedGuidance;
    private cachedIssues;
    private cachedPagePackage;
    private cachedSemanticModel;
    private semanticMode;
    private semanticCursor;
    private temporaryActions;
    private formSnapshot;
    private formAssistantActive;
    private formAssistantState;
    private currentFieldIndex;
    private formObserver;
    private routeChangeObserver;
    private pendingFileUpload;
    private najizMode;
    private loginAssistActive;
    private authFlowDetection;
    private pendingConfirmation;
    private lastSpokenValue;
    private e2eMode;
    private e2eSpokenLog;
    private e2eIntentLog;
    constructor();
    private init;
    private createWidget;
    private injectStyles;
    private createButton;
    /**
     * Get icon data URL - can be overridden by setting window.RAWI_ICON_DATA_URL
     * Icon can be loaded from URL or provided as data URL
     */
    private getIconDataUrl;
    private createPanel;
    private togglePanel;
    private openPanel;
    private closePanel;
    private getTranslations;
    /**
     * Update WidgetContext - Single source of truth (A)
     * Changing locale updates ALL: direction, voiceLang, theme
     */
    private setContext;
    /**
     * Apply WidgetContext to all widget elements (B, C, F)
     */
    private applyContext;
    /**
     * Update transcript area direction (B5)
     */
    private updateTranscriptDirection;
    private updatePanelDirection;
    /**
     * Update button position based on direction (C)
     */
    private updateButtonPosition;
    /**
     * Update voice language (B1, B3)
     */
    private updateVoiceLanguage;
    /**
     * Get best available voice for current locale (B1)
     */
    private getBestVoice;
    private setupLanguageToggle;
    private updateLanguage;
    private updateLanguageButtons;
    /**
     * Update all feature texts when language changes
     */
    private updateFeatureTexts;
    private updatePanelTexts;
    private setupTabNavigation;
    private switchTab;
    private setupQuickActions;
    private setupPresets;
    private applyPreset;
    private updateUIControls;
    private updateVoiceIndicator;
    private clearPreset;
    private adjustTextSize;
    private adjustLineSpacing;
    private setContrastMode;
    private setStopAnimations;
    private setReduceMotion;
    private injectReduceMotionStyles;
    private removeReduceMotionStyles;
    private setBigCursor;
    private injectBigCursorStyles;
    private removeBigCursorStyles;
    private setMagnifier;
    private setMagnifierZoom;
    private createMagnifier;
    private handleMagnifierMove;
    private handleMagnifierLeave;
    private updateMagnifierPosition;
    private updateMagnifierContent;
    private captureMagnifierArea;
    private fallbackMagnifierDisplay;
    private destroyMagnifier;
    private setHideImages;
    private setImageCaptions;
    private applyHideImages;
    private restoreImages;
    private applyImageCaptions;
    private removeImageCaptions;
    private getImageCaptionText;
    private injectStopAnimationsStyles;
    private removeStopAnimationsStyles;
    private pauseAnimations;
    private resumeAnimations;
    private setFocusHighlight;
    private setReadingMode;
    private setReadingGuide;
    private createReadingGuide;
    private destroyReadingGuide;
    private setupReadingGuideListeners;
    private removeReadingGuideListeners;
    private updateReadingGuidePosition;
    private setReadingMask;
    private setReadingMaskWindowHeight;
    private createReadingMask;
    private destroyReadingMask;
    private setupReadingMaskListeners;
    private removeReadingMaskListeners;
    private updateReadingMaskPosition;
    private updateTextSizeDisplay;
    private updateLineSpacingDisplay;
    private applySettings;
    private reset;
    /**
     * Fetch page package from API (Third Layer - single fetch)
     */
    private fetchPagePackageAsync;
    /**
     * Fetch guidance from API asynchronously (non-blocking) - fallback method
     */
    private fetchGuidanceAsync;
    /**
     * Check if scan is stale and show warning if needed
     */
    private checkStaleScan;
    /**
     * Compute current page fingerprint from live DOM
     */
    private computeCurrentPageFingerprint;
    /**
     * Simple hash function for browser
     */
    private simpleHash;
    /**
     * Compare two fingerprints
     */
    private compareFingerprints;
    /**
     * Show scan freshness information (subtle, informational)
     */
    private showScanFreshness;
    /**
     * Show non-blocking stale scan warning
     */
    private showStaleScanWarning;
    /**
     * Fetch issues from API
     */
    private fetchIssuesAsync;
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
    private buildReadingQueue;
    private buildSemanticReadingQueue;
    private getSemanticSummary;
    private getSemanticSections;
    private getSemanticForms;
    private getSemanticActions;
    private findSemanticElement;
    /**
     * Check if element is visible
     */
    private isElementVisible;
    /**
     * Check if element is hidden via aria-hidden
     */
    private isElementHidden;
    /**
     * Start full page narration
     */
    private startFullNarration;
    /**
     * Start summary narration
     */
    private startSummaryNarration;
    /**
     * Start detailed summary narration
     */
    private startDetailedSummaryNarration;
    /**
     * Speak next segment in queue
     */
    private speakNextSegment;
    /**
     * Translate text using API (if enabled)
     */
    private translateText;
    /**
     * Speak text in chunks (150-220 chars) with natural pauses
     */
    private speakChunked;
    /**
     * Pause narration
     */
    private pauseNarration;
    /**
     * Resume narration
     */
    private resumeNarration;
    /**
     * Stop narration
     */
    private stopNarration;
    /**
     * Skip to next segment
     */
    private skipToNextSegment;
    /**
     * Repeat current segment
     */
    private repeatCurrentSegment;
    /**
     * Update narration status display
     */
    private updateNarrationStatus;
    /**
     * Initialize voice mode (Speech Recognition and Synthesis)
     */
    private initVoiceMode;
    /**
     * Detect wake phrase (B)
     */
    private detectWakePhrase;
    /**
     * Handle wake phrase recognition (B, D, E)
     */
    private handleWakePhrase;
    /**
     * Start wake-only mode (B)
     */
    private startWakeOnlyMode;
    /**
     * Start active listening mode (B)
     */
    private startActiveListening;
    /**
     * Stop active listening and return to wake-only mode (B)
     */
    private stopActiveListening;
    /**
     * Start listening for voice commands
     */
    private startListening;
    /**
     * Stop listening for voice commands
     */
    private stopListening;
    /**
     * Toggle listening state
     */
    private toggleListening;
    /**
     * Request microphone permission (C)
     */
    private requestMicPermission;
    /**
     * Show permission prompt (C)
     */
    private showPermissionPrompt;
    /**
     * Guided onboarding after wake (D)
     */
    private speakGuidedOnboarding;
    /**
     * Suggest Blind preset (E)
     */
    private suggestBlindPreset;
    /**
     * Load voice mode from localStorage (A)
     */
    private loadVoiceModeFromStorage;
    /**
     * Save voice mode to localStorage (A)
     */
    private saveVoiceModeToStorage;
    /**
     * Load widget mode from localStorage (A)
     */
    private loadWidgetModeFromStorage;
    /**
     * Save widget mode to localStorage (A)
     */
    private saveWidgetModeToStorage;
    /**
     * Set widget mode type (assist | semantic)
     */
    private setWidgetModeType;
    private loadSemanticModelIfNeeded;
    private extractSemanticModel;
    /**
     * Update microphone button appearance
     */
    private updateMicButton;
    /**
     * Add text to transcript display (B5)
     */
    private addTranscript;
    /**
     * Process voice command
     */
    private processVoiceCommand;
    private handleSemanticActionIntent;
    private findBestActionIndexByPhrase;
    /**
     * Speak text using Speech Synthesis
     * If narration is active, uses narration state settings; otherwise uses defaults
     */
    private speak;
    /**
     * Read page summary (legacy method - now uses narration engine)
     */
    private readPageSummary;
    /**
     * Setup E2E mode (D)
     */
    private setupE2EMode;
    private logVoiceIntent;
    private sendFeedbackSignal;
    /**
     * Speak a one-off message without rebuilding the whole queue
     */
    private speakNow;
    /**
     * Find candidate image element for description
     * Priority:
     * 1. Focused element if it's an image or inside a figure
     * 2. Nearest visible image in viewport (topmost)
     */
    private findCandidateImageElement;
    /**
     * Get image description from assistive map
     */
    private getImageDescriptionFromAssistiveMap;
    /**
     * Check if element matches a selector
     */
    private matchesSelector;
    /**
     * What can I do here feature
     */
    private whatCanIDoHere;
    /**
     * Get context title for an action (card/section title)
     * Priority: assistiveMap.actionIntents.contextTitle > guidance.description > DOM traversal
     */
    private getActionContextTitle;
    /**
     * Get action intent from assistive map
     */
    private getActionIntent;
    /**
     * Go to action (focus and scroll to element) - only when explicitly requested
     */
    private goToAction;
    /**
     * Explain context of last mentioned action ("why" command)
     */
    private explainActionContext;
    /**
     * Describe focused element feature
     */
    private describeFocusedElement;
    /**
     * Describe image feature
     */
    private describeImage;
    /**
     * Get page description
     */
    private getPageDescription;
    /**
     * Read landmarks
     */
    private readLandmarks;
    /**
     * Collect interactive actions from page
     */
    private collectActions;
    /**
     * Get accessible label for element (with assistive map override)
     */
    private getAccessibleLabel;
    /**
     * Get action description
     */
    private getActionDescription;
    /**
     * Get label override from assistive map (Third Layer)
     */
    private getLabelOverride;
    /**
     * Get image description from assistive map (Third Layer)
     */
    private getImageDescription;
    /**
     * Generate stable selector for element (matches scanner logic)
     */
    private generateSelector;
    /**
     * Read available actions
     */
    private readActions;
    /**
     * Navigate to next action
     */
    private navigateToNextAction;
    /**
     * Navigate to previous action
     */
    private navigateToPreviousAction;
    /**
     * Highlight current action
     */
    private highlightCurrentAction;
    /**
     * Read current action
     */
    private readCurrentAction;
    /**
     * Activate current action
     */
    private activateCurrentAction;
    /**
     * Read issues (accessibility problems)
     */
    private readIssues;
    /**
     * Detect forms on page load and route changes (A2)
     */
    private detectForms;
    /**
     * Setup observer for route changes (SPA navigation) (A2)
     */
    private setupRouteChangeObserver;
    /**
     * Build Form Snapshot
     * Priority: assistiveMap.forms (scan-generated) > guidance.formSteps > DOM detection
     */
    private buildFormSnapshot;
    /**
     * Build snapshot from guidance.formSteps
     */
    private buildFormSnapshotFromGuidance;
    /**
     * Build snapshot from assistiveMap.forms (scan-generated Form Assist Plan)
     * This is the primary source of truth when available
     */
    private buildFormSnapshotFromAssistiveMap;
    /**
     * Find field by fallback matching (when selector fails due to DOM drift)
     */
    private findFieldByFallback;
    /**
     * Find file input by label
     */
    private findFileInputByLabel;
    /**
     * Find button by label and type
     */
    private findButtonByLabel;
    /**
     * Get bilingual label (prefer current language, fallback to other)
     */
    private getBilingualLabel;
    /**
     * Build snapshot from HTML <form> element
     */
    private buildFormSnapshotFromForm;
    /**
     * Build snapshot from form-like container (>=3 inputs)
     */
    private buildFormSnapshotFromContainer;
    /**
     * Find form-like container (>=3 inputs within a container)
     */
    private findFormLikeContainer;
    /**
     * Get field label (uses assistiveMap first, then DOM)
     */
    private getFieldLabel;
    /**
     * Get accessible name from DOM
     */
    private getAccessibleName;
    /**
     * Get field value
     */
    private getFieldValue;
    /**
     * Get field context (nearby heading or container label)
     */
    private getFieldContext;
    /**
     * Find input by label text
     */
    private findInputByLabel;
    /**
     * Find nearby submit buttons
     */
    private findNearbySubmitButtons;
    /**
     * Update Login Assist UI visibility (B)
     */
    private updateLoginAssistUI;
    /**
     * Update Form Assistant UI visibility (A1, A2)
     * Always show card, but enable/disable based on form detection
     */
    private updateFormAssistantUI;
    /**
     * Arabic (Saudi) Voice Scripts - B1: Start prompt
     */
    private getArabicStartScript;
    /**
     * Arabic (Saudi) Voice Scripts - B2: Field prompt
     */
    private getArabicFieldPrompt;
    /**
     * Arabic (Saudi) Voice Scripts - B3: Normal confirmation
     */
    private getArabicNormalConfirmation;
    /**
     * Arabic (Saudi) Voice Scripts - B4: Sensitive double confirmation
     */
    private getArabicDoubleConfirmationFirst;
    private getArabicDoubleConfirmationSecond;
    private getArabicDoubleConfirmationSuccess;
    /**
     * Arabic (Saudi) Voice Scripts - B5: Upload
     */
    private getArabicUploadPrompt;
    private getArabicUploadSelected;
    /**
     * Arabic (Saudi) Voice Scripts - B6: Review + submit
     */
    private getArabicReviewPrompt;
    private getArabicSubmitConfirm;
    /**
     * Detect if field requires double confirmation (C1, C2)
     */
    private requiresDoubleConfirmation;
    /**
     * Detect if field is password (C3)
     */
    private isPasswordField;
    /**
     * Detect authentication flow (B: Detect SSO / Nafath / login pages)
     */
    private detectAuthFlow;
    /**
     * Detect Najiz mode (legacy - uses detectAuthFlow)
     */
    private detectNajizMode;
    /**
     * Get Arabic prompt for Najiz mode detection (D1)
     */
    private getArabicNajizDetectionPrompt;
    /**
     * Start Login Assist (C, D, F)
     */
    private startLoginAssist;
    /**
     * Stop Login Assist (F)
     */
    private stopLoginAssist;
    /**
     * Guide login steps (D)
     */
    private guideLoginSteps;
    /**
     * Find login buttons (D)
     */
    private findLoginButtons;
    /**
     * Detect Nafath approval text (D)
     */
    private detectNafathApprovalText;
    /**
     * Detect OTP inputs (D)
     */
    private detectOTPInputs;
    /**
     * Najiz login assist mode - navigation only (legacy, kept for compatibility)
     */
    private handleNajizLoginAssist;
    /**
     * Monitor for Nafath verification step (D2)
     */
    private monitorNafathVerification;
    /**
     * Monitor for successful login and suggest Form Assistant (D, E)
     */
    private monitorForSuccessfulLogin;
    /**
     * Detect successful login (D)
     */
    private detectSuccessfulLogin;
    /**
     * Start Form Assistant
     */
    private startFormAssistant;
    /**
     * Stop Form Assistant
     */
    private stopFormAssistant;
    /**
     * Speak Form Assistant onboarding (A3)
     */
    private speakFormAssistantOnboarding;
    /**
     * Speak form summary (legacy - kept for compatibility)
     */
    private speakFormSummary;
    /**
     * Move to next required field
     */
    private moveToNextRequiredField;
    /**
     * Focus field and ask for value
     */
    private focusField;
    /**
     * Update Form Assistant status display
     */
    private updateFormAssistantStatus;
    /**
     * Handle form field value entry
     */
    private handleFieldValueEntry;
    /**
     * Check field validation errors (A7)
     */
    private checkFieldValidation;
    /**
     * Get field error message
     */
    private getFieldErrorMessage;
    /**
     * Find error message element near field
     */
    private findFieldErrorMessage;
    /**
     * Fill field value (helper)
     */
    private fillFieldValue;
    /**
     * Handle file upload
     */
    private handleNextUpload;
    /**
     * Trigger file picker (must be called from user gesture)
     */
    private triggerFilePicker;
    /**
     * Speak form complete message
     */
    private speakFormComplete;
    /**
     * Confirm and submit form
     */
    private confirmAndSubmitForm;
    /**
     * Execute submit after confirmation
     */
    private executeSubmit;
    /**
     * Process form assistant voice commands
     */
    private processFormAssistantCommand;
    /**
     * Speak available commands
     */
    private speakCommands;
    /**
     * Set voice mode
     */
    /**
     * Set voice mode type (off | push_to_talk | hands_free)
     */
    private setVoiceModeType;
    /**
     * Set voice mode (legacy - kept for compatibility)
     */
    private setVoiceMode;
    /**
     * Set push-to-talk mode
     */
    private setPushToTalk;
    /**
     * Setup keyboard navigation for semantic cursor in semantic mode
     */
    private setupSemanticKeyboardNavigation;
    /**
     * Initialize or update semantic cursor from current reading queue
     */
    private initializeSemanticCursor;
    /**
     * Navigate semantic cursor down (next segment)
     */
    private navigateSemanticCursorDown;
    /**
     * Navigate semantic cursor up (previous segment)
     */
    private navigateSemanticCursorUp;
    /**
     * Activate current semantic block (if it's an action or form)
     */
    private activateSemanticCursorAction;
    private findSemanticActionForElement;
    private deriveSelectorForElement;
    /**
     * Read current semantic block
     */
    private readCurrentSemanticBlock;
    /**
     * Go to first semantic segment
     */
    private goToSemanticStart;
    /**
     * Go to last semantic segment
     */
    private goToSemanticEnd;
}
export default AccessibilityWidget;
//# sourceMappingURL=widget.d.ts.map