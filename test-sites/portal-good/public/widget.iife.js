this.RaawiXAccessibility=function(){"use strict";class P{constructor(){this.settings={textSize:1,lineSpacing:1,contrastMode:!1,focusHighlight:!1,readingMode:!1,readingGuide:!1,readingMask:!1,readingMaskWindowHeight:"medium",hideImages:!1,imageCaptions:!1,stopAnimations:!1,reduceMotion:!1,bigCursor:"off",magnifier:!1,magnifierZoom:2,voiceMode:"push_to_talk",translateLanguage:"off"},this.context={locale:"en",direction:"ltr",voiceLang:"en-US",theme:"green"},this.currentTab="assist",this.currentPreset="none",this.button=null,this.panel=null,this.isOpen=!1,this.styleElement=null,this.readingGuideElement=null,this.readingGuideThrottle=null,this.readingMaskTopOverlay=null,this.readingMaskBottomOverlay=null,this.readingMaskThrottle=null,this.stopAnimationsStyleElement=null,this.reduceMotionStyleElement=null,this.bigCursorStyleElement=null,this.magnifierElement=null,this.magnifierCanvas=null,this.magnifierThrottle=null,this.hiddenImages=new Map,this.imageCaptionElements=new Map,this.voiceEnabled=!1,this.recognition=null,this.synthesis=null,this.isListening=!1,this.isWakeOnlyMode=!1,this.isActiveListening=!1,this.activeListeningTimeout=null,this.micPermissionGranted=!1,this.transcript="",this.currentActionIndex=-1,this.availableActions=[],this.apiUrl="",this.scanId="",this.narrationState={queue:null,isSpeaking:!1,isPaused:!1,isStopped:!1,currentUtterance:null,rate:1,pitch:1,volume:1},this.cachedGuidance=null,this.cachedIssues=null,this.cachedPagePackage=null,this.temporaryActions=[],this.formSnapshot=null,this.formAssistantActive=!1,this.formAssistantState="idle",this.currentFieldIndex=-1,this.formObserver=null,this.routeChangeObserver=null,this.pendingFileUpload=null,this.najizMode=!1,this.loginAssistActive=!1,this.authFlowDetection=null,this.pendingConfirmation=null,this.lastSpokenValue="",this.e2eMode=!1,this.e2eSpokenLog=[],this.handleMagnifierMove=e=>{!this.magnifierElement||!this.settings.magnifier||(this.magnifierThrottle!==null&&clearTimeout(this.magnifierThrottle),this.magnifierThrottle=window.setTimeout(()=>{this.updateMagnifierPosition(e.clientX,e.clientY),this.updateMagnifierContent()},16))},this.handleMagnifierLeave=()=>{this.magnifierElement&&(this.magnifierElement.style.display="none")},this.voiceEnabled=window.VOICE_ENABLED===!0,this.init()}init(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.createWidget()):this.createWidget()}createWidget(){const e=new URLSearchParams(window.location.search);this.e2eMode=e.get("e2e")==="1",this.e2eMode&&(window.__RAAWI_E2E__=!0,this.setupE2EMode()),this.voiceEnabled||(this.voiceEnabled=window.VOICE_ENABLED===!0),this.apiUrl=window.RAWI_API_URL||"",this.scanId=window.RAWI_SCAN_ID||"latest",this.injectStyles(),this.createButton(),this.createPanel(),this.loadVoiceModeFromStorage(),this.voiceEnabled&&(this.initVoiceMode(),this.apiUrl&&this.fetchPagePackageAsync(),this.settings.voiceMode==="hands_free"&&this.micPermissionGranted&&setTimeout(()=>{this.startWakeOnlyMode()},1e3)),this.detectForms(),this.authFlowDetection=this.detectAuthFlow(),this.updateLoginAssistUI(),this.setupRouteChangeObserver(),this.applySettings(),window.addEventListener("beforeunload",()=>{this.destroyReadingGuide(),this.destroyReadingMask()})}injectStyles(){this.styleElement=document.createElement("style"),this.styleElement.id="raawi-accessibility-styles";const e=document.createElement("link");e.rel="stylesheet",e.href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap",document.head.appendChild(e);const t=document.createElement("link");t.rel="stylesheet",t.href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",document.head.appendChild(t),this.styleElement.textContent=`
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
    `,document.head.appendChild(this.styleElement)}createButton(){this.button=document.createElement("button"),this.button.className="raawi-accessibility-button",this.button.setAttribute("data-direction",this.context.direction),this.button.setAttribute("data-testid","raawi-launcher"),this.button.setAttribute("aria-label","Open accessibility options"),this.button.setAttribute("aria-expanded","false"),this.button.setAttribute("aria-controls","raawi-accessibility-panel");const e=document.createElement("img"),t=this.getIconDataUrl();t?(e.src=t,e.alt="",e.className="raawi-icon",e.setAttribute("aria-hidden","true"),e.style.pointerEvents="none",e.onerror=()=>{e.style.display="none",this.button&&(this.button.textContent="A",this.button.style.fontSize="24px",this.button.style.fontWeight="bold")},this.button.appendChild(e)):(this.button.textContent="A",this.button.style.fontSize="24px",this.button.style.fontWeight="bold"),this.button.addEventListener("click",()=>this.togglePanel()),this.button.addEventListener("keydown",i=>{(i.key==="Enter"||i.key===" ")&&(i.preventDefault(),this.togglePanel())}),document.body.appendChild(this.button)}getIconDataUrl(){return window.RAWI_ICON_DATA_URL?window.RAWI_ICON_DATA_URL:this.apiUrl?`${this.apiUrl.replace(/\/$/,"")}/api/widget/icon`:["/RaawixIcon.png","/widget/RaawixIcon.png","/assets/RaawixIcon.png","./RaawixIcon.png"][0]}createPanel(){this.panel=document.createElement("div"),this.panel.id="raawi-accessibility-panel",this.panel.className="raawi-accessibility-panel",this.panel.setAttribute("data-testid","raawi-panel"),this.panel.setAttribute("role","dialog"),this.panel.setAttribute("aria-labelledby","raawi-accessibility-title"),this.panel.setAttribute("aria-modal","false"),this.updatePanelDirection();const e=this.getTranslations();this.panel.innerHTML=`
      <!-- Top Bar -->
      <div class="raawi-panel-topbar">
        <div class="raawi-topbar-left">
          <div class="raawi-lang-toggle">
            <button id="raawi-lang-en" class="active" data-testid="raawi-lang-switch" aria-label="English">EN</button>
            <button id="raawi-lang-ar" data-testid="raawi-lang-switch" aria-label="Arabic">العربية</button>
          </div>
        </div>
        <div class="raawi-topbar-right">
          ${this.voiceEnabled?`
          <div class="raawi-voice-controls">
            <div class="raawi-voice-indicator" id="raawi-voice-indicator" aria-label="Voice status"></div>
            <button class="raawi-quick-action-btn" id="raawi-quick-voice-toggle" aria-label="${e.voiceMode}">🎤</button>
          </div>
          `:""}
          <div class="raawi-quick-actions">
            <button class="raawi-quick-action-btn" id="raawi-quick-reset" aria-label="${e.resetAll}">↻</button>
            <button class="raawi-quick-action-btn" id="raawi-quick-close" data-testid="raawi-close" aria-label="${e.close}">×</button>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="raawi-panel-tabs" role="tablist">
        <button class="raawi-tab active" data-tab="assist" data-testid="raawi-tab-assist" role="tab" aria-selected="true" aria-controls="raawi-tab-assist">${e.assist}</button>
        <button class="raawi-tab" data-tab="vision" data-testid="raawi-tab-vision" role="tab" aria-selected="false" aria-controls="raawi-tab-vision">${e.vision}</button>
        <button class="raawi-tab" data-tab="reading" data-testid="raawi-tab-reading" role="tab" aria-selected="false" aria-controls="raawi-tab-reading">${e.reading}</button>
        <button class="raawi-tab" data-tab="tools" data-testid="raawi-tab-tools" role="tab" aria-selected="false" aria-controls="raawi-tab-tools">${e.tools}</button>
      </div>

      <!-- Tab Content: Assist -->
      <div id="raawi-tab-assist" class="raawi-tab-content active" role="tabpanel">
        <h2 id="raawi-accessibility-title">${e.accessibilityOptions}</h2>
        
        <!-- Presets Section -->
        <div class="raawi-accessibility-control">
          <span class="raawi-accessibility-label">${e.presets}</span>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
            <button class="raawi-accessibility-button-small raawi-preset-btn" data-preset="blind" data-testid="raawi-preset-blind" style="width: 100%; text-align: start; justify-content: flex-start;">
              ${e.presetBlind}
            </button>
            <button class="raawi-accessibility-button-small raawi-preset-btn" data-preset="low-vision" data-testid="raawi-preset-lowvision" style="width: 100%; text-align: start; justify-content: flex-start;">
              ${e.presetLowVision}
            </button>
            <button class="raawi-accessibility-button-small raawi-preset-btn" data-preset="dyslexia" data-testid="raawi-preset-dyslexia" style="width: 100%; text-align: start; justify-content: flex-start;">
              ${e.presetDyslexia}
            </button>
            <button class="raawi-accessibility-button-small raawi-preset-btn" data-preset="none" style="width: 100%; text-align: start; justify-content: flex-start; background: #95a5a6; border-color: #95a5a6;">
              ${e.presetNone}
            </button>
          </div>
        </div>

        <div class="raawi-accessibility-control">
          <span class="raawi-accessibility-label">${e.textSize}</span>
          <div class="raawi-accessibility-control-group">
            <button class="raawi-accessibility-button-small" id="raawi-text-decrease" aria-label="${e.decreaseTextSize}">-</button>
            <span class="raawi-accessibility-value" id="raawi-text-size-value" aria-live="polite">100%</span>
            <button class="raawi-accessibility-button-small" id="raawi-text-increase" aria-label="${e.increaseTextSize}">+</button>
          </div>
        </div>

        <div class="raawi-accessibility-control">
          <span class="raawi-accessibility-label">${e.lineSpacing}</span>
          <div class="raawi-accessibility-control-group">
            <button class="raawi-accessibility-button-small" id="raawi-line-decrease" aria-label="${e.decreaseLineSpacing}">-</button>
            <span class="raawi-accessibility-value" id="raawi-line-spacing-value" aria-live="polite">100%</span>
            <button class="raawi-accessibility-button-small" id="raawi-line-increase" aria-label="${e.increaseLineSpacing}">+</button>
          </div>
        </div>

        <div class="raawi-accessibility-control">
          <label for="raawi-focus-toggle">${e.focusHighlight}</label>
          <label class="raawi-accessibility-toggle">
            <input type="checkbox" id="raawi-focus-toggle" aria-label="${e.toggleFocusHighlight}">
            <span class="raawi-accessibility-slider"></span>
          </label>
        </div>

        <div class="raawi-accessibility-control">
          <button class="raawi-accessibility-button-small" id="raawi-describe-image" data-testid="raawi-tool-describe-image" style="width: 100%;">${e.describeImage}</button>
        </div>

        <div class="raawi-accessibility-control">
          <button class="raawi-accessibility-button-small" id="raawi-describe-focused" data-testid="raawi-tool-describe-focused" style="width: 100%;">${e.describeFocusedElement}</button>
        </div>

        <div class="raawi-accessibility-control">
          <button class="raawi-accessibility-button-small" id="raawi-what-can-i-do" data-testid="raawi-tool-what-can-i-do" style="width: 100%;">${e.whatCanIDoHere}</button>
        </div>

        <!-- Login Assist (Najiz) Tool Card (B1) -->
        <div class="raawi-tool-card" id="raawi-login-assist-section" style="display: none;">
          <div class="raawi-tool-card-header">
            <span class="raawi-tool-icon" aria-hidden="true">🔐</span>
            <div class="raawi-tool-title-group">
              <span class="raawi-tool-label">${e.loginAssist}</span>
              <span class="raawi-tool-subtitle">${e.loginAssistSubtitle}</span>
            </div>
          </div>
          <div class="raawi-tool-card-content">
            <button class="raawi-accessibility-button-small" id="raawi-login-assist-start" aria-label="${e.startLoginAssist}">
              ${e.startLoginAssist}
            </button>
            <button class="raawi-accessibility-button-small" id="raawi-login-assist-stop" style="display: none;" aria-label="${e.stopLoginAssist}">
              ${e.stopLoginAssist}
            </button>
            <div id="raawi-login-assist-status" class="raawi-tool-status" aria-live="polite"></div>
          </div>
        </div>

        <!-- Auth Flow Banner (B2) -->
        <div id="raawi-auth-banner" class="raawi-auth-banner" style="display: none;" role="alert">
          <span class="raawi-auth-banner-icon">🔐</span>
          <span class="raawi-auth-banner-text">${e.authBannerMessage}</span>
        </div>

        <!-- Form Assistant Tool Card (A1) -->
        <div class="raawi-tool-card" id="raawi-form-assistant-section" data-testid="raawi-tool-form-assistant">
          <div class="raawi-tool-card-header">
            <span class="raawi-tool-icon" aria-hidden="true">📋</span>
            <div class="raawi-tool-title-group">
              <span class="raawi-tool-label">${e.formAssistant}</span>
              <span class="raawi-tool-subtitle">${e.formAssistantSubtitle}</span>
            </div>
            <span id="raawi-form-assistant-active-badge" class="raawi-active-badge" style="display: none;">${e.formAssistantActive}</span>
          </div>
          <div class="raawi-tool-card-content">
            <div id="raawi-form-assistant-no-form-message" class="raawi-tool-message" style="display: none;">
              ${e.formAssistantNoFormMessage}
            </div>
            <button class="raawi-accessibility-button-small" id="raawi-form-assistant-start" disabled aria-label="${e.startFormAssistant}">
              ${e.startFormAssistant}
            </button>
            <button class="raawi-accessibility-button-small" id="raawi-form-assistant-stop" style="display: none;" aria-label="${e.stopFormAssistant}">
              ${e.stopFormAssistant}
            </button>
            <button class="raawi-accessibility-button-small" id="raawi-form-assistant-upload" style="display: none;" aria-label="${e.formAssistantChooseFileButton}">
              ${e.formAssistantChooseFileButton}
            </button>
            <div id="raawi-form-assistant-status" class="raawi-tool-status" aria-live="polite"></div>
          </div>
        </div>

        <div class="raawi-accessibility-control">
          <button class="raawi-accessibility-button-small" id="raawi-reset" style="width: 100%;">${e.resetAll}</button>
        </div>
      </div>

      <!-- Tab Content: Vision -->
      <div id="raawi-tab-vision" class="raawi-tab-content" role="tabpanel">
        <h2>${e.vision}</h2>
        
        <div class="raawi-accessibility-control">
          <label for="raawi-contrast-toggle">${e.highContrastMode}</label>
          <label class="raawi-accessibility-toggle">
            <input type="checkbox" id="raawi-contrast-toggle" aria-label="${e.toggleHighContrast}">
            <span class="raawi-accessibility-slider"></span>
          </label>
        </div>

        <div class="raawi-accessibility-control">
          <label for="raawi-stop-animations-toggle">${e.stopAnimations}</label>
          <label class="raawi-accessibility-toggle">
            <input type="checkbox" id="raawi-stop-animations-toggle" data-testid="raawi-tool-stop-animations" aria-label="${e.toggleStopAnimations}">
            <span class="raawi-accessibility-slider"></span>
          </label>
        </div>

        <div class="raawi-accessibility-control">
          <label for="raawi-reduce-motion-toggle">${e.reduceMotion}</label>
          <label class="raawi-accessibility-toggle">
            <input type="checkbox" id="raawi-reduce-motion-toggle" aria-label="${e.toggleReduceMotion}">
            <span class="raawi-accessibility-slider"></span>
          </label>
        </div>

        <div class="raawi-accessibility-control">
          <label for="raawi-big-cursor-select">${e.bigCursor}</label>
          <select id="raawi-big-cursor-select" class="raawi-accessibility-select" aria-label="${e.selectBigCursor}">
            <option value="off">${e.off}</option>
            <option value="dark">${e.bigDarkCursor}</option>
            <option value="light">${e.bigLightCursor}</option>
          </select>
        </div>

        <div class="raawi-accessibility-control">
          <label for="raawi-magnifier-toggle">${e.magnifier}</label>
          <label class="raawi-accessibility-toggle">
            <input type="checkbox" id="raawi-magnifier-toggle" aria-label="${e.toggleMagnifier}">
            <span class="raawi-accessibility-slider"></span>
          </label>
        </div>

        <div class="raawi-accessibility-control" id="raawi-magnifier-zoom-control" style="display: none;">
          <label for="raawi-magnifier-zoom-slider">${e.magnifierZoom}: <span id="raawi-magnifier-zoom-value" aria-live="polite">${Math.round(this.settings.magnifierZoom*100)}%</span></label>
          <input type="range" id="raawi-magnifier-zoom-slider" min="1.5" max="5.0" step="0.1" value="${this.settings.magnifierZoom}" aria-label="${e.adjustMagnifierZoom}">
        </div>
      </div>

      <!-- Tab Content: Reading -->
      <div id="raawi-tab-reading" class="raawi-tab-content" role="tabpanel">
        <h2>${e.reading}</h2>
        
        <div class="raawi-accessibility-control">
          <label for="raawi-reading-toggle">${e.readingMode}</label>
          <label class="raawi-accessibility-toggle">
            <input type="checkbox" id="raawi-reading-toggle" aria-label="${e.toggleReadingMode}">
            <span class="raawi-accessibility-slider"></span>
          </label>
        </div>

        <div class="raawi-accessibility-control">
          <label for="raawi-reading-guide-toggle">${e.readingGuide}</label>
          <label class="raawi-accessibility-toggle">
            <input type="checkbox" id="raawi-reading-guide-toggle" data-testid="raawi-tool-reading-guide" aria-label="${e.toggleReadingGuide}">
            <span class="raawi-accessibility-slider"></span>
          </label>
        </div>

        <div class="raawi-accessibility-control">
          <label for="raawi-reading-mask-toggle">${e.readingMask}</label>
          <label class="raawi-accessibility-toggle">
            <input type="checkbox" id="raawi-reading-mask-toggle" data-testid="raawi-tool-reading-mask" aria-label="${e.toggleReadingMask}">
            <span class="raawi-accessibility-slider"></span>
          </label>
        </div>

        <div class="raawi-accessibility-control" id="raawi-reading-mask-height-control" style="display: none;">
          <span class="raawi-accessibility-label">${e.maskWindowHeight}</span>
          <div class="raawi-accessibility-control-group" style="margin-top: 8px;">
            <button class="raawi-accessibility-button-small raawi-mask-height-btn ${this.settings.readingMaskWindowHeight==="small"?"active":""}" data-height="small" style="flex: 1;">${e.small}</button>
            <button class="raawi-accessibility-button-small raawi-mask-height-btn ${this.settings.readingMaskWindowHeight==="medium"?"active":""}" data-height="medium" style="flex: 1;">${e.medium}</button>
            <button class="raawi-accessibility-button-small raawi-mask-height-btn ${this.settings.readingMaskWindowHeight==="large"?"active":""}" data-height="large" style="flex: 1;">${e.large}</button>
          </div>
        </div>

        <div class="raawi-accessibility-control">
          <label for="raawi-hide-images-toggle">${e.hideImages}</label>
          <label class="raawi-accessibility-toggle">
            <input type="checkbox" id="raawi-hide-images-toggle" aria-label="${e.toggleHideImages}">
            <span class="raawi-accessibility-slider"></span>
          </label>
        </div>

        <div class="raawi-accessibility-control">
          <label for="raawi-image-captions-toggle">${e.imageCaptions}</label>
          <label class="raawi-accessibility-toggle">
            <input type="checkbox" id="raawi-image-captions-toggle" aria-label="${e.toggleImageCaptions}">
            <span class="raawi-accessibility-slider"></span>
          </label>
        </div>
        
        ${this.voiceEnabled?`
        <div class="raawi-accessibility-control" id="raawi-narration-controls">
          <label>${e.pageReading}</label>
          <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px;">
            <button class="raawi-accessibility-button-small" id="raawi-read-page" style="flex: 1; min-width: 80px;">${e.readPage}</button>
            <button class="raawi-accessibility-button-small" id="raawi-read-summary" style="flex: 1; min-width: 80px;">${e.summary}</button>
          </div>
          <div class="raawi-accessibility-control" style="margin-top: 10px;">
            <label for="raawi-translate-language">${e.translateReading}</label>
            <select id="raawi-translate-language" class="raawi-accessibility-select" aria-label="${e.selectTranslationLanguage}">
              <option value="off">${e.off}</option>
              <option value="ar">${e.arabic}</option>
              <option value="en">${e.english}</option>
            </select>
          </div>
          <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px;">
            <button class="raawi-accessibility-button-small" id="raawi-narration-pause" style="flex: 1; min-width: 60px;">${e.pause}</button>
            <button class="raawi-accessibility-button-small" id="raawi-narration-resume" style="flex: 1; min-width: 60px;">${e.resume}</button>
            <button class="raawi-accessibility-button-small" id="raawi-narration-stop" style="flex: 1; min-width: 60px;">${e.stop}</button>
          </div>
          <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px;">
            <button class="raawi-accessibility-button-small" id="raawi-narration-next" style="flex: 1; min-width: 60px;">${e.next}</button>
            <button class="raawi-accessibility-button-small" id="raawi-narration-repeat" style="flex: 1; min-width: 60px;">${e.repeat}</button>
          </div>
          <div style="margin-top: 5px; font-size: 0.85em; color: #666;" id="raawi-narration-status" aria-live="polite"></div>
        </div>
        `:""}
      </div>

      <!-- Tab Content: Tools -->
      <div id="raawi-tab-tools" class="raawi-tab-content" role="tabpanel">
        <h2>${e.tools}</h2>
        
        ${this.voiceEnabled?`
        <div class="raawi-accessibility-control" id="raawi-voice-control">
          <label for="raawi-voice-mode-select">${e.voiceMode}</label>
          <select id="raawi-voice-mode-select" class="raawi-accessibility-select" aria-label="${e.selectVoiceMode}">
            <option value="off">${e.voiceModeOff}</option>
            <option value="push_to_talk">${e.voiceModePushToTalk}</option>
            <option value="hands_free">${e.voiceModeHandsFree}</option>
          </select>
          <div style="font-size: 0.85em; color: #666; margin-top: 4px;">
            ${e.voiceModeDescription}
          </div>
        </div>
        
        <div class="raawi-accessibility-control" id="raawi-voice-transcript-container" style="display: none;">
          <label>${e.transcript}</label>
          <div class="raawi-voice-transcript" id="raawi-voice-transcript" role="log" aria-live="polite" aria-atomic="false"></div>
        </div>
        
        <div class="raawi-accessibility-control" id="raawi-voice-commands" style="display: none;">
          <button class="raawi-accessibility-button-small" id="raawi-voice-list-commands" style="width: 100%;">${e.listCommands}</button>
        </div>
        
        <div class="raawi-accessibility-control" id="raawi-voice-mic-container" style="display: none; text-align: center;">
          <button class="raawi-voice-mic-button" id="raawi-voice-mic-button" aria-label="${e.microphoneButton}">
            🎤
          </button>
        </div>
        `:""}
      </div>
    `,document.body.appendChild(this.panel),console.log("[RaawiX Widget] Panel appended to DOM, attaching event listeners..."),this.setupLanguageToggle(),this.setupTabNavigation(),this.setupQuickActions(),this.setupPresets();const t=this.panel.querySelector("#raawi-text-increase"),i=this.panel.querySelector("#raawi-text-decrease"),s=this.panel.querySelector("#raawi-line-increase"),a=this.panel.querySelector("#raawi-line-decrease"),n=this.panel.querySelector("#raawi-contrast-toggle"),o=this.panel.querySelector("#raawi-focus-toggle"),l=this.panel.querySelector("#raawi-reading-toggle"),d=this.panel.querySelector("#raawi-stop-animations-toggle"),r=this.panel.querySelector("#raawi-reset");console.log("[RaawiX Widget] Elements found:",{textIncrease:!!t,textDecrease:!!i,lineIncrease:!!s,lineDecrease:!!a,contrastToggle:!!n,focusToggle:!!o,readingToggle:!!l,resetButton:!!r}),t&&t.addEventListener("click",u=>{u.preventDefault(),u.stopPropagation(),this.adjustTextSize(.1)}),i&&i.addEventListener("click",u=>{u.preventDefault(),u.stopPropagation(),this.adjustTextSize(-.1)}),s&&s.addEventListener("click",u=>{u.preventDefault(),u.stopPropagation(),this.adjustLineSpacing(.1)}),a&&a.addEventListener("click",u=>{u.preventDefault(),u.stopPropagation(),this.adjustLineSpacing(-.1)}),n&&n.addEventListener("change",u=>{u.preventDefault(),u.stopPropagation(),this.setContrastMode(u.target.checked)}),o&&o.addEventListener("change",u=>{u.preventDefault(),u.stopPropagation(),this.setFocusHighlight(u.target.checked)}),l&&l.addEventListener("change",u=>{u.preventDefault(),u.stopPropagation(),this.setReadingMode(u.target.checked)}),d&&d.addEventListener("change",u=>{u.preventDefault(),u.stopPropagation(),this.setStopAnimations(u.target.checked)});const c=this.panel.querySelector("#raawi-reduce-motion-toggle");c&&c.addEventListener("change",u=>{u.preventDefault(),u.stopPropagation(),this.setReduceMotion(u.target.checked)});const h=this.panel.querySelector("#raawi-big-cursor-select");h&&(h.value=this.settings.bigCursor,h.addEventListener("change",u=>{u.preventDefault(),u.stopPropagation();const v=u.target.value;this.setBigCursor(v)}));const g=this.panel.querySelector("#raawi-magnifier-toggle");g&&g.addEventListener("change",u=>{u.preventDefault(),u.stopPropagation(),this.setMagnifier(u.target.checked)});const p=this.panel.querySelector("#raawi-magnifier-zoom-slider");p&&p.addEventListener("input",u=>{u.preventDefault(),u.stopPropagation();const v=parseFloat(u.target.value);this.setMagnifierZoom(v)});const m=this.panel.querySelector("#raawi-reading-guide-toggle");m&&m.addEventListener("change",u=>{u.preventDefault(),u.stopPropagation(),this.setReadingGuide(u.target.checked)});const y=this.panel.querySelector("#raawi-reading-mask-toggle");y&&y.addEventListener("change",u=>{u.preventDefault(),u.stopPropagation(),this.setReadingMask(u.target.checked)});const f=this.panel.querySelector("#raawi-hide-images-toggle");f&&f.addEventListener("change",u=>{u.preventDefault(),u.stopPropagation(),this.setHideImages(u.target.checked)});const w=this.panel.querySelector("#raawi-image-captions-toggle");w&&w.addEventListener("change",u=>{u.preventDefault(),u.stopPropagation(),this.setImageCaptions(u.target.checked)}),this.panel.querySelectorAll(".raawi-mask-height-btn").forEach(u=>{const v=u.getAttribute("data-height");v===this.settings.readingMaskWindowHeight&&(u.classList.add("active"),u.style.background="#27ae60",u.style.borderColor="#27ae60"),u.addEventListener("click",k=>{k.preventDefault(),k.stopPropagation(),this.setReadingMaskWindowHeight(v)})}),r&&r.addEventListener("click",u=>{u.preventDefault(),u.stopPropagation(),this.reset()});const S=this.panel.querySelector("#raawi-describe-image");S&&S.addEventListener("click",u=>{u.preventDefault(),u.stopPropagation(),this.describeImage()});const A=this.panel.querySelector("#raawi-describe-focused");A&&A.addEventListener("click",u=>{u.preventDefault(),u.stopPropagation(),this.describeFocusedElement()});const L=this.panel.querySelector("#raawi-what-can-i-do");L&&L.addEventListener("click",u=>{u.preventDefault(),u.stopPropagation(),this.whatCanIDoHere()});const C=this.panel.querySelector("#raawi-form-assistant-start"),M=this.panel.querySelector("#raawi-form-assistant-stop"),E=this.panel.querySelector("#raawi-form-assistant-upload");C&&C.addEventListener("click",u=>{u.preventDefault(),u.stopPropagation(),this.startFormAssistant()}),M&&M.addEventListener("click",u=>{u.preventDefault(),u.stopPropagation(),this.stopFormAssistant()}),E&&E.addEventListener("click",u=>{u.preventDefault(),u.stopPropagation(),this.triggerFilePicker()}),this.panel.addEventListener("keydown",u=>{var v;u.key==="Escape"&&(this.closePanel(),(v=this.button)==null||v.focus())});const T=this.panel.querySelector("#raawi-login-assist-start"),F=this.panel.querySelector("#raawi-login-assist-stop");if(T&&T.addEventListener("click",u=>{u.preventDefault(),u.stopPropagation(),this.startLoginAssist()}),F&&F.addEventListener("click",u=>{u.preventDefault(),u.stopPropagation(),this.stopLoginAssist()}),this.voiceEnabled){const u=this.panel.querySelector("#raawi-voice-mode-select"),v=this.panel.querySelector("#raawi-voice-list-commands"),k=this.panel.querySelector("#raawi-voice-mic-button");u&&(u.value=this.settings.voiceMode,u.addEventListener("change",b=>{b.preventDefault(),b.stopPropagation();const $=b.target.value;this.setVoiceModeType($)})),v&&v.addEventListener("click",b=>{b.preventDefault(),b.stopPropagation(),this.speakCommands()}),this.panel.querySelector("#raawi-narration-controls");const R=this.panel.querySelector("#raawi-read-page"),N=this.panel.querySelector("#raawi-read-summary"),B=this.panel.querySelector("#raawi-narration-pause"),D=this.panel.querySelector("#raawi-narration-resume"),O=this.panel.querySelector("#raawi-narration-stop"),H=this.panel.querySelector("#raawi-narration-next"),z=this.panel.querySelector("#raawi-narration-repeat");R&&R.addEventListener("click",()=>this.startFullNarration()),N&&N.addEventListener("click",()=>this.startSummaryNarration()),B&&B.addEventListener("click",()=>this.pauseNarration()),D&&D.addEventListener("click",()=>this.resumeNarration()),O&&O.addEventListener("click",()=>this.stopNarration()),H&&H.addEventListener("click",()=>this.skipToNextSegment()),z&&z.addEventListener("click",()=>this.repeatCurrentSegment());const q=this.panel.querySelector("#raawi-translate-language");q&&(q.value=this.settings.translateLanguage,q.addEventListener("change",b=>{const $=b.target.value;this.settings.translateLanguage=$,this.applySettings()})),k&&(k.addEventListener("mousedown",b=>{this.settings.voiceMode==="push_to_talk"&&(b.preventDefault(),this.startListening())}),k.addEventListener("mouseup",b=>{this.settings.voiceMode==="push_to_talk"&&(b.preventDefault(),this.stopListening())}),k.addEventListener("mouseleave",b=>{this.settings.voiceMode==="push_to_talk"&&this.isListening&&(b.preventDefault(),this.stopListening())}),k.addEventListener("click",b=>{this.settings.voiceMode==="hands_free"&&(b.preventDefault(),this.toggleListening())}),k.addEventListener("keydown",b=>{this.settings.voiceMode==="push_to_talk"&&(b.key==="Enter"||b.key===" ")&&(b.preventDefault(),this.startListening())}),k.addEventListener("keyup",b=>{this.settings.voiceMode==="push_to_talk"&&(b.key==="Enter"||b.key===" ")&&(b.preventDefault(),this.stopListening())}))}}togglePanel(){this.isOpen?this.closePanel():this.openPanel()}openPanel(){!this.panel||!this.button||(this.isOpen=!0,this.panel.classList.add("open"),this.button.setAttribute("aria-expanded","true"))}closePanel(){!this.panel||!this.button||(this.isOpen=!1,this.panel.classList.remove("open"),this.button.setAttribute("aria-expanded","false"))}getTranslations(){const e={en:{accessibilityOptions:"Accessibility Options",assist:"Assist",vision:"Vision",reading:"Reading",tools:"Tools",textSize:"Text Size",lineSpacing:"Line Spacing",highContrastMode:"High Contrast Mode",focusHighlight:"Focus Highlight",readingMode:"Reading Mode",readingGuide:"Reading guide",toggleReadingGuide:"Toggle reading guide",readingMask:"Reading mask",toggleReadingMask:"Toggle reading mask",maskWindowHeight:"Window height",hideImages:"Hide images",toggleHideImages:"Toggle hide images",imageCaptions:"Image captions",toggleImageCaptions:"Toggle image captions",small:"Small",medium:"Medium",large:"Large",stopAnimations:"Stop animations",toggleStopAnimations:"Toggle stop animations",reduceMotion:"Reduce motion",toggleReduceMotion:"Toggle reduce motion",bigCursor:"Big cursor",selectBigCursor:"Select big cursor mode",bigDarkCursor:"Big dark cursor",bigLightCursor:"Big light cursor",magnifier:"Magnifier",toggleMagnifier:"Toggle magnifier",magnifierZoom:"Zoom",adjustMagnifierZoom:"Adjust magnifier zoom level",voiceMode:"Voice Mode",pushToTalk:"Push to Talk",transcript:"Transcript",listCommands:"List Commands",microphoneButton:"Microphone button",pageReading:"Page Reading",readPage:"Read Page",summary:"Summary",translateReading:"Translate Reading",selectTranslationLanguage:"Select translation language for narration",off:"Off",arabic:"Arabic",english:"English",pause:"Pause",resume:"Resume",stop:"Stop",next:"Next",repeat:"Repeat",resetAll:"Reset All",close:"Close",increaseTextSize:"Increase text size",decreaseTextSize:"Decrease text size",increaseLineSpacing:"Increase line spacing",decreaseLineSpacing:"Decrease line spacing",toggleHighContrast:"Toggle high contrast mode",toggleFocusHighlight:"Toggle focus highlight",toggleReadingMode:"Toggle reading mode",toggleVoiceMode:"Toggle voice mode",selectVoiceMode:"Select voice mode",voiceModeOff:"Off",voiceModePushToTalk:"Push to Talk",voiceModeHandsFree:"Hands Free (Wake Phrase)",voiceModeDescription:'Hands Free: Say "hi raawi" or "هلا راوي" to activate',togglePushToTalk:"Toggle push to talk",presets:"Presets",presetBlind:"Blind",presetLowVision:"Low Vision",presetDyslexia:"Dyslexia",presetNone:"Custom (No Preset)",describeImage:"Describe Image",imageWithoutDescription:"Image without description",decorativeImage:"Decorative image",noImageFound:"No image found on this section",describeFocusedElement:"Describe focused element",noFocusedElement:"No focused element",unlabeled:"unlabeled",button:"button",link:"link",input:"input",editField:"Edit field",checkbox:"checkbox",radio:"radio",menu:"menu",checked:"checked",unchecked:"unchecked",expanded:"expanded",collapsed:"collapsed",disabled:"disabled",required:"required",invalid:"invalid",whatCanIDoHere:"What can I do here?",availableActions:"Available actions",action:"Action",sayGoToAction:'Say "go to action',toFocusIt:"to focus it",noActionsFound:"No actions found on this page",loginAssist:"Login Assist (Nafath)",loginAssistSubtitle:"Safe navigation guidance for login pages",startLoginAssist:"Start",stopLoginAssist:"Stop",authBannerMessage:"Login page detected. I can guide you safely.",formAssistant:"Form Assistant",formAssistantSubtitle:"Guided form filling with confirmations",formAssistantActive:"Active",formAssistantNoFormMessage:"No form found on this page",startFormAssistant:"Start",stopFormAssistant:"Stop",formAssistantHelpMeFill:"Help me fill the form",formAssistantPreviousField:"Previous field",formAssistantSubmit:"Submit",formAssistantStartLoginAssist:"Start login assist",formAssistantStatus:"Step {current} of {total}, current field: {field}",formAssistantNoForm:"No form detected on this page",formAssistantSummary:"Form has {required} required fields and {uploads} file uploads",formAssistantNextField:"Next field",formAssistantRepeat:"Repeat",formAssistantSkip:"Skip",formAssistantReview:"Review",formAssistantStop:"Stop assistant",formAssistantChooseFile:"Now choose the file from your device. I will open the file picker.",formAssistantChooseFileButton:"Choose File",formAssistantFileSelected:"File selected: {filename}. Continue?",formAssistantConfirmSubmit:"Confirm submit?",formAssistantFieldLabel:"Field: {label}",formAssistantFieldRequired:"Required",formAssistantFieldOptional:"Optional",formAssistantEnterValue:"Please enter the value for {label}",formAssistantValueEntered:"Value entered: {value}",formAssistantFieldSkipped:"Field skipped",formAssistantAllFieldsComplete:"All required fields are complete. Ready to submit?"},ar:{accessibilityOptions:"خيارات إمكانية الوصول",assist:"مساعدة",vision:"الرؤية",reading:"القراءة",tools:"أدوات",textSize:"حجم النص",lineSpacing:"تباعد الأسطر",highContrastMode:"وضع التباين العالي",focusHighlight:"تمييز التركيز",readingMode:"وضع القراءة",readingGuide:"دليل القراءة",toggleReadingGuide:"تبديل دليل القراءة",readingMask:"قناع القراءة",toggleReadingMask:"تبديل قناع القراءة",maskWindowHeight:"ارتفاع النافذة",hideImages:"إخفاء الصور",toggleHideImages:"تبديل إخفاء الصور",imageCaptions:"تعليقات الصور",toggleImageCaptions:"تبديل تعليقات الصور",small:"صغير",medium:"متوسط",large:"كبير",stopAnimations:"إيقاف الرسوم المتحركة",toggleStopAnimations:"تبديل إيقاف الرسوم المتحركة",reduceMotion:"تقليل الحركة",toggleReduceMotion:"تبديل تقليل الحركة",bigCursor:"مؤشر كبير",selectBigCursor:"اختر وضع المؤشر الكبير",bigDarkCursor:"مؤشر كبير داكن",bigLightCursor:"مؤشر كبير فاتح",magnifier:"المكبر",toggleMagnifier:"تبديل المكبر",magnifierZoom:"التكبير",adjustMagnifierZoom:"ضبط مستوى تكبير المكبر",voiceMode:"الوضع الصوتي",pushToTalk:"اضغط للتحدث",transcript:"النص",listCommands:"عرض الأوامر",microphoneButton:"زر الميكروفون",pageReading:"قراءة الصفحة",readPage:"قراءة الصفحة",summary:"ملخص",translateReading:"ترجمة القراءة",selectTranslationLanguage:"اختر لغة الترجمة للقراءة",off:"إيقاف",arabic:"العربية",english:"الإنجليزية",pause:"إيقاف مؤقت",resume:"استئناف",stop:"إيقاف",next:"التالي",repeat:"تكرار",resetAll:"إعادة تعيين الكل",close:"إغلاق",increaseTextSize:"زيادة حجم النص",decreaseTextSize:"تقليل حجم النص",increaseLineSpacing:"زيادة تباعد الأسطر",decreaseLineSpacing:"تقليل تباعد الأسطر",toggleHighContrast:"تبديل وضع التباين العالي",toggleFocusHighlight:"تبديل تمييز التركيز",toggleReadingMode:"تبديل وضع القراءة",toggleVoiceMode:"تبديل الوضع الصوتي",selectVoiceMode:"اختر وضع الصوت",voiceModeOff:"إيقاف",voiceModePushToTalk:"اضغط للتحدث",voiceModeHandsFree:"يدوي حر (عبارة الاستيقاظ)",voiceModeDescription:'يدوي حر: قل "هلا راوي" أو "hi raawi" للتفعيل',togglePushToTalk:"تبديل اضغط للتحدث",presets:"الإعدادات المسبقة",presetBlind:"مكفوف",presetLowVision:"ضعف البصر",presetDyslexia:"عسر القراءة",presetNone:"مخصص (بدون إعداد مسبق)",describeImage:"وصف الصورة",imageWithoutDescription:"صورة بدون وصف",decorativeImage:"صورة زخرفية",noImageFound:"لم يتم العثور على صورة في هذا القسم",describeFocusedElement:"وصف العنصر المحدد",noFocusedElement:"لا يوجد عنصر محدد",unlabeled:"بدون تسمية",button:"زر",link:"رابط",input:"حقل إدخال",editField:"حقل تعديل",checkbox:"مربع اختيار",radio:"زر اختيار",menu:"قائمة",checked:"محدد",unchecked:"غير محدد",expanded:"موسع",collapsed:"مطوي",disabled:"معطل",required:"مطلوب",invalid:"غير صالح",whatCanIDoHere:"ماذا يمكنني أن أفعل هنا؟",availableActions:"الإجراءات المتاحة",action:"إجراء",sayGoToAction:'قل "اذهب إلى الإجراء',toFocusIt:"للتركيز عليه",noActionsFound:"لم يتم العثور على إجراءات في هذه الصفحة",loginAssist:"مساعدة تسجيل الدخول (نفاذ)",loginAssistSubtitle:"إرشاد آمن لصفحات تسجيل الدخول",startLoginAssist:"ابدأ",stopLoginAssist:"أوقف",authBannerMessage:"تم اكتشاف صفحة تسجيل دخول. أقدر أساعدك بأمان.",formAssistant:"مساعد تعبئة النماذج",formAssistantSubtitle:"تعبئة خطوة بخطوة مع تأكيدات",formAssistantActive:"نشط",formAssistantNoFormMessage:"لا يوجد نموذج في هذه الصفحة",startFormAssistant:"ابدأ",stopFormAssistant:"أوقف",formAssistantHelpMeFill:"ساعدني في النموذج",formAssistantPreviousField:"الحقل السابق",formAssistantSubmit:"إرسال",formAssistantStartLoginAssist:"ابدأ مساعدة تسجيل الدخول",formAssistantStatus:"الخطوة {current} من {total}، الحقل الحالي: {field}",formAssistantNoForm:"لم يتم اكتشاف نموذج في هذه الصفحة",formAssistantSummary:"النموذج يحتوي على {required} حقول مطلوبة و {uploads} رفع ملفات",formAssistantNextField:"الحقل التالي",formAssistantRepeat:"كرر",formAssistantSkip:"تخطي",formAssistantReview:"مراجعة",formAssistantStop:"أوقف المساعد",formAssistantChooseFile:"الآن اختر الملف من جهازك. سأفتح نافذة اختيار الملف.",formAssistantChooseFileButton:"اختر الملف",formAssistantFileSelected:"تم اختيار الملف: {filename}. المتابعة؟",formAssistantConfirmSubmit:"تأكيد الإرسال؟",formAssistantFieldLabel:"الحقل: {label}",formAssistantFieldRequired:"مطلوب",formAssistantFieldOptional:"اختياري",formAssistantEnterValue:"يرجى إدخال القيمة لـ {label}",formAssistantValueEntered:"تم إدخال القيمة: {value}",formAssistantFieldSkipped:"تم تخطي الحقل",formAssistantAllFieldsComplete:"جميع الحقول المطلوبة مكتملة. جاهز للإرسال؟",step:"الخطوة"}};return e[this.context.locale]||e.en}setContext(e){this.context={locale:e,direction:e==="ar"?"rtl":"ltr",voiceLang:e==="ar"?"ar-SA":"en-US",theme:"green"},this.applyContext()}applyContext(){this.updatePanelDirection(),this.updateButtonPosition(),this.updateVoiceLanguage(),this.updateLanguageButtons(),this.updatePanelTexts(),this.updateFeatureTexts(),this.updateTranscriptDirection()}updateTranscriptDirection(){const e=document.getElementById("raawi-voice-transcript");e&&(e.setAttribute("dir",this.context.direction),e.style.textAlign=this.context.direction==="rtl"?"right":"left")}updatePanelDirection(){this.panel&&(this.panel.setAttribute("dir",this.context.direction),this.panel.setAttribute("lang",this.context.locale))}updateButtonPosition(){this.button&&this.button.setAttribute("data-direction",this.context.direction)}updateVoiceLanguage(){this.recognition&&(this.recognition.lang=this.context.voiceLang)}getBestVoice(){if(!this.synthesis)return null;const e=this.synthesis.getVoices();if(e.length===0)return null;const t=this.context.voiceLang;let i=e.find(a=>a.lang===t);if(i)return i;const s=t.split("-")[0];return i=e.find(a=>a.lang.startsWith(s+"-")),i||(i=e.find(a=>a.lang.toLowerCase().startsWith(s.toLowerCase())),i)?i:e[0]}setupLanguageToggle(){var i,s;const e=(i=this.panel)==null?void 0:i.querySelector("#raawi-lang-en"),t=(s=this.panel)==null?void 0:s.querySelector("#raawi-lang-ar");e&&e.addEventListener("click",()=>{this.setContext("en")}),t&&t.addEventListener("click",()=>{this.setContext("ar")})}updateLanguage(){this.applyContext()}updateLanguageButtons(){var i,s;const e=(i=this.panel)==null?void 0:i.querySelector("#raawi-lang-en"),t=(s=this.panel)==null?void 0:s.querySelector("#raawi-lang-ar");e&&t&&(this.context.locale==="en"?(e.classList.add("active"),t.classList.remove("active")):(t.classList.add("active"),e.classList.remove("active")))}updateFeatureTexts(){}updatePanelTexts(){var n,o,l,d;const e=this.getTranslations(),t=(n=this.panel)==null?void 0:n.querySelector('[data-tab="assist"]'),i=(o=this.panel)==null?void 0:o.querySelector('[data-tab="vision"]'),s=(l=this.panel)==null?void 0:l.querySelector('[data-tab="reading"]'),a=(d=this.panel)==null?void 0:d.querySelector('[data-tab="tools"]');t&&(t.textContent=e.assist),i&&(i.textContent=e.vision),s&&(s.textContent=e.reading),a&&(a.textContent=e.tools)}setupTabNavigation(){var t;const e=(t=this.panel)==null?void 0:t.querySelectorAll(".raawi-tab");e==null||e.forEach(i=>{i.addEventListener("click",()=>{const s=i.getAttribute("data-tab");this.switchTab(s)})})}switchTab(e){var s,a;this.currentTab=e;const t=(s=this.panel)==null?void 0:s.querySelectorAll(".raawi-tab");t==null||t.forEach(n=>{const o=n.getAttribute("data-tab")===e;n.classList.toggle("active",o),n.setAttribute("aria-selected",o?"true":"false")});const i=(a=this.panel)==null?void 0:a.querySelectorAll(".raawi-tab-content");i==null||i.forEach(n=>{const o=n.id===`raawi-tab-${e}`;n.classList.toggle("active",o),n.style.display=o?"block":"none"})}setupQuickActions(){var s,a,n;const e=(s=this.panel)==null?void 0:s.querySelector("#raawi-quick-close"),t=(a=this.panel)==null?void 0:a.querySelector("#raawi-quick-reset"),i=(n=this.panel)==null?void 0:n.querySelector("#raawi-quick-voice-toggle");e&&e.addEventListener("click",()=>{this.closePanel()}),t&&t.addEventListener("click",()=>{this.reset()}),i&&this.voiceEnabled&&i.addEventListener("click",()=>{this.settings.voiceMode==="off"?(this.settings.voiceMode="push_to_talk",this.saveVoiceModeToStorage(),this.toggleListening()):(this.settings.voiceMode="off",this.saveVoiceModeToStorage(),this.stopListening())})}setupPresets(){var t;const e=(t=this.panel)==null?void 0:t.querySelectorAll(".raawi-preset-btn");e==null||e.forEach(i=>{i.addEventListener("click",()=>{const s=i.getAttribute("data-preset");this.applyPreset(s)})})}applyPreset(e){var i;this.currentPreset=e;const t=(i=this.panel)==null?void 0:i.querySelectorAll(".raawi-preset-btn");switch(t==null||t.forEach(s=>{const a=s.getAttribute("data-preset");a===e?(s.style.background="#27ae60",s.style.borderColor="#27ae60"):a==="none"?(s.style.background="#95a5a6",s.style.borderColor="#95a5a6"):(s.style.background="#3498db",s.style.borderColor="#3498db")}),e){case"blind":this.settings.focusHighlight=!0,this.settings.readingMode=!0,this.settings.textSize=1.2,this.settings.lineSpacing=1.2,this.voiceEnabled&&(this.settings.voiceMode="push_to_talk");break;case"low-vision":this.settings.contrastMode=!0,this.settings.focusHighlight=!0,this.settings.textSize=1.5,this.settings.lineSpacing=1.3;break;case"dyslexia":this.settings.textSize=1.3,this.settings.lineSpacing=1.5,this.settings.readingMode=!0;break}this.applySettings(),document.body.setAttribute("data-raawi-preset",e),this.updateTextSizeDisplay(),this.updateLineSpacingDisplay(),this.updateUIControls()}updateUIControls(){var p,m,y,f,w,x,S,A,L,C,M,E,T,F;const e=(p=this.panel)==null?void 0:p.querySelector("#raawi-contrast-toggle"),t=(m=this.panel)==null?void 0:m.querySelector("#raawi-focus-toggle"),i=(y=this.panel)==null?void 0:y.querySelector("#raawi-reading-toggle"),s=(f=this.panel)==null?void 0:f.querySelector("#raawi-reading-guide-toggle"),a=(w=this.panel)==null?void 0:w.querySelector("#raawi-reading-mask-toggle"),n=(x=this.panel)==null?void 0:x.querySelector("#raawi-hide-images-toggle"),o=(S=this.panel)==null?void 0:S.querySelector("#raawi-image-captions-toggle"),l=(A=this.panel)==null?void 0:A.querySelector("#raawi-stop-animations-toggle"),d=(L=this.panel)==null?void 0:L.querySelector("#raawi-reduce-motion-toggle"),r=(C=this.panel)==null?void 0:C.querySelector("#raawi-big-cursor-select"),c=(M=this.panel)==null?void 0:M.querySelector("#raawi-magnifier-toggle"),h=(E=this.panel)==null?void 0:E.querySelector("#raawi-magnifier-zoom-slider"),g=(T=this.panel)==null?void 0:T.querySelector("#raawi-voice-toggle");if(e&&(e.checked=this.settings.contrastMode),t&&(t.checked=this.settings.focusHighlight),i&&(i.checked=this.settings.readingMode),s&&(s.checked=this.settings.readingGuide),n&&(n.checked=this.settings.hideImages),o&&(o.checked=this.settings.imageCaptions),l&&(l.checked=this.settings.stopAnimations),d&&(d.checked=this.settings.reduceMotion&&!this.settings.stopAnimations),r&&(r.value=this.settings.bigCursor),c){c.checked=this.settings.magnifier;const u=document.getElementById("raawi-magnifier-zoom-control");u&&(u.style.display=this.settings.magnifier?"block":"none")}if(h){h.value=this.settings.magnifierZoom.toString();const u=document.getElementById("raawi-magnifier-zoom-value");u&&(u.textContent=`${Math.round(this.settings.magnifierZoom*100)}%`)}if(a){a.checked=this.settings.readingMask;const u=(F=this.panel)==null?void 0:F.querySelector("#raawi-reading-mask-height-control");u&&(u.style.display=this.settings.readingMask?"block":"none")}g&&this.voiceEnabled&&(g.checked=this.settings.voiceMode!=="off",this.settings.voiceMode!=="off"&&this.setVoiceMode(!0))}updateVoiceIndicator(){var t;const e=(t=this.panel)==null?void 0:t.querySelector("#raawi-voice-indicator");e&&(this.settings.voiceMode!=="off"&&this.isListening?e.classList.add("active"):e.classList.remove("active"))}clearPreset(){var e;if(this.currentPreset!=="none"){this.currentPreset="none";const t=(e=this.panel)==null?void 0:e.querySelectorAll(".raawi-preset-btn");t==null||t.forEach(i=>{i.getAttribute("data-preset")==="none"?(i.style.background="#27ae60",i.style.borderColor="#27ae60"):(i.style.background="#3498db",i.style.borderColor="#3498db")})}}adjustTextSize(e){this.settings.textSize=Math.max(.8,Math.min(2,this.settings.textSize+e)),this.clearPreset(),this.updateTextSizeDisplay(),this.applySettings()}adjustLineSpacing(e){this.settings.lineSpacing=Math.max(.8,Math.min(2,this.settings.lineSpacing+e)),this.clearPreset(),this.updateLineSpacingDisplay(),this.applySettings()}setContrastMode(e){this.settings.contrastMode=e,this.clearPreset(),this.applySettings(),console.log("[RaawiX Widget] Contrast mode:",e)}setStopAnimations(e){if(this.settings.stopAnimations=e,this.clearPreset(),e){if(this.injectStopAnimationsStyles(),this.pauseAnimations(),document.documentElement.setAttribute("data-raawi-stop-animations","true"),this.settings.reduceMotion){this.settings.reduceMotion=!1,this.removeReduceMotionStyles();const t=document.getElementById("raawi-reduce-motion-toggle");t&&(t.checked=!1)}}else this.removeStopAnimationsStyles(),this.resumeAnimations(),document.documentElement.removeAttribute("data-raawi-stop-animations"),this.settings.reduceMotion&&this.injectReduceMotionStyles();this.applySettings(),console.log("[RaawiX Widget] Stop animations:",e)}setReduceMotion(e){if(this.settings.reduceMotion=e,this.clearPreset(),e&&this.settings.stopAnimations){this.settings.reduceMotion=!1;const t=document.getElementById("raawi-reduce-motion-toggle");t&&(t.checked=!1),console.log("[RaawiX Widget] Reduce Motion disabled because Stop Animations is active");return}e?this.injectReduceMotionStyles():this.removeReduceMotionStyles(),this.applySettings(),console.log("[RaawiX Widget] Reduce motion:",e)}injectReduceMotionStyles(){this.reduceMotionStyleElement||this.settings.stopAnimations||(this.reduceMotionStyleElement=document.createElement("style"),this.reduceMotionStyleElement.id="raawi-reduce-motion-styles",this.reduceMotionStyleElement.textContent=`
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
    `,document.head.appendChild(this.reduceMotionStyleElement))}removeReduceMotionStyles(){this.reduceMotionStyleElement&&(this.reduceMotionStyleElement.parentNode&&this.reduceMotionStyleElement.parentNode.removeChild(this.reduceMotionStyleElement),this.reduceMotionStyleElement=null)}setBigCursor(e){this.settings.bigCursor=e,this.clearPreset(),e==="off"?this.removeBigCursorStyles():this.injectBigCursorStyles(e),this.applySettings(),console.log("[RaawiX Widget] Big cursor:",e)}injectBigCursorStyles(e){this.bigCursorStyleElement&&this.removeBigCursorStyles();const t=32,i=2,s=2,a=`<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}" viewBox="0 0 24 24"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" fill="black" stroke="white" stroke-width="1"/></svg>`,n=`<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}" viewBox="0 0 24 24"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" fill="white" stroke="black" stroke-width="2"/></svg>`,d=`data:image/svg+xml,${encodeURIComponent(e==="dark"?a:n)}`;this.bigCursorStyleElement=document.createElement("style"),this.bigCursorStyleElement.id="raawi-big-cursor-styles",this.bigCursorStyleElement.textContent=`
      * {
        cursor: url("${d}") ${i} ${s}, auto !important;
      }
      
      a, button, [role="button"], [tabindex]:not([tabindex="-1"]), input, textarea, select {
        cursor: url("${d}") ${i} ${s}, pointer !important;
      }
    `,document.head.appendChild(this.bigCursorStyleElement)}removeBigCursorStyles(){this.bigCursorStyleElement&&(this.bigCursorStyleElement.parentNode&&this.bigCursorStyleElement.parentNode.removeChild(this.bigCursorStyleElement),this.bigCursorStyleElement=null)}setMagnifier(e){this.settings.magnifier=e,this.clearPreset();const t=document.getElementById("raawi-magnifier-zoom-control");t&&(t.style.display=e?"block":"none"),e?this.createMagnifier():this.destroyMagnifier(),this.applySettings(),console.log("[RaawiX Widget] Magnifier:",e)}setMagnifierZoom(e){this.settings.magnifierZoom=e,this.clearPreset();const t=document.getElementById("raawi-magnifier-zoom-value");t&&(t.textContent=`${Math.round(e*100)}%`),this.settings.magnifier&&this.magnifierElement&&this.updateMagnifierContent(),this.applySettings(),console.log("[RaawiX Widget] Magnifier zoom:",e)}createMagnifier(){this.magnifierElement||(this.magnifierElement=document.createElement("div"),this.magnifierElement.id="raawi-magnifier",this.magnifierElement.style.cssText=`
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
    `,this.magnifierCanvas=document.createElement("canvas"),this.magnifierCanvas.width=200,this.magnifierCanvas.height=200,this.magnifierCanvas.style.cssText=`
      width: 100%;
      height: 100%;
      display: block;
    `,this.magnifierElement.appendChild(this.magnifierCanvas),document.body.appendChild(this.magnifierElement),this.magnifierThrottle=window.setTimeout(()=>{},0),document.addEventListener("mousemove",this.handleMagnifierMove),document.addEventListener("mouseleave",this.handleMagnifierLeave))}updateMagnifierPosition(e,t){if(!this.magnifierElement)return;const s=200/2,a=e-s,n=t-s-30;this.magnifierElement.style.left=`${a}px`,this.magnifierElement.style.top=`${n}px`,this.magnifierElement.style.display="block"}updateMagnifierContent(){if(!this.magnifierElement||!this.magnifierCanvas||!this.settings.magnifier)return;const e=this.magnifierElement.getBoundingClientRect(),t=e.left+e.width/2,i=e.top+e.height/2;this.captureMagnifierArea(t,i)}captureMagnifierArea(e,t){if(!this.magnifierCanvas||!this.magnifierElement)return;const i=this.settings.magnifierZoom,s=200,a=s/i,n=e-a/2,o=t-a/2,l=this.magnifierCanvas.getContext("2d");l&&(l.clearRect(0,0,s,s),l.fillStyle="white",l.fillRect(0,0,s,s),window.html2canvas?window.html2canvas(document.body,{x:Math.max(0,n),y:Math.max(0,o),width:Math.min(a,window.innerWidth-Math.max(0,n)),height:Math.min(a,window.innerHeight-Math.max(0,o)),scale:1,useCORS:!0,allowTaint:!0,backgroundColor:null,logging:!1}).then(d=>{l&&this.magnifierCanvas&&this.settings.magnifier&&(l.clearRect(0,0,s,s),l.drawImage(d,0,0,s,s))}).catch(()=>{this.fallbackMagnifierDisplay(l)}):this.fallbackMagnifierDisplay(l))}fallbackMagnifierDisplay(e){const t=e.createRadialGradient(100,100,0,100,100,100);t.addColorStop(0,"#3498db"),t.addColorStop(1,"#2980b9"),e.fillStyle=t,e.fillRect(0,0,200,200),e.fillStyle="white",e.font="bold 18px Arial",e.textAlign="center",e.textBaseline="middle",e.fillText("🔍",100,80),e.font="14px Arial",e.fillText(`${Math.round(this.settings.magnifierZoom*100)}%`,100,110),e.font="12px Arial",e.fillText("Move mouse to magnify",100,130)}destroyMagnifier(){this.magnifierElement&&(this.magnifierElement.parentNode&&this.magnifierElement.parentNode.removeChild(this.magnifierElement),this.magnifierElement=null),this.magnifierCanvas=null,document.removeEventListener("mousemove",this.handleMagnifierMove),document.removeEventListener("mouseleave",this.handleMagnifierLeave),this.magnifierThrottle!==null&&(clearTimeout(this.magnifierThrottle),this.magnifierThrottle=null)}setHideImages(e){this.settings.hideImages=e,this.clearPreset(),e?this.applyHideImages():this.restoreImages(),this.applySettings(),console.log("[RaawiX Widget] Hide images:",e)}setImageCaptions(e){this.settings.imageCaptions=e,this.clearPreset(),e?this.applyImageCaptions():this.removeImageCaptions(),this.applySettings(),console.log("[RaawiX Widget] Image captions:",e)}applyHideImages(){document.querySelectorAll("img:not([data-raawi-placeholder])").forEach(t=>{var d,r;const i=t;if(this.hiddenImages.has(i)||i.style.display==="none"&&!this.hiddenImages.has(i))return;const s=i.getBoundingClientRect(),a=i.naturalWidth||i.width||s.width||100,n=i.naturalHeight||i.height||s.height||100,o=document.createElement("div");o.className="raawi-image-placeholder",o.setAttribute("data-raawi-placeholder","true"),o.style.cssText=`
        display: inline-block;
        width: ${a}px;
        min-width: ${a}px;
        height: ${n}px;
        min-height: ${n}px;
        background: #e0e0e0;
        border: 2px dashed #999;
        position: relative;
        box-sizing: border-box;
        vertical-align: top;
      `;const l=document.createElement("span");if(l.textContent=this.context.locale==="ar"?"صورة مخفية":"Image hidden",l.style.cssText=`
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #666;
        font-size: 12px;
        text-align: center;
        pointer-events: none;
        white-space: nowrap;
      `,o.appendChild(l),i.parentNode&&(i.parentNode.insertBefore(o,i),i.style.display="none",this.hiddenImages.set(i,{original:i,placeholder:o}),this.settings.imageCaptions&&this.imageCaptionElements.has(i))){const c=this.imageCaptionElements.get(i);c&&c.parentNode&&o.nextSibling!==c&&(c.parentNode&&c.parentNode.removeChild(c),o.nextSibling?(d=o.parentNode)==null||d.insertBefore(c,o.nextSibling):(r=o.parentNode)==null||r.appendChild(c))}})}restoreImages(){this.hiddenImages.forEach(({original:e,placeholder:t})=>{t.parentNode&&e.parentNode===null?(t.parentNode.replaceChild(e,t),e.style.display=""):e.style.display==="none"&&(e.style.display="",t.parentNode&&t.parentNode.removeChild(t))}),this.hiddenImages.clear()}applyImageCaptions(){document.querySelectorAll("img").forEach(t=>{const i=t;if(this.imageCaptionElements.has(i))return;const s=i.closest("figure");if(s&&s.querySelector("figcaption"))return;const a=this.getImageCaptionText(i),n=document.createElement("div");n.className="raawi-image-caption",n.setAttribute("data-raawi-caption","true"),n.textContent=a,n.style.cssText=`
        font-size: 12px;
        color: #666;
        margin-top: 4px;
        padding: 4px 8px;
        background: #f5f5f5;
        border-left: 3px solid #3498db;
        text-align: ${this.context.locale==="ar"?"right":"left"};
        display: block;
      `;const o=this.hiddenImages.get(i),l=o?o.placeholder:i;l&&l.parentNode&&(l.nextSibling?l.parentNode.insertBefore(n,l.nextSibling):l.parentNode.appendChild(n),this.imageCaptionElements.set(i,n))})}removeImageCaptions(){this.imageCaptionElements.forEach(e=>{e.parentNode&&e.parentNode.removeChild(e)}),this.imageCaptionElements.clear()}getImageCaptionText(e){const t=e.getAttribute("alt");if(t&&t.trim()&&t.trim()!=="")return t.trim();const i=this.getImageDescriptionFromAssistiveMap(e);return i||(this.context.locale==="ar"?"صورة":"Image")}injectStopAnimationsStyles(){this.stopAnimationsStyleElement||(this.stopAnimationsStyleElement=document.createElement("style"),this.stopAnimationsStyleElement.id="raawi-stop-animations-styles",this.stopAnimationsStyleElement.textContent=`
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
    `,document.head.appendChild(this.stopAnimationsStyleElement))}removeStopAnimationsStyles(){this.stopAnimationsStyleElement&&(this.stopAnimationsStyleElement.parentNode&&this.stopAnimationsStyleElement.parentNode.removeChild(this.stopAnimationsStyleElement),this.stopAnimationsStyleElement=null)}pauseAnimations(){document.querySelectorAll("img").forEach(i=>{const s=i.src;s&&(s.endsWith(".gif")||s.includes(".gif?"))&&(i._raawiOriginalSrc=s)}),document.querySelectorAll("video").forEach(i=>{i.paused===!1?(i._raawiWasPlaying=!0,i.pause()):i._raawiWasPlaying=!1})}resumeAnimations(){document.querySelectorAll("video").forEach(t=>{t._raawiWasPlaying===!0&&t.play().catch(()=>{}),delete t._raawiWasPlaying})}setFocusHighlight(e){this.settings.focusHighlight=e,this.clearPreset(),this.applySettings(),console.log("[RaawiX Widget] Focus highlight:",e)}setReadingMode(e){this.settings.readingMode=e,this.clearPreset(),this.applySettings(),console.log("[RaawiX Widget] Reading mode:",e)}setReadingGuide(e){this.settings.readingGuide=e,e?this.createReadingGuide():this.destroyReadingGuide(),this.applySettings(),console.log("[RaawiX Widget] Reading guide:",e)}createReadingGuide(){this.readingGuideElement||(this.readingGuideElement=document.createElement("div"),this.readingGuideElement.className="raawi-reading-guide",this.readingGuideElement.id="raawi-reading-guide",this.readingGuideElement.setAttribute("data-testid","raawi-reading-guide-overlay"),this.readingGuideElement.setAttribute("aria-hidden","true"),this.readingGuideElement.style.display="none",document.body.appendChild(this.readingGuideElement),this.setupReadingGuideListeners())}destroyReadingGuide(){this.readingGuideElement&&(this.removeReadingGuideListeners(),this.readingGuideElement.parentNode&&this.readingGuideElement.parentNode.removeChild(this.readingGuideElement),this.readingGuideElement=null)}setupReadingGuideListeners(){if(!this.readingGuideElement)return;const e=i=>{this.readingGuideThrottle&&clearTimeout(this.readingGuideThrottle),this.readingGuideThrottle=window.setTimeout(()=>{this.readingGuideElement&&this.settings.readingGuide&&this.updateReadingGuidePosition(i.clientY)},16)},t=i=>{const s=i.target;if(s&&this.readingGuideElement&&this.settings.readingGuide){const a=s.getBoundingClientRect(),n=a.top+a.height/2;this.updateReadingGuidePosition(n)}};document.addEventListener("mousemove",e,{passive:!0}),document.addEventListener("focusin",t,{passive:!0}),this.readingGuideElement._mouseMoveHandler=e,this.readingGuideElement._focusHandler=t}removeReadingGuideListeners(){if(!this.readingGuideElement)return;const e=this.readingGuideElement._mouseMoveHandler,t=this.readingGuideElement._focusHandler;e&&document.removeEventListener("mousemove",e),t&&document.removeEventListener("focusin",t),this.readingGuideThrottle&&(clearTimeout(this.readingGuideThrottle),this.readingGuideThrottle=null)}updateReadingGuidePosition(e){if(!this.readingGuideElement)return;const t=this.context.locale==="ar"?"rtl":"ltr";this.readingGuideElement.setAttribute("dir",t),this.readingGuideElement.style.display="block";const i=3,s=e-i/2;this.readingGuideElement.style.top=`${Math.max(0,Math.min(s,window.innerHeight-i))}px`}setReadingMask(e){var i;this.settings.readingMask=e;const t=(i=this.panel)==null?void 0:i.querySelector("#raawi-reading-mask-height-control");t&&(t.style.display=e?"block":"none"),e?this.createReadingMask():this.destroyReadingMask(),this.applySettings(),console.log("[RaawiX Widget] Reading mask:",e)}setReadingMaskWindowHeight(e){var i;this.settings.readingMaskWindowHeight=e;const t=(i=this.panel)==null?void 0:i.querySelectorAll(".raawi-mask-height-btn");if(t==null||t.forEach(s=>{s.getAttribute("data-height")===e?(s.classList.add("active"),s.style.background="#27ae60",s.style.borderColor="#27ae60"):(s.classList.remove("active"),s.style.background="#3498db",s.style.borderColor="#3498db")}),this.settings.readingMask&&this.readingMaskTopOverlay&&this.readingMaskBottomOverlay){const s=document.activeElement;if(s&&s!==document.body){const a=s.getBoundingClientRect(),n=a.top+a.height/2;this.updateReadingMaskPosition(n)}}this.applySettings()}createReadingMask(){this.readingMaskTopOverlay&&this.readingMaskBottomOverlay||(this.readingMaskTopOverlay=document.createElement("div"),this.readingMaskTopOverlay.className="raawi-reading-mask-overlay raawi-reading-mask-overlay-top",this.readingMaskTopOverlay.id="raawi-reading-mask-top",this.readingMaskTopOverlay.setAttribute("data-testid","raawi-reading-mask-overlay"),this.readingMaskTopOverlay.setAttribute("aria-hidden","true"),this.readingMaskTopOverlay.style.display="none",document.body.appendChild(this.readingMaskTopOverlay),this.readingMaskBottomOverlay=document.createElement("div"),this.readingMaskBottomOverlay.className="raawi-reading-mask-overlay raawi-reading-mask-overlay-bottom",this.readingMaskBottomOverlay.id="raawi-reading-mask-bottom",this.readingMaskBottomOverlay.setAttribute("data-testid","raawi-reading-mask-overlay"),this.readingMaskBottomOverlay.setAttribute("aria-hidden","true"),this.readingMaskBottomOverlay.style.display="none",document.body.appendChild(this.readingMaskBottomOverlay),this.setupReadingMaskListeners())}destroyReadingMask(){this.readingMaskTopOverlay&&(this.removeReadingMaskListeners(),this.readingMaskTopOverlay.parentNode&&this.readingMaskTopOverlay.parentNode.removeChild(this.readingMaskTopOverlay),this.readingMaskTopOverlay=null),this.readingMaskBottomOverlay&&(this.readingMaskBottomOverlay.parentNode&&this.readingMaskBottomOverlay.parentNode.removeChild(this.readingMaskBottomOverlay),this.readingMaskBottomOverlay=null)}setupReadingMaskListeners(){if(!this.readingMaskTopOverlay||!this.readingMaskBottomOverlay)return;const e=a=>{this.readingMaskThrottle&&clearTimeout(this.readingMaskThrottle),this.readingMaskThrottle=window.setTimeout(()=>{this.readingMaskTopOverlay&&this.readingMaskBottomOverlay&&this.settings.readingMask&&this.updateReadingMaskPosition(a.clientY)},16)},t=a=>{const n=a.target;if(n&&this.readingMaskTopOverlay&&this.readingMaskBottomOverlay&&this.settings.readingMask){const o=n.getBoundingClientRect(),l=o.top+o.height/2;this.updateReadingMaskPosition(l)}},i=()=>{if(this.readingMaskTopOverlay&&this.readingMaskBottomOverlay&&this.settings.readingMask){const a=document.activeElement;if(a&&a!==document.body&&a!==document.documentElement){const n=a.getBoundingClientRect(),o=n.top+n.height/2;this.updateReadingMaskPosition(o)}}};document.addEventListener("mousemove",e,{passive:!0}),document.addEventListener("focusin",t,{passive:!0}),window.addEventListener("resize",i,{passive:!0}),this.readingMaskTopOverlay._mouseMoveHandler=e,this.readingMaskTopOverlay._focusHandler=t,this.readingMaskTopOverlay._resizeHandler=i;const s=document.activeElement;if(s&&s!==document.body&&s!==document.documentElement){const a=s.getBoundingClientRect(),n=a.top+a.height/2;this.updateReadingMaskPosition(n)}}removeReadingMaskListeners(){if(!this.readingMaskTopOverlay)return;const e=this.readingMaskTopOverlay._mouseMoveHandler,t=this.readingMaskTopOverlay._focusHandler,i=this.readingMaskTopOverlay._resizeHandler;e&&document.removeEventListener("mousemove",e),t&&document.removeEventListener("focusin",t),i&&window.removeEventListener("resize",i),this.readingMaskThrottle&&(clearTimeout(this.readingMaskThrottle),this.readingMaskThrottle=null)}updateReadingMaskPosition(e){if(!this.readingMaskTopOverlay||!this.readingMaskBottomOverlay)return;const s={small:80,medium:120,large:180}[this.settings.readingMaskWindowHeight]/2,a=Math.max(0,e-s),n=e+s,o=Math.max(0,window.innerHeight-n),l=this.context.locale==="ar"?"rtl":"ltr";this.readingMaskTopOverlay.setAttribute("dir",l),this.readingMaskBottomOverlay.setAttribute("dir",l),this.readingMaskTopOverlay.style.display="block",this.readingMaskBottomOverlay.style.display="block",this.readingMaskTopOverlay.style.height=`${a}px`,this.readingMaskBottomOverlay.style.height=`${o}px`}updateTextSizeDisplay(){const e=document.getElementById("raawi-text-size-value");e&&(e.textContent=`${Math.round(this.settings.textSize*100)}%`)}updateLineSpacingDisplay(){const e=document.getElementById("raawi-line-spacing-value");e&&(e.textContent=`${Math.round(this.settings.lineSpacing*100)}%`)}applySettings(){const e=document.documentElement;e.style.setProperty("--raawi-text-size",this.settings.textSize.toString()),this.settings.textSize!==1?e.setAttribute("data-raawi-text-size",""):e.removeAttribute("data-raawi-text-size"),e.style.setProperty("--raawi-line-spacing",this.settings.lineSpacing.toString()),this.settings.lineSpacing!==1?e.setAttribute("data-raawi-line-spacing",""):e.removeAttribute("data-raawi-line-spacing"),this.settings.contrastMode?e.setAttribute("data-raawi-contrast-mode","true"):e.removeAttribute("data-raawi-contrast-mode"),this.settings.stopAnimations?(this.stopAnimationsStyleElement||(this.injectStopAnimationsStyles(),this.pauseAnimations()),this.settings.reduceMotion&&(this.settings.reduceMotion=!1,this.removeReduceMotionStyles())):(this.stopAnimationsStyleElement&&(this.removeStopAnimationsStyles(),this.resumeAnimations()),this.settings.reduceMotion&&(this.reduceMotionStyleElement||this.injectReduceMotionStyles())),this.settings.reduceMotion&&!this.settings.stopAnimations?this.reduceMotionStyleElement||this.injectReduceMotionStyles():this.reduceMotionStyleElement&&this.removeReduceMotionStyles(),this.settings.bigCursor!=="off"?this.bigCursorStyleElement?(this.removeBigCursorStyles(),this.injectBigCursorStyles(this.settings.bigCursor)):this.injectBigCursorStyles(this.settings.bigCursor):this.bigCursorStyleElement&&this.removeBigCursorStyles(),this.settings.magnifier?(this.magnifierElement||this.createMagnifier(),this.magnifierElement&&this.updateMagnifierContent()):this.magnifierElement&&this.destroyMagnifier(),this.settings.hideImages?this.applyHideImages():this.restoreImages(),this.settings.imageCaptions?this.applyImageCaptions():this.removeImageCaptions(),this.settings.focusHighlight?e.setAttribute("data-raawi-focus-highlight","true"):e.removeAttribute("data-raawi-focus-highlight"),this.settings.readingMode?e.setAttribute("data-raawi-reading-mode","true"):e.removeAttribute("data-raawi-reading-mode"),this.settings.readingGuide?this.readingGuideElement||this.createReadingGuide():this.readingGuideElement&&this.destroyReadingGuide(),this.settings.readingMask?(!this.readingMaskTopOverlay||!this.readingMaskBottomOverlay)&&this.createReadingMask():(this.readingMaskTopOverlay||this.readingMaskBottomOverlay)&&this.destroyReadingMask();const t=document.getElementById("raawi-contrast-toggle"),i=document.getElementById("raawi-focus-toggle"),s=document.getElementById("raawi-reading-toggle"),a=document.getElementById("raawi-reading-guide-toggle"),n=document.getElementById("raawi-reading-mask-toggle");document.getElementById("raawi-hide-images-toggle"),document.getElementById("raawi-image-captions-toggle");const o=document.getElementById("raawi-stop-animations-toggle"),l=document.getElementById("raawi-reduce-motion-toggle"),d=document.getElementById("raawi-big-cursor-select"),r=document.getElementById("raawi-magnifier-toggle"),c=document.getElementById("raawi-magnifier-zoom-slider");if(t&&(t.checked=this.settings.contrastMode),i&&(i.checked=this.settings.focusHighlight),s&&(s.checked=this.settings.readingMode),a&&(a.checked=this.settings.readingGuide),n){n.checked=this.settings.readingMask;const h=document.getElementById("raawi-reading-mask-height-control");h&&(h.style.display=this.settings.readingMask?"block":"none")}if(o&&(o.checked=this.settings.stopAnimations),l&&(l.checked=this.settings.reduceMotion&&!this.settings.stopAnimations),d&&(d.value=this.settings.bigCursor),r){r.checked=this.settings.magnifier;const h=document.getElementById("raawi-magnifier-zoom-control");h&&(h.style.display=this.settings.magnifier?"block":"none")}if(c){c.value=this.settings.magnifierZoom.toString();const h=document.getElementById("raawi-magnifier-zoom-value");h&&(h.textContent=`${Math.round(this.settings.magnifierZoom*100)}%`)}}reset(){var t;this.settings={textSize:1,lineSpacing:1,contrastMode:!1,focusHighlight:!1,readingMode:!1,readingGuide:!1,readingMask:!1,readingMaskWindowHeight:"medium",hideImages:!1,imageCaptions:!1,stopAnimations:!1,reduceMotion:!1,bigCursor:"off",magnifier:!1,magnifierZoom:2,voiceMode:"off",translateLanguage:"off"},this.readingGuideElement&&this.destroyReadingGuide(),(this.readingMaskTopOverlay||this.readingMaskBottomOverlay)&&this.destroyReadingMask(),this.stopAnimationsStyleElement&&(this.removeStopAnimationsStyles(),this.resumeAnimations()),this.reduceMotionStyleElement&&this.removeReduceMotionStyles(),this.bigCursorStyleElement&&this.removeBigCursorStyles(),this.magnifierElement&&this.destroyMagnifier(),this.restoreImages(),this.removeImageCaptions(),this.currentPreset="none";const e=(t=this.panel)==null?void 0:t.querySelectorAll(".raawi-preset-btn");e==null||e.forEach(i=>{i.getAttribute("data-preset")==="none"?(i.style.background="#27ae60",i.style.borderColor="#27ae60"):(i.style.background="#3498db",i.style.borderColor="#3498db")}),this.updateTextSizeDisplay(),this.updateLineSpacingDisplay(),this.isListening&&this.stopListening(),this.updateUIControls(),this.applySettings()}async fetchPagePackageAsync(){var e;if(this.apiUrl)try{const t=new URL(window.location.href).hostname,i=`${this.apiUrl}/api/widget/page-package?domain=${encodeURIComponent(t)}&url=${encodeURIComponent(window.location.href)}`,s=await fetch(i);s.ok?(this.cachedPagePackage=await s.json(),console.log("[RaawiX Widget] Page package fetched from API"),(e=this.cachedPagePackage)!=null&&e.guidance&&(this.cachedGuidance={url:this.cachedPagePackage.url||"",summary:this.cachedPagePackage.guidance.summary||"",landmarks:this.cachedPagePackage.guidance.landmarks||[],formSteps:this.cachedPagePackage.guidance.formSteps||[],keyActions:this.cachedPagePackage.guidance.keyActions||[],matchedUrl:this.cachedPagePackage.matchedUrl||"",matchConfidence:this.cachedPagePackage.matchConfidence||"low",scanTimestamp:this.cachedPagePackage.scanTimestamp||void 0,pageFingerprint:this.cachedPagePackage.fingerprint||void 0}),this.cachedGuidance&&(this.checkStaleScan(this.cachedGuidance),this.showScanFreshness(this.cachedGuidance))):s.status===404&&(console.log("[RaawiX Widget] Page package not found, falling back to separate endpoints"),await this.fetchGuidanceAsync())}catch(t){console.warn("[RaawiX Widget] Failed to fetch page package:",t),await this.fetchGuidanceAsync()}}async fetchGuidanceAsync(){if(this.apiUrl)try{const e=`${this.apiUrl}/api/widget/guidance?url=${encodeURIComponent(window.location.href)}&scanId=${this.scanId||"latest"}`,t=await fetch(e);t.ok&&(this.cachedGuidance=await t.json(),console.log("[RaawiX Widget] Guidance fetched from API"),this.checkStaleScan(this.cachedGuidance),this.showScanFreshness(this.cachedGuidance))}catch(e){console.warn("[RaawiX Widget] Failed to fetch guidance:",e)}}checkStaleScan(e){if(!e||!e.pageFingerprint)return;const t=this.computeCurrentPageFingerprint(),i=e.pageFingerprint,s=this.compareFingerprints(t,i);(e.matchConfidence==="low"||e.matchConfidence==="medium"||s<.5)&&this.showStaleScanWarning()}computeCurrentPageFingerprint(){var n,o;const e={},t=(n=document.title)==null?void 0:n.trim();t&&(e.title=t);const i=document.querySelector("h1"),s=document.querySelector("h2");i&&i.textContent?e.firstHeading=i.textContent.trim():s&&s.textContent&&(e.firstHeading=s.textContent.trim());const a=document.querySelector("main")||document.body;if(a){const d=(((o=a.textContent)==null?void 0:o.replace(/\s+/g," ").trim())||"").substring(0,2e3);d.length>0&&(e.mainTextHash=this.simpleHash(d))}return e}simpleHash(e){let t=0;for(let i=0;i<e.length;i++){const s=e.charCodeAt(i);t=(t<<5)-t+s,t=t&t}return Math.abs(t).toString(16)}compareFingerprints(e,t){let i=0,s=0;return e.title&&t.title&&(s++,e.title.toLowerCase()===t.title.toLowerCase()?i+=.5:(e.title.toLowerCase().includes(t.title.toLowerCase())||t.title.toLowerCase().includes(e.title.toLowerCase()))&&(i+=.3)),e.firstHeading&&t.firstHeading&&(s++,e.firstHeading.toLowerCase()===t.firstHeading.toLowerCase()?i+=.5:(e.firstHeading.toLowerCase().includes(t.firstHeading.toLowerCase())||t.firstHeading.toLowerCase().includes(e.firstHeading.toLowerCase()))&&(i+=.3)),e.mainTextHash&&t.mainTextHash&&(s++,e.mainTextHash===t.mainTextHash&&(i+=1)),s>0?i/s:0}showScanFreshness(e){var l,d;if(!e||!e.scanTimestamp)return;const t=(l=this.panel)==null?void 0:l.querySelector("#raawi-scan-freshness");t&&t.remove();const i=e.scanTimestamp.completedAt||e.scanTimestamp.startedAt;if(!i)return;const a=new Date(i).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}),n=document.createElement("div");n.id="raawi-scan-freshness",n.style.cssText=`
      margin-top: 10px;
      padding: 8px;
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      font-size: 0.8em;
      color: #6c757d;
      text-align: center;
    `,n.textContent=`Guidance based on scan from ${a}`,n.setAttribute("aria-live","polite");const o=(d=this.panel)==null?void 0:d.querySelector("#raawi-narration-controls");o?o.insertAdjacentElement("afterend",n):this.panel&&this.panel.appendChild(n)}showStaleScanWarning(){var s,a,n;if((s=this.panel)!=null&&s.querySelector("#raawi-stale-scan-warning"))return;const e=document.createElement("div");e.id="raawi-stale-scan-warning",e.style.cssText=`
      margin-top: 10px;
      padding: 10px;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 4px;
      font-size: 0.85em;
      color: #856404;
    `,e.innerHTML=`
      <strong>⚠️ Scan Notice:</strong><br>
      Guidance may be based on an older or different page version. 
      Using DOM-only reading for content, scan data for general hints.
    `,e.setAttribute("role","alert"),e.setAttribute("aria-live","polite");const t=(a=this.panel)==null?void 0:a.querySelector("#raawi-scan-freshness"),i=(n=this.panel)==null?void 0:n.querySelector("#raawi-narration-controls");t?t.insertAdjacentElement("afterend",e):i?i.insertAdjacentElement("afterend",e):this.panel&&this.panel.appendChild(e)}async fetchIssuesAsync(){if(!this.apiUrl)return null;if(this.cachedIssues)return this.cachedIssues;try{const e=`${this.apiUrl}/api/widget/issues?url=${encodeURIComponent(window.location.href)}&scanId=${this.scanId||"latest"}`,t=await fetch(e);if(t.ok)return this.cachedIssues=await t.json(),this.cachedIssues}catch(e){console.warn("[RaawiX Widget] Failed to fetch issues:",e)}return null}buildReadingQueue(e){var o,l,d,r;const t=[];let i=0;const s=document.title||"Page";t.push({id:"title",type:"title",text:`Page: ${s}`,priority:i++});let a="";if((o=this.cachedGuidance)!=null&&o.summary)a=this.cachedGuidance.summary;else{const c=document.querySelector('meta[name="description"]');if(c)a=c.getAttribute("content")||"";else{const h=document.querySelector("main");if(h){const g=h.querySelector("p");g&&(a=(g.textContent||"").substring(0,200).split(".").slice(0,2).join(".")+".")}}}if(a&&t.push({id:"summary",type:"summary",text:`Summary: ${a}`,priority:i++}),e==="summary")return{segments:t,currentIndex:0,mode:e};const n=document.querySelector("main");return n&&n.querySelectorAll("h2, h3").forEach(h=>{var g,p;if(this.isElementVisible(h)&&!this.isElementHidden(h)){const m=((g=h.textContent)==null?void 0:g.trim())||"";if(m){let y="",f=h.nextElementSibling;for(;f&&!y&&f!==n.querySelector("h2, h3");){if(f.tagName==="P"||f.tagName==="DIV"){const w=((p=f.textContent)==null?void 0:p.trim())||"";if(w.length>20){y=w.split(".").slice(0,2).join(".")+".";break}}f=f.nextElementSibling}t.push({id:`section-${i}`,type:"section",text:y?`${m}. ${y}`:m,heading:m,element:h,priority:i++})}}}),e==="detailed-summary"?{segments:t,currentIndex:0,mode:e}:((l=this.cachedGuidance)!=null&&l.keyActions?this.cachedGuidance.keyActions.slice(0,5).forEach((h,g)=>{t.push({id:`card-${g}`,type:"card",text:`${h.label}. ${h.description||""}`,heading:h.label,element:h.selector?document.querySelector(h.selector):null,priority:i++})}):((n==null?void 0:n.querySelectorAll('article, .card, [class*="card"]'))||[]).forEach((h,g)=>{var p;if(g<5&&this.isElementVisible(h)){const m=h.querySelector('h2, h3, h4, .title, [class*="title"]'),y=h.querySelector('button, a, [role="button"]'),f=((p=m==null?void 0:m.textContent)==null?void 0:p.trim())||"",w=y?this.getAccessibleLabel(y):"";f&&t.push({id:`card-${g}`,type:"card",text:`${f}. ${w?`Action: ${w}`:""}`,heading:f,element:h,priority:i++})}}),(d=this.cachedGuidance)!=null&&d.formSteps&&this.cachedGuidance.formSteps.length>0?this.cachedGuidance.formSteps.forEach((c,h)=>{const g=c.fields.map(p=>{const m=p.required?"required":"optional";return`${p.label||"Field"} (${p.type||"text"}, ${m})`}).join(", ");t.push({id:`form-${h}`,type:"form",text:`Form: ${c.label}. Fields: ${g}`,heading:c.label,priority:i++})}):document.querySelectorAll("form").forEach((h,g)=>{var p;if(g<2&&this.isElementVisible(h)){const m=h.getAttribute("aria-label")||((p=h.querySelector("legend, h2, h3"))==null?void 0:p.textContent)||"Form",y=h.querySelectorAll("input, textarea, select"),f=Array.from(y).slice(0,5).map(w=>{const x=this.getAccessibleLabel(w)||"Field",S=w.required?"required":"optional";return`${x} (${S})`}).join(", ");f&&t.push({id:`form-${g}`,type:"form",text:`${m}. Fields: ${f}`,heading:m,element:h,priority:i++})}}),(r=this.cachedGuidance)!=null&&r.keyActions&&this.cachedGuidance.keyActions.slice(0,5).forEach((c,h)=>{t.push({id:`action-${h}`,type:"action",text:`Action: ${c.label}. ${c.description||""}`,heading:c.label,element:c.selector?document.querySelector(c.selector):null,priority:i++})}),{segments:t,currentIndex:0,mode:e})}isElementVisible(e){if(!e.offsetParent)return!1;const t=window.getComputedStyle(e);return t.display!=="none"&&t.visibility!=="hidden"&&t.opacity!=="0"}isElementHidden(e){return e.getAttribute("aria-hidden")==="true"}startFullNarration(){this.stopNarration(),this.narrationState.queue=this.buildReadingQueue("full"),this.narrationState.isStopped=!1,this.narrationState.isPaused=!1,this.updateNarrationStatus(),this.speakNextSegment()}startSummaryNarration(){this.stopNarration(),this.narrationState.queue=this.buildReadingQueue("summary"),this.narrationState.isStopped=!1,this.narrationState.isPaused=!1,this.updateNarrationStatus(),this.speakNextSegment()}startDetailedSummaryNarration(){this.stopNarration(),this.narrationState.queue=this.buildReadingQueue("detailed-summary"),this.narrationState.isStopped=!1,this.narrationState.isPaused=!1,this.updateNarrationStatus(),this.speakNextSegment()}speakNextSegment(){if(!this.narrationState.queue||this.narrationState.isStopped||this.narrationState.isPaused)return;const{segments:e,currentIndex:t}=this.narrationState.queue;if(t>=e.length){this.speak("End of page content.",!1),this.narrationState.isSpeaking=!1,this.updateNarrationStatus();return}const i=e[t];this.narrationState.isSpeaking=!0,this.updateNarrationStatus(),i.element&&i.element.scrollIntoView({behavior:"smooth",block:"center"});let s=i.text;if(t>0&&i.type==="section"){const a=["Next section:","Moving on:","Now:"];s=`${a[t%a.length]} ${s}`}this.speakChunked(s,()=>{this.narrationState.queue&&(this.narrationState.queue.currentIndex++,this.speakNextSegment())}).catch(a=>{console.warn("[RaawiX Widget] Error in speakChunked:",a),this.narrationState.queue&&(this.narrationState.queue.currentIndex++,this.speakNextSegment())})}async translateText(e,t){if(!this.apiUrl||t!=="ar"&&t!=="en")return e;try{const i=await fetch(`${this.apiUrl}/api/widget/translate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:e,targetLang:t})});if(!i.ok){if(i.status===501)return e;throw new Error(`Translation failed: ${i.status}`)}return(await i.json()).translatedText||e}catch(i){return console.warn("[RaawiX Widget] Translation failed, using original text:",i),e}}async speakChunked(e,t){if(!this.synthesis){t==null||t();return}let i=e;if(this.settings.translateLanguage!=="off"&&this.apiUrl)try{i=await this.translateText(e,this.settings.translateLanguage)}catch{i=e}const s=[],a=i.split(/([.!?]\s+)/);let n="";for(let d=0;d<a.length;d++){const r=a[d];n.length+r.length<=220?n+=r:(n.trim()&&s.push(n.trim()),n=r)}n.trim()&&s.push(n.trim()),s.length===0&&s.push(i);let o=0;const l=()=>{if(o>=s.length||this.narrationState.isStopped){t==null||t();return}if(this.narrationState.isPaused){const c=setInterval(()=>{!this.narrationState.isPaused&&!this.narrationState.isStopped?(clearInterval(c),l()):this.narrationState.isStopped&&(clearInterval(c),t==null||t())},100);return}const d=s[o],r=new SpeechSynthesisUtterance(d);r.lang="en-US",r.rate=this.narrationState.rate,r.pitch=this.narrationState.pitch,r.volume=this.narrationState.volume,r.onend=()=>{o++,setTimeout(()=>l(),200)},r.onerror=c=>{console.error("[RaawiX Widget] Speech synthesis error:",c),o++,setTimeout(()=>l(),200)},this.narrationState.currentUtterance=r,this.synthesis&&this.synthesis.speak(r)};l()}pauseNarration(){var e;this.narrationState.isSpeaking&&(this.narrationState.isPaused=!0,(e=this.synthesis)==null||e.pause(),this.updateNarrationStatus(),this.speak("Paused",!1))}resumeNarration(){var e;this.narrationState.isPaused&&(this.narrationState.isPaused=!1,(e=this.synthesis)==null||e.resume(),this.updateNarrationStatus(),this.speak("Resuming",!1))}stopNarration(){var e;this.narrationState.isStopped=!0,this.narrationState.isPaused=!1,this.narrationState.isSpeaking=!1,(e=this.synthesis)==null||e.cancel(),this.narrationState.currentUtterance=null,this.narrationState.queue&&(this.narrationState.queue.currentIndex=0),this.updateNarrationStatus()}skipToNextSegment(){var e;this.narrationState.queue&&this.narrationState.queue.currentIndex<this.narrationState.queue.segments.length-1&&((e=this.synthesis)==null||e.cancel(),this.narrationState.queue.currentIndex++,this.speakNextSegment())}repeatCurrentSegment(){var e;this.narrationState.queue&&this.narrationState.queue.currentIndex>=0&&((e=this.synthesis)==null||e.cancel(),this.speakNextSegment())}updateNarrationStatus(){var n;const e=(n=this.panel)==null?void 0:n.querySelector("#raawi-narration-status");if(!e)return;if(!this.narrationState.queue){e.textContent="";return}const{segments:t,currentIndex:i}=this.narrationState.queue;if(t.length===0){e.textContent="";return}const s=t[i],a=this.narrationState.isPaused?`Paused: ${s.heading||s.type} (${i+1} of ${t.length})`:this.narrationState.isSpeaking?`Reading: ${s.heading||s.type} (${i+1} of ${t.length})`:`Ready: ${i+1} of ${t.length}`;e.textContent=a}initVoiceMode(){if(typeof(window.SpeechRecognition||window.webkitSpeechRecognition)>"u"){console.warn("[RaawiX Widget] Speech Recognition not supported in this browser"),this.voiceEnabled=!1;const i=document.getElementById("raawi-voice-control");i&&(i.style.display="none");return}if(typeof speechSynthesis>"u"){console.warn("[RaawiX Widget] Speech Synthesis not supported in this browser"),this.voiceEnabled=!1;const i=document.getElementById("raawi-voice-control");i&&(i.style.display="none");return}const t=window.SpeechRecognition||window.webkitSpeechRecognition;this.recognition=new t,this.recognition.continuous=!0,this.recognition.interimResults=!0,this.recognition.lang=this.context.voiceLang,this.recognition.onstart=()=>{this.isListening=!0,this.updateVoiceIndicator(),this.updateMicButton(),this.addTranscript("Listening...")},this.recognition.onresult=i=>{let s="",a="";for(let n=i.resultIndex;n<i.results.length;n++){const o=i.results[n][0].transcript;i.results[n].isFinal?a+=o+" ":s+=o}if(a){if(this.transcript=a.trim(),this.addTranscript(this.transcript),this.detectWakePhrase(this.transcript)){if(this.isWakeOnlyMode&&!this.isActiveListening){if(!this.micPermissionGranted){this.showPermissionPrompt();return}this.handleWakePhrase();return}else if(this.isActiveListening){this.activeListeningTimeout&&clearTimeout(this.activeListeningTimeout),this.activeListeningTimeout=window.setTimeout(()=>{this.stopActiveListening()},15e3);return}}if(this.isWakeOnlyMode&&!this.isActiveListening)return;this.processVoiceCommand(this.transcript)}else s&&!this.isWakeOnlyMode&&this.addTranscript(s,!0)},this.recognition.onerror=i=>{console.error("[RaawiX Widget] Speech recognition error:",i.error),i.error==="no-speech"||i.error==="not-allowed"&&(this.micPermissionGranted=!1,this.getTranslations(),this.speakNow(this.context.locale==="ar"?"تم رفض إذن الميكروفون. يرجى تفعيل الوصول إلى الميكروفون.":"Microphone permission denied. Please enable microphone access.",{lang:this.context.voiceLang}),this.stopListening())},this.recognition.onend=()=>{this.isListening=!1,this.updateVoiceIndicator(),this.updateMicButton(),this.settings.voiceMode==="hands_free"&&this.isWakeOnlyMode?setTimeout(()=>{this.settings.voiceMode==="hands_free"&&this.isWakeOnlyMode&&!this.isActiveListening&&this.startWakeOnlyMode()},100):this.settings.voiceMode==="hands_free"&&this.isActiveListening&&this.activeListeningTimeout&&setTimeout(()=>{this.settings.voiceMode==="hands_free"&&this.isActiveListening&&this.startActiveListening()},100)},this.synthesis=window.speechSynthesis,this.collectActions()}detectWakePhrase(e){const t=e.toLowerCase().trim(),i=["hi raawi","hey raawi"],s=["هلا راوي","يا راوي"];return this.context.locale==="ar"?s.some(a=>t.includes(a.toLowerCase())):i.some(a=>t.includes(a))}handleWakePhrase(){this.isWakeOnlyMode=!1,this.isActiveListening=!0,this.startActiveListening(),this.speakGuidedOnboarding(),setTimeout(()=>{this.suggestBlindPreset()},3e3)}startWakeOnlyMode(){if(!(!this.recognition||this.isListening)){this.isWakeOnlyMode=!0,this.isActiveListening=!1;try{this.recognition.start()}catch(e){console.error("[RaawiX Widget] Failed to start wake-only mode:",e)}}}startActiveListening(){if(this.recognition&&(this.isWakeOnlyMode=!1,this.isActiveListening=!0,this.activeListeningTimeout&&clearTimeout(this.activeListeningTimeout),this.activeListeningTimeout=window.setTimeout(()=>{this.stopActiveListening()},15e3),!this.isListening))try{this.recognition.start()}catch(e){console.error("[RaawiX Widget] Failed to start active listening:",e)}}stopActiveListening(){this.isActiveListening=!1,this.activeListeningTimeout&&(clearTimeout(this.activeListeningTimeout),this.activeListeningTimeout=null),this.settings.voiceMode==="hands_free"?(this.stopListening(),setTimeout(()=>{this.startWakeOnlyMode()},500)):this.stopListening()}startListening(){if(!(!this.recognition||this.isListening)){if(this.settings.voiceMode==="hands_free"){this.startWakeOnlyMode();return}try{this.recognition.start()}catch(e){console.error("[RaawiX Widget] Failed to start recognition:",e)}}}stopListening(){if(!(!this.recognition||!this.isListening)){this.isWakeOnlyMode=!1,this.isActiveListening=!1,this.activeListeningTimeout&&(clearTimeout(this.activeListeningTimeout),this.activeListeningTimeout=null);try{this.recognition.stop()}catch(e){console.error("[RaawiX Widget] Failed to stop recognition:",e)}}}toggleListening(){if(this.isListening)this.stopListening();else{if(!this.micPermissionGranted){this.requestMicPermission();return}this.settings.voiceMode==="off"&&(this.settings.voiceMode="push_to_talk",this.saveVoiceModeToStorage()),this.startListening()}}async requestMicPermission(){try{const e=await navigator.mediaDevices.getUserMedia({audio:!0});this.micPermissionGranted=!0,e.getTracks().forEach(t=>t.stop()),this.settings.voiceMode==="off"&&(this.settings.voiceMode="push_to_talk",this.saveVoiceModeToStorage()),this.startListening()}catch{this.micPermissionGranted=!1,this.getTranslations(),this.speakNow(this.context.locale==="ar"?"تم رفض إذن الميكروفون.":"Microphone permission denied.",{lang:this.context.voiceLang})}}showPermissionPrompt(){this.getTranslations();const e=this.context.locale==="ar"?"تفعيل التحكم الصوتي؟":"Enable voice control?";this.speakNow(e,{lang:this.context.voiceLang})}speakGuidedOnboarding(){let e;this.context.locale==="ar"?(e="هلا، أنا حاضر. قل: اقرأ الصفحة، ملخص، ابدأ مساعد النموذج.",this.formSnapshot&&(this.formSnapshot.fields.length>0||this.formSnapshot.uploads.length>0)&&(e+=" الصفحة فيها نموذج. قل: ابدأ مساعد النموذج.")):(e="I'm here. Say: read page, summary, start form assistant.",this.formSnapshot&&(this.formSnapshot.fields.length>0||this.formSnapshot.uploads.length>0)&&(e+=" This page has a form. Say: start form assistant.")),this.speakNow(e,{lang:this.context.voiceLang})}suggestBlindPreset(){if(this.currentPreset==="blind")return;let e;this.context.locale==="ar"?e="تبغاني أفعل وضع الكفيف وأبدأ القراءة؟":e="Do you want me to enable Blind preset and start reading?",this.speakNow(e,{lang:this.context.voiceLang})}loadVoiceModeFromStorage(){try{if(localStorage.getItem("raawi-voice-mode-opted-in")==="true"){const t=localStorage.getItem("raawi-voice-mode");t&&(t==="off"||t==="push_to_talk"||t==="hands_free")&&(this.settings.voiceMode=t)}}catch(e){console.warn("[RaawiX Widget] Could not load voice mode from storage:",e)}}saveVoiceModeToStorage(){try{localStorage.setItem("raawi-voice-mode-opted-in","true"),localStorage.setItem("raawi-voice-mode",this.settings.voiceMode)}catch(e){console.warn("[RaawiX Widget] Could not save voice mode to storage:",e)}}updateMicButton(){const e=document.getElementById("raawi-voice-mic-button");e&&(this.isListening?(e.classList.add("listening"),e.setAttribute("aria-label","Stop listening")):(e.classList.remove("listening"),e.setAttribute("aria-label","Start listening")))}addTranscript(e,t=!1){const i=document.getElementById("raawi-voice-transcript");i&&(i.setAttribute("dir",this.context.direction),i.style.textAlign=this.context.direction==="rtl"?"right":"left",t?(i.textContent=e,i.style.fontStyle="italic",i.style.color="#666"):(i.textContent=e,i.style.fontStyle="normal",i.style.color="#333"))}processVoiceCommand(e){const t=e.toLowerCase().trim();console.log("[RaawiX Widget] Processing command:",t);const i=this.getTranslations();if(!this.formAssistantActive&&(t.includes("start form assistant")||t.includes(i.startFormAssistant.toLowerCase())||t.includes("help me fill the form")||t.includes(i.formAssistantHelpMeFill.toLowerCase())||this.context.locale==="ar"&&(t.includes("ابدأ مساعد النموذج")||t.includes("ساعدني في النموذج")))){this.startFormAssistant();return}if(!this.formAssistantActive&&(t.includes("start login assist")||t.includes(i.formAssistantStartLoginAssist.toLowerCase())||this.context.locale==="ar"&&t.includes("ابدأ مساعدة تسجيل الدخول"))){this.najizMode=!0,this.startFormAssistant();return}if(this.formAssistantActive&&this.processFormAssistantCommand(e))return;if(t.includes("increase text")||t.includes("text bigger")||t.includes("larger text")){this.adjustTextSize(.1),this.speak("Text size increased");return}if(t.includes("decrease text")||t.includes("text smaller")||t.includes("smaller text")){this.adjustTextSize(-.1),this.speak("Text size decreased");return}if(t.includes("increase spacing")||t.includes("more spacing")||t.includes("line spacing bigger")){this.adjustLineSpacing(.1),this.speak("Line spacing increased");return}if(t.includes("decrease spacing")||t.includes("less spacing")||t.includes("line spacing smaller")){this.adjustLineSpacing(-.1),this.speak("Line spacing decreased");return}if(t.includes("contrast on")||t.includes("enable contrast")||t.includes("turn on contrast")){this.setContrastMode(!0),this.speak("High contrast mode enabled");return}if(t.includes("contrast off")||t.includes("disable contrast")||t.includes("turn off contrast")){this.setContrastMode(!1),this.speak("High contrast mode disabled");return}if(t.includes("focus highlight on")||t.includes("enable focus")||t.includes("turn on focus")){this.setFocusHighlight(!0),this.speak("Focus highlight enabled");return}if(t.includes("focus highlight off")||t.includes("disable focus")||t.includes("turn off focus")){this.setFocusHighlight(!1),this.speak("Focus highlight disabled");return}if(t.includes("reading mode on")||t.includes("enable reading")||t.includes("turn on reading")){this.setReadingMode(!0),this.speak("Reading mode enabled");return}if(t.includes("reading mode off")||t.includes("disable reading")||t.includes("turn off reading")){this.setReadingMode(!1),this.speak("Reading mode disabled");return}if(t.includes("stop")&&this.isActiveListening){this.stopActiveListening(),this.getTranslations(),this.speakNow(this.context.locale==="ar"?"تم إيقاف الاستماع.":"Stopped listening.",{lang:this.context.voiceLang});return}if(t.includes("yes")||t.includes("نعم")||t.includes("enable")||t.includes("فعل")){this.currentPreset!=="blind"&&(this.applyPreset("blind"),this.startFullNarration(),this.getTranslations(),this.speakNow(this.context.locale==="ar"?"تم تفعيل وضع الكفيف وبدء القراءة.":"Blind preset enabled. Starting to read.",{lang:this.context.voiceLang}));return}if(t.includes("no")||t.includes("لا")||t.includes("skip")||t.includes("تخطي")){this.getTranslations(),this.speakNow(this.context.locale==="ar"?"حسناً، لن أفعل الوضع.":"Okay, I won't enable the preset.",{lang:this.context.voiceLang});return}if(t.includes("read page")||t.includes("read this page")||t.includes("read full page")){this.startFullNarration();return}if(t.includes("summary")&&!t.includes("detailed")){this.startSummaryNarration();return}if(t.includes("detailed summary")||t.includes("read detailed")){this.startDetailedSummaryNarration();return}if(t.includes("read landmarks")||t.includes("list landmarks")){this.readLandmarks();return}if(t.includes("read actions")||t.includes("list actions")){this.readActions();return}if(t.includes("read issues")||t.includes("list issues")){this.readIssues();return}if(t.includes("describe image")||t.includes("وصف الصورة")){this.describeImage();return}if(t.includes("describe focus")||t.includes("describe focused element")||t.includes("وصف العنصر")||t.includes("وصف العنصر المحدد")){this.describeFocusedElement();return}if(t.includes("what can i do here")||t.includes("available actions")||t.includes("ما الذي يمكنني فعله هنا")||t.includes("الإجراءات المتاحة")){this.whatCanIDoHere();return}const s=t.match(/go to action (\d+)/),a=t.match(/اذهب إلى الإجراء (\d+)/);if(s||a){const n=parseInt((s==null?void 0:s[1])||(a==null?void 0:a[1])||"0",10);if(n>0){this.goToAction(n);return}}if(t==="why"||t==="why this action"||t==="لماذا"||t==="لماذا هذا الإجراء"){this.explainActionContext();return}if(t.includes("pause")&&!t.includes("unpause")){this.pauseNarration();return}if(t.includes("resume")||t.includes("continue")||t.includes("unpause")){this.resumeNarration();return}if(t.includes("stop")&&(t.includes("reading")||t.includes("narration")||t.includes("speaking"))){this.stopNarration();return}if(t.includes("next")&&(t.includes("section")||t.includes("segment"))){this.skipToNextSegment();return}if(t.includes("repeat")||t.includes("say again")){this.repeatCurrentSegment();return}if(t.includes("faster")||t.includes("speed up")){this.narrationState.rate=Math.min(2,this.narrationState.rate+.1),this.speak(`Reading speed increased to ${Math.round(this.narrationState.rate*100)}%`,!1);return}if(t.includes("slower")||t.includes("slow down")){this.narrationState.rate=Math.max(.5,this.narrationState.rate-.1),this.speak(`Reading speed decreased to ${Math.round(this.narrationState.rate*100)}%`,!1);return}if(t.includes("go to section")||t.includes("jump to section")){const n=t.replace(/go to section|jump to section/g,"").trim();if(n&&this.narrationState.queue){const o=this.narrationState.queue.segments.find(l=>l.heading&&l.heading.toLowerCase().includes(n));if(o){const l=this.narrationState.queue.segments.indexOf(o);this.narrationState.queue.currentIndex=l,this.speakNextSegment()}else this.speak(`Section "${n}" not found`,!1)}return}if(t.includes("next action")||t.includes("next")){this.navigateToNextAction();return}if(t.includes("previous action")||t.includes("previous")||t.includes("back")){this.navigateToPreviousAction();return}if(t.includes("activate action")||t.includes("click action")||t.includes("select action")){this.activateCurrentAction();return}if(t.includes("list commands")||t.includes("help")||t.includes("what can i say")){this.speakCommands();return}this.speak('Command not recognized. Say "list commands" for help.')}speak(e,t=!0,i=!1){if(!this.synthesis)return;t&&!this.narrationState.isSpeaking&&this.synthesis.cancel();const s=new SpeechSynthesisUtterance(e);s.lang="en-US",i||this.narrationState.isSpeaking?(s.rate=this.narrationState.rate,s.pitch=this.narrationState.pitch,s.volume=this.narrationState.volume):(s.rate=1,s.pitch=1,s.volume=1),s.onerror=a=>{console.error("[RaawiX Widget] Speech synthesis error:",a)},this.synthesis.speak(s)}readPageSummary(){this.startSummaryNarration()}setupE2EMode(){window.RaawiE2E={injectTranscript:e=>{if(this.recognition&&this.e2eMode){const t={results:[{0:{transcript:e},isFinal:!0,length:1}],resultIndex:0};this.recognition.onresult&&this.recognition.onresult(t)}},getSpokenLog:()=>[...this.e2eSpokenLog],clearSpokenLog:()=>{this.e2eSpokenLog=[]}}}speakNow(e,t={}){if(this.e2eMode){this.e2eSpokenLog.push(e),console.log("[RaawiX Widget E2E] Spoke:",e);return}if(!this.synthesis)return;const{interrupt:i=!0,lang:s}=t;i&&this.synthesis.cancel();const a=new SpeechSynthesisUtterance(e);a.lang=s||this.context.voiceLang;const n=this.getBestVoice();n?(a.voice=n,n.lang!==a.lang&&(a.lang=n.lang)):console.warn(`[RaawiX Widget] No voice available for ${this.context.voiceLang}. Using system default.`),a.rate=1,a.pitch=1,a.volume=1,a.onerror=o=>{if(console.error("[RaawiX Widget] Speech synthesis error:",o),o.error==="not-allowed"||o.error==="synthesis-failed"){const l=new SpeechSynthesisUtterance(e);l.lang=this.context.voiceLang,this.synthesis&&this.synthesis.speak(l)}},this.synthesis.speak(a)}findCandidateImageElement(){const e=document.activeElement;if(e){if(e.tagName==="IMG")return e;const s=e.closest("figure");if(s){const n=s.querySelector("img");if(n)return n}const a=e.querySelector("img");if(a)return a}const i=Array.from(document.querySelectorAll("img")).filter(s=>{const a=s.getBoundingClientRect();return a.top>=0&&a.left>=0&&a.bottom<=window.innerHeight&&a.right<=window.innerWidth&&a.width>0&&a.height>0});return i.length>0?(i.sort((s,a)=>{const n=s.getBoundingClientRect(),o=a.getBoundingClientRect();return n.top-o.top}),i[0]):null}getImageDescriptionFromAssistiveMap(e){var a,n;if(!((n=(a=this.cachedPagePackage)==null?void 0:a.assistiveMap)!=null&&n.imageDescriptions))return null;const t=this.cachedPagePackage.assistiveMap.imageDescriptions,i=e.src,s=this.generateSelector(e);for(const[o,l]of Object.entries(t))if(!(!l.selector||!l.alt||!l.alt.trim())){if(this.matchesSelector(e,l.selector))return l.alt;try{const d=new URL(i,window.location.href);if(d.pathname.includes(l.selector)||d.href.includes(l.selector))return l.alt}catch{}if(s&&l.selector.includes(s))return l.alt}return null}matchesSelector(e,t){try{if(document.querySelector(t)===e||e.matches&&e.matches(t)||e instanceof HTMLImageElement&&e.src.includes(t))return!0}catch{}return!1}whatCanIDoHere(){var a,n;const e=this.getTranslations(),t=[];if((n=(a=this.cachedPagePackage)==null?void 0:a.guidance)!=null&&n.keyActions&&this.cachedPagePackage.guidance.keyActions.length>0&&this.cachedPagePackage.guidance.keyActions.slice(0,5).forEach(o=>{let l=null;if(o.selector)try{l=document.querySelector(o.selector)}catch{}let d=o.label,r=o.description||"",c;if(l){const h=this.getLabelOverride(l);h&&(d=h);const g=this.getActionIntent(l);g&&(r=g.description||r,g.contextTitle&&(c=g.contextTitle)),c||(c=this.getActionContextTitle(l,d))}else r&&(c=r);t.push({label:d,description:r,contextTitle:c,selector:o.selector,element:l})}),t.length===0){const l=(document.querySelector('main, [role="main"]')||document.body).querySelectorAll('button, a[href], [role="button"], [role="link"], input[type="submit"], input[type="button"]');Array.from(l).slice(0,5).forEach(d=>{if(!this.isElementVisible(d))return;const r=d;let c=this.getAccessibleLabel(r);const h=this.getLabelOverride(r);h&&(c=h);const g=this.getActionIntent(r),p=(g==null?void 0:g.description)||"",m=this.getActionContextTitle(r,c);c&&c.trim()&&t.push({label:c,description:p,contextTitle:m,selector:this.generateSelector(r),element:r})})}if(t.length===0){this.speakNow(e.noActionsFound,{lang:this.context.voiceLang});return}let s=t.map((o,l)=>{const d=l+1;let r=`${e.action} ${d}: `;return o.contextTitle&&o.contextTitle.trim()?this.context.locale==="ar"?r+=`${o.label} حول ${o.contextTitle}`:r+=`${o.label} about ${o.contextTitle}`:(r+=o.label,this.context.locale==="ar"?r+=". السياق غير متوفر":r+=". Context unavailable"),o.description&&o.description.trim()&&o.description!==o.contextTitle&&(r+=`. ${o.description}`),r+=".",r}).join(" ");t.length>0&&(s+=`. ${e.sayGoToAction} 1" ${e.toFocusIt}`),this.temporaryActions=t,this.speakNow(s,{lang:this.context.voiceLang})}getActionContextTitle(e,t){var n,o,l,d;const s=["learn more","read more","click here","more","details","more info","more information","see more","show more"].some(r=>t.toLowerCase().includes(r.toLowerCase())),a=this.getActionIntent(e);if(a&&a.contextTitle)return a.contextTitle;if(a&&a.description&&s)return a.description;if(s||!a){let r=e;for(;r&&r!==document.body;){const g=r.tagName.toLowerCase(),p=r.getAttribute("role"),m=r.className||"";if(g==="article"||g==="section"||g==="li"||m.includes("card")||p==="article"){const y=r.querySelector("h1, h2, h3, h4, h5, h6");if(y){const x=(n=y.textContent)==null?void 0:n.trim();if(x)return x}const f=r.getAttribute("aria-label");if(f)return f;const w=r.getAttribute("aria-labelledby");if(w){const x=document.getElementById(w);if(x){const S=(o=x.textContent)==null?void 0:o.trim();if(S)return S}}}r=r.parentElement}let c=e.previousElementSibling;for(;c;){if(c.tagName.match(/^H[1-6]$/i)){const g=(l=c.textContent)==null?void 0:l.trim();if(g)return g}c=c.previousElementSibling}let h=e.parentElement;for(;h&&h!==document.body;){let g=h.previousElementSibling;for(;g;){const p=g.querySelector("h1, h2, h3, h4, h5, h6");if(p){const m=(d=p.textContent)==null?void 0:d.trim();if(m)return m}g=g.previousElementSibling}h=h.parentElement}}}getActionIntent(e){var s,a;if(!((a=(s=this.cachedPagePackage)==null?void 0:s.assistiveMap)!=null&&a.actionIntents))return null;const t=this.cachedPagePackage.assistiveMap.actionIntents,i=this.generateSelector(e);if(t[i])return t[i];for(const[n,o]of Object.entries(t))if(o.selector&&this.matchesSelector(e,o.selector))return o;return null}goToAction(e){if(!this.temporaryActions||this.temporaryActions.length===0){const a=this.getTranslations();this.speakNow(a.noActionsFound,{lang:this.context.voiceLang});return}const t=e-1;if(t<0||t>=this.temporaryActions.length){const a=this.getTranslations();this.speakNow(`${a.action} ${e} ${a.noActionsFound}`,{lang:this.context.voiceLang});return}const i=this.temporaryActions[t];let s=null;if(i.element)s=i.element;else if(i.selector)try{s=document.querySelector(i.selector)}catch{}if(s){s.scrollIntoView({behavior:"smooth",block:"center"}),(s instanceof HTMLButtonElement||s instanceof HTMLAnchorElement||s instanceof HTMLInputElement||s.tabIndex>=0||s.getAttribute("role")==="button"||s.getAttribute("role")==="link")&&s.focus();const a=this.getTranslations(),n=i.description?`${a.action} ${e}: ${i.label}. ${i.description}`:`${a.action} ${e}: ${i.label}`;this.speakNow(n,{lang:this.context.voiceLang})}else{const a=this.getTranslations();this.speakNow(`${a.action} ${e}: ${i.label}. Element not found`,{lang:this.context.voiceLang})}}explainActionContext(){if(!this.temporaryActions||this.temporaryActions.length===0){this.context.locale==="ar"?this.speakNow('لا توجد إجراءات متاحة. قل "ماذا يمكنني أن أفعل هنا" لعرض الإجراءات.',{lang:"ar-SA"}):this.speakNow('No actions available. Say "what can I do here" to list actions.',{lang:"en-US"});return}const e=this.temporaryActions[0];e.contextTitle&&e.contextTitle.trim()?this.context.locale==="ar"?this.speakNow(`هذا الزر ينتمي إلى "${e.contextTitle}".`,{lang:"ar-SA"}):this.speakNow(`This button belongs to the "${e.contextTitle}" card.`,{lang:"en-US"}):this.context.locale==="ar"?this.speakNow("لا يوجد سياق متاح لهذا الإجراء.",{lang:"ar-SA"}):this.speakNow("No context available for this action.",{lang:"en-US"})}describeFocusedElement(){const e=this.getTranslations(),t=document.activeElement;if(!t||t===document.body||t===document.documentElement||t.tagName==="BODY"||t.tagName==="HTML"){this.speakNow(e.noFocusedElement,{lang:this.context.voiceLang});return}const i=t.tagName.toLowerCase(),s=t.getAttribute("role")||"";let a="";if(i==="button"||s==="button")a=e.button;else if(i==="a"||s==="link")a=e.link;else if(i==="input"){const r=t.type||"text";r==="checkbox"?a=e.checkbox:r==="radio"?a=e.radio:a=e.editField}else i==="textarea"||i==="select"?a=e.editField:s==="menuitem"||s==="menu"||i==="menu"?a=e.menu:a=i;let n=this.getAccessibleLabel(t),o="";n&&n.trim()?o=`${a}, ${n}`:o=`${a}, ${e.unlabeled}`;const l=[];if(i==="input"){const r=t;(r.type==="checkbox"||r.type==="radio")&&(r.checked?l.push(e.checked):l.push(e.unchecked))}const d=t.getAttribute("aria-expanded");if(d==="true"?l.push(e.expanded):d==="false"&&l.push(e.collapsed),(t.hasAttribute("disabled")||t.getAttribute("aria-disabled")==="true")&&l.push(e.disabled),i==="input"||i==="textarea"||i==="select"){const r=t;(r.hasAttribute("required")||r.getAttribute("aria-required")==="true")&&l.push(e.required)}if(i==="input"||i==="textarea"||i==="select"){const r=t;(r.getAttribute("aria-invalid")==="true"||r.validity&&!r.validity.valid)&&l.push(e.invalid)}l.length>0&&(o+=`, ${l.join(", ")}`),this.speakNow(o,{lang:this.context.voiceLang})}describeImage(){const e=this.getTranslations(),t=this.findCandidateImageElement();if(!t){this.speakNow(e.noImageFound,{lang:this.context.voiceLang});return}let i=this.getImageDescriptionFromAssistiveMap(t);if(!i){const s=t.getAttribute("alt");s!==null?s.trim()===""?i=e.decorativeImage:i=s:i=e.imageWithoutDescription}this.speakNow(i,{lang:this.context.voiceLang})}getPageDescription(){var i;const e=document.querySelector('meta[name="description"]');if(e)return e.getAttribute("content")||"";const t=document.querySelector("main");if(t){const s=t.querySelector("p");if(s)return((i=s.textContent)==null?void 0:i.substring(0,200))||""}return"No description available"}readLandmarks(){const e=[];document.querySelector('nav, [role="navigation"]')&&e.push("Navigation"),document.querySelector('main, [role="main"]')&&e.push("Main content"),document.querySelector('aside, [role="complementary"]')&&e.push("Sidebar"),document.querySelector('footer, [role="contentinfo"]')&&e.push("Footer"),e.length>0?this.speak(`Landmarks found: ${e.join(", ")}`):this.speak("No landmarks found on this page")}collectActions(){this.availableActions=[],this.currentActionIndex=-1,document.querySelectorAll('button:not([disabled]), a[href], input[type="submit"], input[type="button"], [role="button"]:not([disabled]), [tabindex]:not([tabindex="-1"])').forEach(t=>{const i=t;if(!i.offsetParent)return;const s=this.getAccessibleLabel(i);if(s&&s.trim().length>0){const a=this.getActionDescription(i);this.availableActions.push({label:s,description:a,element:i})}}),console.log("[RaawiX Widget] Collected actions:",this.availableActions.length)}getAccessibleLabel(e){var o,l,d;const t=this.getLabelOverride(e);if(t)return t;const i=e.getAttribute("aria-label");if(i)return i;const s=e.getAttribute("aria-labelledby");if(s){const r=document.getElementById(s);if(r)return((o=r.textContent)==null?void 0:o.trim())||""}if(e.id){const r=document.querySelector(`label[for="${e.id}"]`);if(r)return((l=r.textContent)==null?void 0:l.trim())||""}const a=(d=e.textContent)==null?void 0:d.trim();if(a&&a.length>0&&a.length<100)return a;const n=e.getAttribute("title");if(n)return n;if(e.tagName.toLowerCase()==="img"){const r=this.getImageDescription(e);if(r)return r}return""}getActionDescription(e){var a,n;const t=this.getLabelOverride(e);if(t)return t;const i=e.getAttribute("aria-describedby");if(i){const o=document.getElementById(i);if(o)return((a=o.textContent)==null?void 0:a.trim())||""}const s=e.parentElement;if(s){const o=(n=s.textContent)==null?void 0:n.trim();if(o&&o.length<200)return o}return""}getLabelOverride(e){var a;if(!((a=this.cachedPagePackage)!=null&&a.assistiveMap))return null;const t=this.cachedPagePackage.assistiveMap.labelOverrides,i=this.cachedPagePackage.assistiveMap.actionIntents,s=this.generateSelector(e);if(t[s])return t[s].label;for(const[n,o]of Object.entries(t))if(o.selector&&this.matchesSelector(e,o.selector))return o.label;if(i[s])return i[s].intent;for(const[n,o]of Object.entries(i))if(o.selector&&this.matchesSelector(e,o.selector))return o.intent;return null}getImageDescription(e){var s;if(!((s=this.cachedPagePackage)!=null&&s.assistiveMap))return null;const t=this.generateSelector(e),i=this.cachedPagePackage.assistiveMap.imageDescriptions[t];return i?i.alt:null}generateSelector(e){if(e.id)return`#${e.id}`;const t=e.getAttribute("data-testid");if(t)return`[data-testid="${t}"]`;const i=Array.from(e.classList).filter(n=>n.length>0);if(i.length>0)return`.${i.join(".")}`;const s=e.tagName.toLowerCase(),a=e.parentElement;if(a){const n=Array.from(a.children).filter(l=>l.tagName===e.tagName),o=n.indexOf(e);if(o>=0&&n.length>1)return`${s}:nth-of-type(${o+1})`}return s}readActions(){if(this.collectActions(),this.availableActions.length===0){this.speak("No actions found on this page");return}const e=this.availableActions.map((t,i)=>`${i+1}. ${t.label}`).join(". ");this.speak(`Found ${this.availableActions.length} actions: ${e}. Say "next action" to navigate.`),this.currentActionIndex=0,this.highlightCurrentAction()}navigateToNextAction(){if(this.availableActions.length===0&&this.collectActions(),this.availableActions.length===0){this.speak("No actions available");return}this.currentActionIndex=(this.currentActionIndex+1)%this.availableActions.length,this.highlightCurrentAction(),this.readCurrentAction()}navigateToPreviousAction(){if(this.availableActions.length===0&&this.collectActions(),this.availableActions.length===0){this.speak("No actions available");return}this.currentActionIndex=this.currentActionIndex<=0?this.availableActions.length-1:this.currentActionIndex-1,this.highlightCurrentAction(),this.readCurrentAction()}highlightCurrentAction(){if(document.querySelectorAll(".raawi-voice-highlighted").forEach(e=>{e.classList.remove("raawi-voice-highlighted"),e.style.outline="",e.style.outlineOffset=""}),this.currentActionIndex>=0&&this.currentActionIndex<this.availableActions.length){const e=this.availableActions[this.currentActionIndex];e.element&&(e.element.classList.add("raawi-voice-highlighted"),e.element.style.outline="4px solid #ff0000",e.element.style.outlineOffset="2px",e.element.scrollIntoView({behavior:"smooth",block:"center"}))}}readCurrentAction(){if(this.currentActionIndex>=0&&this.currentActionIndex<this.availableActions.length){const e=this.availableActions[this.currentActionIndex],t=e.description?`Action ${this.currentActionIndex+1}: ${e.label}. ${e.description}`:`Action ${this.currentActionIndex+1}: ${e.label}`;this.speak(t)}}activateCurrentAction(){if(this.currentActionIndex>=0&&this.currentActionIndex<this.availableActions.length){const e=this.availableActions[this.currentActionIndex];e.element&&(e.element.click(),this.speak(`Activated: ${e.label}`))}else this.speak('No action selected. Say "read actions" to list available actions.')}async readIssues(){const e=await this.fetchIssuesAsync();if(e&&e.issues&&e.issues.length>0){const n=e.issues.length,o=e.issues.slice(0,5).map(l=>{const d=l.severity==="critical"?"critical":l.severity==="important"?"important":"minor";return`${l.title} (${d})`}).join(". ");this.speak(`Found ${n} known issues on this page. For example: ${o}.`);return}const t=[],i=document.querySelectorAll("img:not([alt])");i.length>0&&t.push(`${i.length} images without alt text`);const s=document.querySelectorAll('button, [role="button"]');let a=0;s.forEach(n=>{const o=n,l=o.textContent&&o.textContent.trim().length>0,d=o.getAttribute("aria-label"),r=o.getAttribute("aria-labelledby");!l&&!d&&!r&&a++}),a>0&&t.push(`${a} buttons without labels`),t.length>0?this.speak(`Found ${t.length} potential issues: ${t.join(". ")}`):this.speak("No obvious accessibility issues detected on this page")}detectForms(){this.formSnapshot=this.buildFormSnapshot(),this.updateFormAssistantUI()}setupRouteChangeObserver(){let e=null;const t=()=>{e&&clearTimeout(e),e=window.setTimeout(()=>{this.detectForms()},500)};let i=location.href;const s=()=>{const a=location.href;a!==i&&(i=a,setTimeout(()=>{this.detectForms()},500))};this.routeChangeObserver&&this.routeChangeObserver.disconnect(),this.routeChangeObserver=new MutationObserver(t),this.routeChangeObserver.observe(document.body,{childList:!0,subtree:!0,attributes:!1}),setInterval(s,1e3),window.addEventListener("popstate",()=>{setTimeout(()=>{this.detectForms()},500)}),this.formObserver&&this.formObserver.disconnect(),this.formObserver=new MutationObserver(a=>{let n=!1;a.forEach(o=>{o.addedNodes.forEach(l=>{if(l.nodeType===Node.ELEMENT_NODE){const d=l;(d.tagName==="FORM"||d.querySelector("form")||d.querySelectorAll("input, textarea, select").length>=3)&&(n=!0)}})}),n&&this.detectForms()}),this.formObserver.observe(document.body,{childList:!0,subtree:!0})}buildFormSnapshot(){var i,s,a,n;if((s=(i=this.cachedPagePackage)==null?void 0:i.assistiveMap)!=null&&s.forms&&Array.isArray(this.cachedPagePackage.assistiveMap.forms)&&this.cachedPagePackage.assistiveMap.forms.length>0)try{const o=this.buildFormSnapshotFromAssistiveMap();if(o&&(o.fields.length>0||o.uploads.length>0))return console.log("[Form Assistant] Using scan-generated form plan",{formsCount:this.cachedPagePackage.assistiveMap.forms.length,fieldsCount:o.fields.length,uploadsCount:o.uploads.length}),o}catch(o){console.warn("[Form Assistant] Failed to build snapshot from assistiveMap.forms, falling back to DOM",o)}if((n=(a=this.cachedPagePackage)==null?void 0:a.guidance)!=null&&n.formSteps&&this.cachedPagePackage.guidance.formSteps.length>0)return this.buildFormSnapshotFromGuidance();const e=document.querySelectorAll("form");if(e.length>0)return this.buildFormSnapshotFromForm(e[0]);const t=this.findFormLikeContainer();return t?this.buildFormSnapshotFromContainer(t):null}buildFormSnapshotFromGuidance(){var l,d;if(!((d=(l=this.cachedPagePackage)==null?void 0:l.guidance)!=null&&d.formSteps))return null;const e=this.cachedPagePackage.guidance.formSteps,t=[],i=[],s=[];e.forEach(r=>{r.fields.forEach(c=>{if(c.type==="file"){const h=this.findInputByLabel(c.label||"");h&&h.type==="file"&&i.push({selector:this.generateSelector(h),label:c.label||"File upload",context:r.label||"",element:h})}else{const h=this.findInputByLabel(c.label||"");h&&t.push({selector:this.generateSelector(h),inputType:c.type||h.type||"text",required:c.required||!1,currentValueEmpty:!h.value,label:c.label||this.getAccessibleName(h),element:h})}})}),document.querySelectorAll('button[type="submit"], input[type="submit"], [role="button"][aria-label*="submit" i]').forEach(r=>{s.push({selector:this.generateSelector(r),label:this.getAccessibleName(r),element:r})});const n=t.filter(r=>r.required),o=n.filter(r=>r.currentValueEmpty);return{formElement:null,fields:t,uploads:i,submitButtons:s,totalRequiredFields:n.length,totalRequiredFieldsRemaining:o.length,totalUploads:i.length}}buildFormSnapshotFromAssistiveMap(){var o,l;if(!((l=(o=this.cachedPagePackage)==null?void 0:o.assistiveMap)!=null&&l.forms)||!Array.isArray(this.cachedPagePackage.assistiveMap.forms)||this.cachedPagePackage.assistiveMap.forms.length===0)return null;const e=this.cachedPagePackage.assistiveMap.forms,t=[],i=[],s=[];for(const d of e){for(const r of d.fields||[])try{let c=document.querySelector(r.selector);if(c||(console.warn("[Form Assistant] Selector not found, trying fallback matching",{selector:r.selector,label:r.label}),c=this.findFieldByFallback(r)),c){const h=this.getBilingualLabel(r.label),g=r.hint?this.getBilingualLabel(r.hint):void 0;t.push({selector:r.selector,inputType:r.inputType||"text",required:r.required,currentValueEmpty:!this.getFieldValue(c),label:h,element:c,hint:g,stepTitle:d.stepTitle?this.getBilingualLabel(d.stepTitle):void 0,stepIndex:d.stepIndex})}else console.warn("[Form Assistant] Field element not found, skipping",{selector:r.selector,label:r.label})}catch(c){console.warn("[Form Assistant] Error processing field from scan plan",{selector:r.selector,error:c instanceof Error?c.message:"Unknown error"})}for(const r of d.uploads||[])try{let c=document.querySelector(r.selector);if(!c){const h=this.getBilingualLabel(r.label);c=this.findFileInputByLabel(h)}if(c&&c.type==="file"){const h=this.getBilingualLabel(r.label),g=r.hint?this.getBilingualLabel(r.hint):void 0;i.push({selector:r.selector,label:h,context:g||d.stepTitle?this.getBilingualLabel(d.stepTitle):"",element:c,acceptedTypes:r.acceptedTypes,hint:g})}}catch(c){console.warn("[Form Assistant] Error processing upload from scan plan",{selector:r.selector,error:c instanceof Error?c.message:"Unknown error"})}for(const r of d.actions||[])try{let c=document.querySelector(r.selector);if(!c){const h=this.getBilingualLabel(r.label);c=this.findButtonByLabel(h,r.type)}if(c){const h=this.getBilingualLabel(r.label),g=r.intent?this.getBilingualLabel(r.intent):void 0;s.push({selector:r.selector,label:h,element:c,actionType:r.type,intent:g})}}catch(c){console.warn("[Form Assistant] Error processing action from scan plan",{selector:r.selector,error:c instanceof Error?c.message:"Unknown error"})}}const a=t.filter(d=>d.required),n=a.filter(d=>d.currentValueEmpty);return{formElement:null,fields:t,uploads:i,submitButtons:s,totalRequiredFields:a.length,totalRequiredFieldsRemaining:n.length,totalUploads:i.length,formPlans:e}}findFieldByFallback(e){const t=this.getBilingualLabel(e.label),i=document.querySelectorAll(`${e.tag}[type="${e.inputType||"text"}"]`);for(const s of Array.from(i)){const a=this.getFieldLabel(s);if(a.toLowerCase().includes(t.toLowerCase())||t.toLowerCase().includes(a.toLowerCase()))return s}return this.findInputByLabel(t)}findFileInputByLabel(e){const t=document.querySelectorAll('input[type="file"]');for(const i of Array.from(t)){const s=this.getFieldLabel(i);if(s.toLowerCase().includes(e.toLowerCase())||e.toLowerCase().includes(s.toLowerCase()))return i}return null}findButtonByLabel(e,t){const i=document.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]');for(const s of Array.from(i)){const a=this.getAccessibleName(s),n=s.type||"";if((a.toLowerCase().includes(e.toLowerCase())||e.toLowerCase().includes(a.toLowerCase()))&&(t!=="submit"||n==="submit"))return s}return null}getBilingualLabel(e){return e?typeof e=="string"?e:this.context.locale==="ar"&&e.ar?e.ar:this.context.locale==="en"&&e.en||e.en?e.en:e.ar?e.ar:"":""}buildFormSnapshotFromForm(e){const t=[],i=[],s=[];e.querySelectorAll("input, textarea, select").forEach(r=>{const c=r,h=c.type||c.tagName.toLowerCase();if(h==="file"){const g=this.getFieldLabel(c);i.push({selector:this.generateSelector(c),label:g,context:this.getFieldContext(c),element:c})}else if(h!=="submit"&&h!=="button"&&h!=="hidden"&&h!=="reset"){const g=c.hasAttribute("required")||c.getAttribute("aria-required")==="true",p=this.getFieldLabel(c);t.push({selector:this.generateSelector(c),inputType:h,required:g,currentValueEmpty:!this.getFieldValue(c),label:p,element:c})}}),e.querySelectorAll('button[type="submit"], input[type="submit"]').forEach(r=>{s.push({selector:this.generateSelector(r),label:this.getAccessibleName(r),element:r})}),this.findNearbySubmitButtons(e).forEach(r=>{s.find(c=>c.element===r)||s.push({selector:this.generateSelector(r),label:this.getAccessibleName(r),element:r})});const l=t.filter(r=>r.required),d=l.filter(r=>r.currentValueEmpty);return{formElement:e,fields:t,uploads:i,submitButtons:s,totalRequiredFields:l.length,totalRequiredFieldsRemaining:d.length,totalUploads:i.length}}buildFormSnapshotFromContainer(e){const t=[],i=[],s=[];e.querySelectorAll("input, textarea, select").forEach(d=>{const r=d,c=r.type||r.tagName.toLowerCase();if(c==="file"){const h=this.getFieldLabel(r);i.push({selector:this.generateSelector(r),label:h,context:this.getFieldContext(r),element:r})}else if(c!=="submit"&&c!=="button"&&c!=="hidden"&&c!=="reset"){const h=r.hasAttribute("required")||r.getAttribute("aria-required")==="true",g=this.getFieldLabel(r);t.push({selector:this.generateSelector(r),inputType:c,required:h,currentValueEmpty:!this.getFieldValue(r),label:g,element:r})}}),e.querySelectorAll('button[type="submit"], input[type="submit"], button.primary, button[class*="submit"], button[class*="cta"]').forEach(d=>{s.push({selector:this.generateSelector(d),label:this.getAccessibleName(d),element:d})});const o=t.filter(d=>d.required),l=o.filter(d=>d.currentValueEmpty);return{formElement:null,fields:t,uploads:i,submitButtons:s,totalRequiredFields:o.length,totalRequiredFieldsRemaining:l.length,totalUploads:i.length}}findFormLikeContainer(){const e=document.querySelectorAll('div, section, article, main, [role="form"], [role="application"]');for(const t of Array.from(e))if(t.querySelectorAll("input, textarea, select").length>=3&&!t.closest("form"))return t;return null}getFieldLabel(e){const t=this.getLabelOverride(e);return t||this.getAccessibleName(e)}getAccessibleName(e){const t=e.getAttribute("aria-label");if(t&&t.trim())return t.trim();const i=e.getAttribute("aria-labelledby");if(i){const o=document.getElementById(i);if(o&&o.textContent)return o.textContent.trim()}if(e.id){const o=document.querySelector(`label[for="${e.id}"]`);if(o&&o.textContent)return o.textContent.trim()}const s=e.closest("label");if(s&&s.textContent)return s.textContent.trim();if(e instanceof HTMLInputElement&&e.placeholder)return e.placeholder;const a=e.tagName.toLowerCase(),n=e.type||"";return a==="input"&&n?`${n} input`:a==="textarea"?"Text area":a==="select"?"Select":"Unlabeled field"}getFieldValue(e){return e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement?e.value||"":e instanceof HTMLSelectElement&&e.value||""}getFieldContext(e){let t=e.parentElement;for(;t&&t!==document.body;){const s=t.querySelector("h1, h2, h3, h4, h5, h6");if(s&&s.textContent)return s.textContent.trim();t=t.parentElement}const i=e.closest('[role="group"], [role="region"], .form-group, .field-group');if(i){const s=i.querySelector('label, .label, [class*="label"]');if(s&&s.textContent)return s.textContent.trim()}return""}findInputByLabel(e){const t=Array.from(document.querySelectorAll("label"));for(const s of t)if(s.textContent&&s.textContent.trim().toLowerCase()===e.toLowerCase()){const a=s.getAttribute("for");if(a){const o=document.getElementById(a);if(o)return o}const n=s.querySelector("input, textarea, select");if(n)return n}const i=document.querySelectorAll("input, textarea, select");for(const s of Array.from(i)){const a=s.getAttribute("aria-label");if(a&&a.toLowerCase().includes(e.toLowerCase()))return s}return null}findNearbySubmitButtons(e){const t=[];let i=e.nextElementSibling;if(i){const a=i.querySelector('button[type="submit"], button.primary, button[class*="submit"]');a&&t.push(a)}const s=e.parentElement;if(s){let a=s.nextElementSibling;if(a){const n=a.querySelector('button[type="submit"], button.primary, button[class*="submit"]');n&&t.push(n)}}return t}updateLoginAssistUI(){var s,a,n;const e=(s=this.panel)==null?void 0:s.querySelector("#raawi-login-assist-section"),t=(a=this.panel)==null?void 0:a.querySelector("#raawi-auth-banner"),i=(n=this.panel)==null?void 0:n.querySelector("#raawi-login-assist-start");!e||!t||!i||(this.authFlowDetection&&this.authFlowDetection.isAuthFlow?(e.style.display="block",t.style.display="flex",i.disabled=!1):(e.style.display="none",t.style.display="none"))}updateFormAssistantUI(){var a,n,o;const e=(a=this.panel)==null?void 0:a.querySelector("#raawi-form-assistant-section"),t=(n=this.panel)==null?void 0:n.querySelector("#raawi-form-assistant-start"),i=(o=this.panel)==null?void 0:o.querySelector("#raawi-form-assistant-no-form-message");if(!e||!t||!i)return;const s=this.formSnapshot&&(this.formSnapshot.fields.length>0||this.formSnapshot.uploads.length>0);e.style.display="block",s?(t.disabled=!1,i.style.display="none",e.classList.remove("raawi-tool-card-disabled")):(t.disabled=!0,i.style.display="block",e.classList.add("raawi-tool-card-disabled"))}getArabicStartScript(){return"هلا، أنا مساعد النماذج من راوي. بعطيك خطوة خطوة لين تخلص. تقدر تقول: التالي، كرر، تخطي، مراجعة، إيقاف. ملاحظة: ما راح أرسل أي شيء بدون تأكيدك."}getArabicFieldPrompt(e,t,i){let a=`الحقل: ${e}. ${t?"مطلوب":"اختياري"}. املِ علي القيمة.`;return i&&(a+=` ملاحظة: هذا الحقل لازم يكون ${i}.`),a}getArabicNormalConfirmation(e){return`سمعت: ${e}. صحيح؟`}getArabicDoubleConfirmationFirst(e){return`هذا حقل حساس. بأكررها عليك مرتين للتأكد. المرة الأولى: ${e}. صحيح؟`}getArabicDoubleConfirmationSecond(e){return`المرة الثانية للتأكيد: ${e}. تأكد إنها صحيحة؟`}getArabicDoubleConfirmationSuccess(){return"تم إدخالها بنجاح."}getArabicUploadPrompt(e){return`الحين نحتاج نرفع مرفق: ${e}. بفتح لك نافذة اختيار الملفات. اختر الملف وبعدين علمني إذا جاهز.`}getArabicUploadSelected(e){return`تم اختيار الملف: ${e}. تبي نكمل؟`}getArabicReviewPrompt(e){return`مراجعة سريعة قبل الإرسال: ${e}. تنبيه: الإرسال خطوة نهائية. تقول: تأكيد الإرسال.`}getArabicSubmitConfirm(){return"تمام. بأضغط إرسال الآن."}requiresDoubleConfirmation(e){const t=this.getBilingualLabel(e.label).toLowerCase();(e.inputType||"").toLowerCase();const i=e.hint?this.getBilingualLabel(e.hint).toLowerCase():"",s=["هوية","إقامة","iqama","national id","رقم الهوية","رقم الإقامة","جوال","mobile","رقم الجوال","رقم الهاتف","بريد","email","البريد الإلكتروني","iban","رقم الحساب","account number","صك","رخصة","سجل","معاملة","رقم","مبلغ","amount","قيمة","تاريخ الميلاد","date of birth","dob"];for(const n of s)if(t.includes(n)||i.includes(n))return!0;const a=["الاسم الكامل","full name","لوحة","plate","chassis","سجل تجاري","commercial registration","establishment"];for(const n of a)if((t.includes(n)||i.includes(n))&&(t.includes("مطابقة")||t.includes("matching")||i.includes("مطابقة")))return!0;return!1}isPasswordField(e){return(e.inputType||"").toLowerCase()==="password"||this.getBilingualLabel(e.label).toLowerCase().includes("كلمة المرور")||this.getBilingualLabel(e.label).toLowerCase().includes("password")}detectAuthFlow(){var p;const e=window.location.href.toLowerCase(),t=((p=document.body.textContent)==null?void 0:p.toLowerCase())||"";let i=!1,s="unknown",a="low";const o=[/login|signin|auth|sso|nafath|نفاذ|تسجيل|دخول/i].some(m=>m.test(e)),l={en:["login","sign in","username","password","authenticate","sso","single sign on"],ar:["تسجيل الدخول","دخول","اسم المستخدم","كلمة المرور","نفاذ","تأكيد الهوية"]},d=l.en.some(m=>t.includes(m))||l.ar.some(m=>t.includes(m)),r=document.querySelectorAll('input[type="password"], input[name*="password"], input[id*="password"], input[name*="username"], input[id*="username"], input[name*="user"], input[id*="user"]').length>0,c=document.querySelectorAll('button:contains("login"), button:contains("sign in"), button:contains("تسجيل"), button:contains("دخول")').length>0||Array.from(document.querySelectorAll('button, [role="button"]')).some(m=>{var f;const y=((f=m.textContent)==null?void 0:f.toLowerCase())||"";return l.en.some(w=>y.includes(w))||l.ar.some(w=>y.includes(w))}),h=/نفاذ|nafath/i.test(t)||/نفاذ|nafath/i.test(e),g=document.querySelectorAll('img[src*="nafath"], img[alt*="نفاذ"], [class*="nafath"], [id*="nafath"]').length>0;return h||g?(i=!0,s="nafath",a=g?"high":"medium"):o&&r&&c?(i=!0,s=o&&/sso|single.sign.on/i.test(e)?"sso":"login",a="high"):r&&c?(i=!0,s="login",a="medium"):(o||d)&&(i=!0,s="login",a="low"),{isAuthFlow:i,authType:s,confidence:a}}detectNajizMode(){var e;return this.authFlowDetection||(this.authFlowDetection=this.detectAuthFlow()),((e=this.authFlowDetection)==null?void 0:e.isAuthFlow)||!1}getArabicNajizDetectionPrompt(){return"واضح إن هذي صفحة تسجيل دخول عبر النفاذ الوطني. أنا بساعدك بالتنقل، لكن أنت اللي تأكد الهوية بنفسك."}startLoginAssist(){var i,s,a,n;if(!this.authFlowDetection||!this.authFlowDetection.isAuthFlow)return;this.loginAssistActive=!0,this.najizMode=!0,console.log("[RaawiX Widget] Login Assist started",{authType:(i=this.authFlowDetection)==null?void 0:i.authType,confidence:(s=this.authFlowDetection)==null?void 0:s.confidence,locale:this.context.locale}),this.context.locale==="ar"?this.speakNow("واضح إن هذي صفحة تسجيل دخول عبر النفاذ الوطني. أنا بساعدك بالتنقل وشرح الخطوات، لكن أنت اللي تأكد الهوية بنفسك.",{lang:"ar-SA"}):this.speakNow("This looks like a government login/SSO flow. I can guide navigation and steps, but you must confirm identity yourself.",{lang:"en-US"});const e=(a=this.panel)==null?void 0:a.querySelector("#raawi-login-assist-start"),t=(n=this.panel)==null?void 0:n.querySelector("#raawi-login-assist-stop");e&&(e.style.display="none"),t&&(t.style.display="block"),this.guideLoginSteps(),this.monitorForSuccessfulLogin()}stopLoginAssist(){var i,s;this.loginAssistActive=!1,this.najizMode=!1,console.log("[RaawiX Widget] Login Assist stopped");const e=(i=this.panel)==null?void 0:i.querySelector("#raawi-login-assist-start"),t=(s=this.panel)==null?void 0:s.querySelector("#raawi-login-assist-stop");e&&(e.style.display="block"),t&&(t.style.display="none")}guideLoginSteps(){const e=this.findLoginButtons();if(e.length>0){const s=e[0],a=this.context.locale==="ar"?"لقيت زر تسجيل الدخول. تبي أروح له؟":"I found the login button. Do you want me to focus it?";this.speakNow(a,{lang:this.context.voiceLang}),this.pendingLoginButton=s}this.detectNafathApprovalText()&&setTimeout(()=>{const s=this.context.locale==="ar"?"الحين راح يوصلك طلب موافقة في تطبيق نفاذ. وافق من الجوال، وبعدها قل: تم.":"You will receive an approval request in the Nafath app. Approve from your phone, then say: done.";this.speakNow(s,{lang:this.context.voiceLang})},2e3),this.detectOTPInputs().length>0&&setTimeout(()=>{const s=this.context.locale==="ar"?"أشوف خانات رمز التحقق. املِ علي الرمز رقم رقم.":"I see verification code fields. Tell me the code digit by digit.";this.speakNow(s,{lang:this.context.voiceLang})},2e3)}findLoginButtons(){const e=Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]')),t=["تسجيل الدخول","login","sign in","دخول","تأكيد"];return e.filter(i=>{var n,o;const s=((n=i.textContent)==null?void 0:n.toLowerCase())||"",a=((o=i.getAttribute("aria-label"))==null?void 0:o.toLowerCase())||"";return t.some(l=>s.includes(l.toLowerCase())||a.includes(l.toLowerCase()))})}detectNafathApprovalText(){var i;const e=((i=document.body.textContent)==null?void 0:i.toLowerCase())||"";return["نفاذ","nafath","موافقة","approval","تطبيق","app"].some(s=>e.includes(s))}detectOTPInputs(){return Array.from(document.querySelectorAll('input[type="text"], input[type="number"]')).filter(t=>{var o,l,d;const i=((o=t.name)==null?void 0:o.toLowerCase())||"",s=((l=t.id)==null?void 0:l.toLowerCase())||"",a=((d=t.placeholder)==null?void 0:d.toLowerCase())||"",n=t.maxLength;return(i.includes("otp")||i.includes("code")||i.includes("رمز")||s.includes("otp")||s.includes("code")||s.includes("رمز")||a.includes("code")||a.includes("رمز"))&&(n===1||n===6||n===4)})}handleNajizLoginAssist(){this.startLoginAssist()}monitorNafathVerification(){const e=setInterval(()=>{if(!this.najizMode||!this.formAssistantActive){clearInterval(e);return}const t=document.body.innerText.toLowerCase();if(t.includes("نفاذ")||t.includes("nafath")||t.includes("تطبيق")||t.includes("app")){const i=this.context.locale==="ar"?"الآن وافق على الهوية في تطبيق النفاذ الوطني على جوالك.":"Now approve the identity in the Nafath app on your phone.";this.speakNow(i,{lang:this.context.voiceLang}),clearInterval(e)}},2e3);setTimeout(()=>{clearInterval(e)},6e4)}monitorForSuccessfulLogin(){const e=setInterval(()=>{if(!this.loginAssistActive&&!this.najizMode){clearInterval(e);return}if(this.detectSuccessfulLogin()){clearInterval(e),this.najizMode=!1;const t=this.context.locale==="ar"?"تم تسجيل الدخول. تبي نروح للخدمة؟":"Login appears successful. Want to proceed to the service?";this.speakNow(t,{lang:this.context.voiceLang}),this.detectForms(),setTimeout(()=>{if(this.formSnapshot&&(this.formSnapshot.fields.length>0||this.formSnapshot.uploads.length>0)){const i=this.context.locale==="ar"?"الآن تقدر تستخدم مساعد تعبئة النماذج.":"You can use Form Assistant now.";this.speakNow(i,{lang:this.context.voiceLang})}},2e3),this.stopLoginAssist()}},2e3);setTimeout(()=>{clearInterval(e)},3e5)}detectSuccessfulLogin(){var o,l;const e=((o=document.body.textContent)==null?void 0:o.toLowerCase())||"",i=["حسابي","لوحة التحكم","profile","dashboard","account","مرحباً","welcome","مرحبا بك"].some(d=>e.includes(d)),a=this.findLoginButtons().length===0&&((l=this.authFlowDetection)==null?void 0:l.isAuthFlow),n=Array.from(document.querySelectorAll("button, a")).filter(d=>{var c;const r=((c=d.textContent)==null?void 0:c.toLowerCase())||"";return r.includes("تسجيل خروج")||r.includes("logout")||r.includes("خروج")});return i||a||n.length>0}startFormAssistant(){var a,n,o,l;if(!this.formSnapshot){const d=this.getTranslations();this.speakNow(d.formAssistantNoForm,{lang:this.context.voiceLang});return}this.najizMode=this.detectNajizMode(),this.najizMode&&this.context.locale==="ar"&&this.speakNow(this.getArabicNajizDetectionPrompt(),{lang:"ar-SA"}),this.formAssistantActive=!0,this.formAssistantState="form_detected",this.currentFieldIndex=-1,this.pendingConfirmation=null,this.lastSpokenValue="";const e=(a=this.panel)==null?void 0:a.querySelector("#raawi-form-assistant-start"),t=(n=this.panel)==null?void 0:n.querySelector("#raawi-form-assistant-stop"),i=(o=this.panel)==null?void 0:o.querySelector("#raawi-form-assistant-upload"),s=(l=this.panel)==null?void 0:l.querySelector("#raawi-form-assistant-active-badge");if(e&&(e.style.display="none"),t&&(t.style.display="block"),i&&(i.style.display="none"),s&&(s.style.display="inline-block"),this.najizMode){this.handleNajizLoginAssist(),this.monitorForSuccessfulLogin();return}this.speakFormAssistantOnboarding(),this.moveToNextRequiredField()}stopFormAssistant(){var n,o,l,d,r;this.formAssistantActive=!1,this.formAssistantState="stopped",this.currentFieldIndex=-1,this.najizMode=!1,this.pendingConfirmation=null,this.lastSpokenValue="";const e=(n=this.panel)==null?void 0:n.querySelector("#raawi-form-assistant-start"),t=(o=this.panel)==null?void 0:o.querySelector("#raawi-form-assistant-stop"),i=(l=this.panel)==null?void 0:l.querySelector("#raawi-form-assistant-upload"),s=(d=this.panel)==null?void 0:d.querySelector("#raawi-form-assistant-status"),a=(r=this.panel)==null?void 0:r.querySelector("#raawi-form-assistant-active-badge");e&&(e.style.display="block"),t&&(t.style.display="none"),i&&(i.style.display="none"),s&&(s.textContent=""),a&&(a.style.display="none"),this.pendingFileUpload=null,document.activeElement&&document.activeElement!==document.body&&document.activeElement.blur()}speakFormAssistantOnboarding(){if(!this.formSnapshot)return;const e=this.getTranslations(),t=this.formSnapshot.totalRequiredFieldsRemaining,i=this.formSnapshot.totalUploads;let s;if(this.context.locale==="ar"){s=this.getArabicStartScript();const a=e.formAssistantSummary.replace("{required}",t.toString()).replace("{uploads}",i.toString());s+=" "+a}else s=e.formAssistantSummary.replace("{required}",t.toString()).replace("{uploads}",i.toString()),s+=" Note: I will not submit anything without your confirmation.";this.speakNow(s,{lang:this.context.voiceLang})}speakFormSummary(){if(!this.formSnapshot)return;const e=this.getTranslations(),t=this.formSnapshot.totalRequiredFieldsRemaining,i=this.formSnapshot.totalUploads;let s;if(this.context.locale==="ar"){s=this.getArabicStartScript();const a=e.formAssistantSummary.replace("{required}",t.toString()).replace("{uploads}",i.toString());s+=" "+a}else s=e.formAssistantSummary.replace("{required}",t.toString()).replace("{uploads}",i.toString()),s+=" Note: I will not submit anything without your confirmation.";this.speakNow(s,{lang:this.context.voiceLang})}moveToNextRequiredField(){if(!this.formSnapshot)return;const e=this.formSnapshot.fields.filter(i=>i.required&&i.currentValueEmpty);if(e.length===0){this.formSnapshot.uploads.length>0?this.handleNextUpload(0):this.speakFormComplete();return}this.currentFieldIndex++,this.currentFieldIndex>=e.length&&(this.currentFieldIndex=0);const t=e[this.currentFieldIndex];this.focusField(t)}focusField(e){if(!e.element)try{e.element=document.querySelector(e.selector)}catch{}if(!e.element){const l=this.getTranslations();this.speakNow(`${l.formAssistantFieldLabel.replace("{label}",this.getBilingualLabel(e.label))}. Element not found.`,{lang:this.context.voiceLang});return}if(this.updateFormAssistantStatus(),this.formAssistantState="collecting_field_value",e.element.scrollIntoView({behavior:"smooth",block:"center"}),this.isPasswordField(e)){const l=this.context.locale==="ar"?"ادخل كلمة المرور الآن يدويًا، وإذا خلصت قل تم.":'Please enter your password manually now. When done, say "done".';this.speakNow(l,{lang:this.context.voiceLang});return}const t=this.getTranslations(),i=this.getBilingualLabel(e.label),s=e.required?t.formAssistantFieldRequired:t.formAssistantFieldOptional;let a="";e.stepTitle?a=`${this.getBilingualLabel(e.stepTitle)}. `:e.stepIndex!==void 0&&(a=`${t.step||"Step"} ${e.stepIndex+1}. `);let n;e.validation&&(e.validation.pattern&&(n=e.inputType==="email"?"بريد إلكتروني":e.inputType==="tel"?"رقم هاتف":e.inputType==="number"?"أرقام":void 0),e.validation.minLength&&e.validation.maxLength&&(n=`${e.validation.minLength}-${e.validation.maxLength} أحرف`));let o;this.context.locale==="ar"?(o=this.getArabicFieldPrompt(i,e.required,n),a&&(o=a+o),e.hint&&(o+=`. ${this.getBilingualLabel(e.hint)}`)):(o=`${a}${t.formAssistantFieldLabel.replace("{label}",i)}. ${s}. ${t.formAssistantEnterValue.replace("{label}",i)}`,n&&(o+=` Note: This field must be ${n}.`),e.hint&&(o+=`. ${this.getBilingualLabel(e.hint)}`)),this.speakNow(o,{lang:this.context.voiceLang})}updateFormAssistantStatus(){var s;if(!this.formSnapshot)return;const e=(s=this.panel)==null?void 0:s.querySelector("#raawi-form-assistant-status");if(!e)return;const t=this.formSnapshot.fields.filter(a=>a.required),i=t[this.currentFieldIndex];if(i){const n=this.getTranslations().formAssistantStatus.replace("{current}",(this.currentFieldIndex+1).toString()).replace("{total}",t.length.toString()).replace("{field}",i.label);e.textContent=n}}handleFieldValueEntry(e){if(!this.formSnapshot||this.currentFieldIndex<0)return;const t=this.formSnapshot.fields.filter(a=>a.required&&a.currentValueEmpty);if(this.currentFieldIndex>=t.length)return;const i=t[this.currentFieldIndex];if(!i.element)try{i.element=document.querySelector(i.selector)}catch{return}if(!i.element)return;if(this.isPasswordField(i)){this.getTranslations(),this.speakNow(this.context.locale==="ar"?"تم إدخال كلمة المرور.":"Password entered.",{lang:this.context.voiceLang}),i.currentValueEmpty=!1,setTimeout(()=>{this.moveToNextRequiredField()},1e3);return}const s=this.requiresDoubleConfirmation(i);if(s&&!this.pendingConfirmation){this.lastSpokenValue=e,this.pendingConfirmation={type:"sensitive_field",value:e},this.context.locale==="ar"?this.speakNow(this.getArabicDoubleConfirmationFirst(e),{lang:"ar-SA"}):this.speakNow(`This is a sensitive field. I'll repeat it twice for confirmation. First time: ${e}. Is that correct?`,{lang:"en-US"});return}if(s&&this.pendingConfirmation&&this.pendingConfirmation.value===e){this.context.locale==="ar"?this.speakNow(this.getArabicDoubleConfirmationSecond(e),{lang:"ar-SA"}):this.speakNow(`Second time for confirmation: ${e}. Please confirm it's correct?`,{lang:"en-US"});return}if(!s){this.fillFieldValue(i,e);const a=this.checkFieldValidation(i);if(a){this.speakNow(a,{lang:this.context.voiceLang});return}if(this.context.locale==="ar")this.speakNow(this.getArabicNormalConfirmation(e),{lang:"ar-SA"});else{const n=this.getTranslations();this.speakNow(n.formAssistantValueEntered.replace("{value}",e),{lang:"en-US"})}setTimeout(()=>{this.moveToNextRequiredField()},1500)}}checkFieldValidation(e){var i;if(!e.element)return null;if(e.element.getAttribute("aria-invalid")==="true"){const s=this.getFieldErrorMessage(e);return this.context.locale==="ar"?`فيه خطأ في ${this.getBilingualLabel(e.label)}: ${s}. تبي أصلحها الحين؟`:`There's an error in ${this.getBilingualLabel(e.label)}: ${s}. Would you like to fix it now?`}const t=this.findFieldErrorMessage(e.element);if(t){const s=((i=t.textContent)==null?void 0:i.trim())||"Validation error";return this.context.locale==="ar"?`فيه خطأ في ${this.getBilingualLabel(e.label)}: ${s}. تبي أصلحها الحين؟`:`There's an error in ${this.getBilingualLabel(e.label)}: ${s}. Would you like to fix it now?`}if((e.element instanceof HTMLInputElement||e.element instanceof HTMLTextAreaElement)&&!e.element.validity.valid){const s=e.element.validationMessage||"Invalid value";return this.context.locale==="ar"?`فيه خطأ في ${this.getBilingualLabel(e.label)}: ${s}. تبي أصلحها الحين؟`:`There's an error in ${this.getBilingualLabel(e.label)}: ${s}. Would you like to fix it now?`}return null}getFieldErrorMessage(e){var i;const t=this.findFieldErrorMessage(e.element);return t&&((i=t.textContent)==null?void 0:i.trim())||"Validation error"}findFieldErrorMessage(e){var a,n;if(!e)return null;const t=e.getAttribute("aria-describedby");if(t){const o=document.getElementById(t);if(o&&(o.getAttribute("role")==="alert"||o.classList.contains("error")||(a=o.textContent)!=null&&a.toLowerCase().includes("error")))return o}let i=e.nextElementSibling;if(i&&(i.classList.contains("error")||i.getAttribute("role")==="alert"||(n=i.textContent)!=null&&n.toLowerCase().includes("error")))return i;const s=e.parentElement;return s&&(i=s.nextElementSibling,i&&(i.classList.contains("error")||i.getAttribute("role")==="alert"))?i:null}fillFieldValue(e,t){if(e.element){if(e.element instanceof HTMLInputElement||e.element instanceof HTMLTextAreaElement)e.element.value=t,e.element.dispatchEvent(new Event("input",{bubbles:!0})),e.element.dispatchEvent(new Event("change",{bubbles:!0}));else if(e.element instanceof HTMLSelectElement){const i=Array.from(e.element.options).find(s=>s.value.toLowerCase()===t.toLowerCase()||s.text.toLowerCase().includes(t.toLowerCase()));i&&(e.element.value=i.value,e.element.dispatchEvent(new Event("change",{bubbles:!0})))}e.currentValueEmpty=!this.getFieldValue(e.element)}}handleNextUpload(e){var n;if(!this.formSnapshot||e>=this.formSnapshot.uploads.length){this.speakFormComplete();return}const t=this.formSnapshot.uploads[e];if(!t.element)try{t.element=document.querySelector(t.selector)}catch{}if(!t.element){e+1<this.formSnapshot.uploads.length?this.handleNextUpload(e+1):this.speakFormComplete();return}this.formAssistantState="upload_pending";const i=this.getBilingualLabel(t.label);let s;this.context.locale==="ar"?(s=this.getArabicUploadPrompt(i),t.hint&&(s=`${this.getBilingualLabel(t.hint)}. ${s}`)):(s=this.getTranslations().formAssistantChooseFile,t.hint?s=`${this.getBilingualLabel(t.hint)}. ${s}`:t.acceptedTypes&&(s=`${s} (${t.acceptedTypes})`)),this.speakNow(s,{lang:this.context.voiceLang}),this.pendingFileUpload={element:t.element,index:e};const a=(n=this.panel)==null?void 0:n.querySelector("#raawi-form-assistant-upload");a&&(a.style.display="block"),setTimeout(()=>{if(this.pendingFileUpload&&this.pendingFileUpload.element)try{this.triggerFilePicker()}catch{console.log("[Form Assistant] File picker auto-trigger failed, user can click button")}},500)}triggerFilePicker(){if(!this.pendingFileUpload)return;const e=this.pendingFileUpload.element;if(e){e.click();const t=this.pendingFileUpload.index;e.addEventListener("change",()=>{var i,s;if(e.files&&e.files.length>0){const a=e.files[0].name,n=this.context.locale==="ar"?this.getArabicUploadSelected(a):`File selected: ${a}. Continue?`;this.speakNow(n,{lang:this.context.voiceLang});const o=(i=this.panel)==null?void 0:i.querySelector("#raawi-form-assistant-upload");o&&(o.style.display="none"),this.pendingFileUpload=null,t+1<(((s=this.formSnapshot)==null?void 0:s.uploads.length)||0)?this.handleNextUpload(t+1):this.speakFormComplete()}},{once:!0})}}speakFormComplete(){const e=this.getTranslations();this.speakNow(e.formAssistantAllFieldsComplete,{lang:this.context.voiceLang})}confirmAndSubmitForm(){if(!this.formSnapshot)return;this.formAssistantState="review";const e=this.formSnapshot.fields.filter(s=>s.required),t=e.filter(s=>!s.currentValueEmpty),i=this.context.locale==="ar"?`${t.length} من ${e.length} حقول مطلوبة مكتملة`:`${t.length} of ${e.length} required fields completed`;this.context.locale==="ar"?this.speakNow(this.getArabicReviewPrompt(i),{lang:"ar-SA"}):(this.getTranslations(),this.speakNow(`Review before submit: ${i}. Warning: Submit is final. Say "confirm submit".`,{lang:"en-US"})),this.pendingConfirmation={type:"submit"}}executeSubmit(){if(!this.formSnapshot||!this.formSnapshot.submitButtons.length)return;this.formAssistantState="submit_confirm",this.context.locale==="ar"?this.speakNow(this.getArabicSubmitConfirm(),{lang:"ar-SA"}):this.speakNow("Confirmed. Clicking submit now.",{lang:"en-US"});const e=this.formSnapshot.submitButtons[0].element;e&&setTimeout(()=>{e.click(),this.stopFormAssistant()},1e3)}processFormAssistantCommand(e){var s;if(!this.formAssistantActive)return!1;const t=e.toLowerCase().trim(),i=this.getTranslations();if(t.includes("next field")||t.includes(i.formAssistantNextField.toLowerCase())||this.context.locale==="ar"&&(t.includes("التالي")||t.includes("الحقل التالي"))){if(this.formSnapshot&&this.currentFieldIndex>=0){const a=this.formSnapshot.fields.filter(n=>n.required&&n.currentValueEmpty);if(this.currentFieldIndex<a.length){const n=a[this.currentFieldIndex];n.element&&n.element.focus()}}return this.moveToNextRequiredField(),!0}if(t.includes("repeat")||t.includes(i.formAssistantRepeat.toLowerCase())||this.context.locale==="ar"&&t.includes("كرر")){if(this.formSnapshot&&this.currentFieldIndex>=0){const a=this.formSnapshot.fields.filter(n=>n.required&&n.currentValueEmpty);this.currentFieldIndex<a.length&&this.focusField(a[this.currentFieldIndex])}return!0}if(t.includes("skip")||t.includes(i.formAssistantSkip.toLowerCase())||this.context.locale==="ar"&&t.includes("تخطي")){const a=this.getTranslations();return this.speakNow(a.formAssistantFieldSkipped,{lang:this.context.voiceLang}),this.moveToNextRequiredField(),!0}if(t.includes("review")||t.includes(i.formAssistantReview.toLowerCase())||this.context.locale==="ar"&&t.includes("مراجعة"))return this.speakFormSummary(),!0;if(t.includes("previous field")||t.includes(i.formAssistantPreviousField.toLowerCase())||this.context.locale==="ar"&&(t.includes("السابق")||t.includes("الحقل السابق"))){if(this.formSnapshot&&this.currentFieldIndex>0){this.currentFieldIndex--;const a=this.formSnapshot.fields.filter(n=>n.required&&n.currentValueEmpty);this.currentFieldIndex<a.length&&this.focusField(a[this.currentFieldIndex])}return!0}if(t.includes("stop assistant")||t.includes(i.formAssistantStop.toLowerCase())||this.context.locale==="ar"&&(t.includes("أوقف")||t.includes("توقف")))return this.stopFormAssistant(),!0;if(this.pendingFileUpload&&(t.includes("open file")||t.includes("choose file")||this.context.locale==="ar"&&(t.includes("اختر ملف")||t.includes("فتح ملف"))))return this.triggerFilePicker(),!0;if(t.includes("yes")||t.includes("correct")||t.includes("done")||this.context.locale==="ar"&&(t.includes("نعم")||t.includes("صحيح")||t.includes("تم"))){if(this.pendingConfirmation&&this.pendingConfirmation.type==="sensitive_field")return this.lastSpokenValue&&(this.context.locale==="ar"?this.speakNow(this.getArabicDoubleConfirmationSecond(this.lastSpokenValue),{lang:"ar-SA"}):this.speakNow(`Second time for confirmation: ${this.lastSpokenValue}. Please confirm it's correct?`,{lang:"en-US"})),!0;if(this.pendingConfirmation&&this.pendingConfirmation.type==="sensitive_field"&&this.lastSpokenValue){const a=((s=this.formSnapshot)==null?void 0:s.fields.filter(n=>n.required&&n.currentValueEmpty))||[];if(this.currentFieldIndex>=0&&this.currentFieldIndex<a.length){const n=a[this.currentFieldIndex];this.fillFieldValue(n,this.lastSpokenValue),this.context.locale==="ar"?this.speakNow(this.getArabicDoubleConfirmationSuccess(),{lang:"ar-SA"}):this.speakNow("Value entered successfully.",{lang:"en-US"}),this.pendingConfirmation=null,this.lastSpokenValue="",setTimeout(()=>{this.moveToNextRequiredField()},1e3)}return!0}return this.formAssistantState==="collecting_field_value"&&!this.pendingConfirmation?(setTimeout(()=>{this.moveToNextRequiredField()},500),!0):(this.pendingConfirmation&&this.pendingConfirmation.type==="submit"&&this.executeSubmit(),!0)}return t.includes("submit")||t.includes(i.formAssistantSubmit.toLowerCase())||this.context.locale==="ar"&&t.includes("إرسال")?(this.confirmAndSubmitForm(),!0):t.includes("confirm submit")||t.includes(i.formAssistantConfirmSubmit.toLowerCase())||this.context.locale==="ar"&&t.includes("تأكيد الإرسال")?(this.pendingConfirmation&&this.pendingConfirmation.type==="submit"?this.executeSubmit():this.confirmAndSubmitForm(),!0):this.formSnapshot&&this.currentFieldIndex>=0&&t.length>2&&!(t.includes("next")||t.includes("skip")||t.includes("repeat")||t.includes("stop")||t.includes("review")||t.includes("submit"))?(this.handleFieldValueEntry(e),!0):!1}speakCommands(){const e=["Reading: read page, read summary, detailed summary","Narration controls: pause, resume, stop, next, repeat, faster, slower","Navigation: read landmarks, read actions, read issues","Text controls: increase text, decrease text","Spacing controls: increase spacing, decrease spacing","Toggle controls: contrast on or off, focus highlight on or off, reading mode on or off","Action navigation: next action, previous action, activate action","Section navigation: go to section followed by heading text","Help: list commands"];this.speak(`Available commands: ${e.join(". ")}`)}setVoiceModeType(e){var l,d,r,c,h,g,p;this.settings.voiceMode=e,this.saveVoiceModeToStorage(),this.updateVoiceIndicator();const t=(l=this.panel)==null?void 0:l.querySelector("#raawi-voice-mode-select");t&&(t.value=e);const i=(d=this.panel)==null?void 0:d.querySelector("#raawi-narration-controls");(r=this.panel)==null||r.querySelector("#raawi-voice-control");const s=(c=this.panel)==null?void 0:c.querySelector("#raawi-voice-push-to-talk"),a=(h=this.panel)==null?void 0:h.querySelector("#raawi-voice-transcript-container"),n=(g=this.panel)==null?void 0:g.querySelector("#raawi-voice-commands"),o=(p=this.panel)==null?void 0:p.querySelector("#raawi-voice-mic-container");this.settings.voiceMode!=="off"?(this.recognition||this.initVoiceMode(),this.settings.voiceMode==="push_to_talk"||this.settings.voiceMode==="hands_free"&&this.micPermissionGranted&&this.startWakeOnlyMode(),s&&(s.style.display="block"),a&&(a.style.display="block"),n&&(n.style.display="block"),o&&(o.style.display="block"),i&&(i.style.display="block"),this.getTranslations(),this.speakNow(this.context.locale==="ar"?"تم تفعيل وضع الصوت.":"Voice mode enabled.",{lang:this.context.voiceLang})):(this.stopListening(),this.stopNarration(),s&&(s.style.display="none"),a&&(a.style.display="none"),n&&(n.style.display="none"),o&&(o.style.display="none"),i&&(i.style.display="none"),this.addTranscript(""),this.getTranslations(),this.speakNow(this.context.locale==="ar"?"تم تعطيل وضع الصوت.":"Voice mode disabled.",{lang:this.context.voiceLang})),this.applySettings()}setVoiceMode(e){this.setVoiceModeType(e?"push_to_talk":"off")}setPushToTalk(e){this.settings.voiceMode=e?"push_to_talk":"off",this.applySettings(),e?(this.stopListening(),this.speak("Push to talk mode enabled. Hold the microphone button to speak.")):(this.speak("Continuous listening mode enabled"),this.settings.voiceMode&&this.startListening())}}if(typeof window<"u")if(!window.raawiAccessibilityWidget)window.raawiAccessibilityWidget=new P;else{const I=document.querySelectorAll('[data-testid="raawi-launcher"]'),e=document.querySelectorAll('[data-testid="raawi-panel"]');if(I.length>1)for(let t=1;t<I.length;t++)I[t].remove();if(e.length>1)for(let t=1;t<e.length;t++)e[t].remove()}return P}();
