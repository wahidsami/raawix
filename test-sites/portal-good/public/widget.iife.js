this.RaawiXAccessibility=function(){"use strict";const M={ar:{widgetTitle:"أدوات الوصول وسهولة الاستخدام",openOptions:"فتح خيارات سهولة الاستخدام",closeOptions:"إغلاق لوحة سهولة الاستخدام",resetAll:"إعادة ضبط الإعدادات",resetAllConfirm:"تمت استعادة الإعدادات الافتراضية بنجاح",assist:"المساعدة",vision:"الرؤية",reading:"القراءة",tools:"الأدوات",presets:"الملفات المخصصة السريعة",presetBlind:"إمكانية وصول لفاقدي البصر",presetLowVision:"ضعف البصر وتباين عالٍ",presetDyslexia:"عسر القراءة والتركيز",presetNone:"الوضع الافتراضي (إيقاف)",textSize:"حجم الخط",increaseTextSize:"تكبير حجم الخط",decreaseTextSize:"تصغير حجم الخط",lineSpacing:"تباعد الأسطر",increaseLineSpacing:"زيادة تباعد الأسطر",decreaseLineSpacing:"تقليل تباعد الأسطر",highContrastMode:"وضع التباين العالي",toggleHighContrast:"تبديل وضع التباين العالي",focusHighlight:"إبراز مؤشر التركيز",toggleFocusHighlight:"تبديل إبراز مؤشر التركيز",stopAnimations:"إيقاف الرسوم المتحركة",toggleStopAnimations:"تبديل إيقاف الرسوم المتحركة",reduceMotion:"تقليل الحركة",toggleReduceMotion:"تبديل تقليل الحركة",bigCursor:"مؤشر الفأرة الكبير",selectBigCursor:"اختيار نمط المؤشر الكبير",bigDarkCursor:"مؤشر كبير داكن",bigLightCursor:"مؤشر كبير فاتح",off:"إيقاف",readingMode:"وضع القراءة المركزة",toggleReadingMode:"تبديل وضع القراءة",readingGuide:"مسطرة القراءة الأفقية",toggleReadingGuide:"تبديل مسطرة القراءة",readingMask:"قناع حجب وتظليل القراءة",toggleReadingMask:"تبديل قناع القراءة",maskWindowHeight:"ارتفاع نافذة القراءة",small:"صغير",medium:"متوسط",large:"كبير",hideImages:"إخفاء الصور",toggleHideImages:"تبديل إخفاء الصور",imageCaptions:"عرض التسميات التوضيحية للصور",toggleImageCaptions:"تبديل عرض التسميات التوضيحية",describeImage:"وصف الصورة الحالية",describeFocusedElement:"وصف العنصر المحدّد",whatCanIDoHere:"ماذا يمكنني أن أفعل هنا؟",disclaimer:"راوي إكس يوفر أدوات مساعدة للتصفح والقراءة، ولا يغني عن الامتثال لمعايير WCAG 2.1 AA.",statusReady:"جاهز ونشط",statusOffline:"الوضع المحلي المستقل",statusStale:"تنبيه: تغير محتوى الصفحة منذ آخر مسح",statusRemediated:"تمت معالجة العناصر بدقة عالية",poweredBy:"منصة راوي إكس الرقمية"},en:{widgetTitle:"Accessibility & Usability Options",openOptions:"Open accessibility options",closeOptions:"Close accessibility panel",resetAll:"Reset all settings",resetAllConfirm:"Settings restored to default successfully",assist:"Assist",vision:"Vision",reading:"Reading",tools:"Tools",presets:"Quick Accessibility Profiles",presetBlind:"Blind Access Profile",presetLowVision:"Low Vision & Contrast",presetDyslexia:"Dyslexia & Focus",presetNone:"Default (Off)",textSize:"Text Size",increaseTextSize:"Increase text size",decreaseTextSize:"Decrease text size",lineSpacing:"Line Spacing",increaseLineSpacing:"Increase line spacing",decreaseLineSpacing:"Decrease line spacing",highContrastMode:"High Contrast Mode",toggleHighContrast:"Toggle high contrast mode",focusHighlight:"Focus Highlight",toggleFocusHighlight:"Toggle focus highlight ring",stopAnimations:"Stop Animations",toggleStopAnimations:"Toggle stop animations",reduceMotion:"Reduce Motion",toggleReduceMotion:"Toggle reduce motion",bigCursor:"Large Cursor",selectBigCursor:"Select large cursor mode",bigDarkCursor:"Large Dark Cursor",bigLightCursor:"Large Light Cursor",off:"Off",readingMode:"Reading Mode",toggleReadingMode:"Toggle reading mode",readingGuide:"Reading Guide Ruler",toggleReadingGuide:"Toggle reading guide ruler",readingMask:"Reading Focus Mask",toggleReadingMask:"Toggle reading mask",maskWindowHeight:"Mask Window Height",small:"Small",medium:"Medium",large:"Large",hideImages:"Hide Images",toggleHideImages:"Toggle hide images",imageCaptions:"Show Image Captions",toggleImageCaptions:"Toggle show image captions",describeImage:"Describe current image",describeFocusedElement:"Describe focused element",whatCanIDoHere:"What can I do here?",disclaimer:"Raawi X provides assistive navigation aids and does not substitute for native WCAG 2.1 AA compliance.",statusReady:"Active & Ready",statusOffline:"Standalone / Offline Mode",statusStale:"Notice: Page content changed since last scan",statusRemediated:"High-confidence remediations applied",poweredBy:"Raawi X Platform"}};class S{constructor(t="ar"){this.listeners=[],this.currentLocale=t}getLocale(){return this.currentLocale}setLocale(t){if(this.currentLocale!==t){this.currentLocale=t;for(const e of this.listeners)e(t)}}t(){return M[this.currentLocale]}get(t){return M[this.currentLocale][t]||t}subscribe(t){return this.listeners.push(t),()=>{this.listeners=this.listeners.filter(e=>e!==t)}}}const u={textSize:1,lineSpacing:1,contrastMode:!1,stopAnimations:!1,reduceMotion:!1,bigCursor:"off",readingGuide:!1,readingMask:!1,readingMaskWindowHeight:"medium",hideImages:!1,imageCaptions:!1,magnifier:!1,magnifierZoom:2,activePreset:"none"},A="raawi_accessibility_settings_v2",L="raawi_accessibility_locale";class C{constructor(t="ar"){this.isOpen=!1,this.activeTab="assist",this.listeners=[],this.locale=this.loadLocale(t),this.settings=this.loadSettings()}getSettings(){return{...this.settings}}getLocale(){return this.locale}getDirection(){return this.locale==="ar"?"rtl":"ltr"}getIsOpen(){return this.isOpen}getActiveTab(){return this.activeTab}setOpen(t){this.isOpen!==t&&(this.isOpen=t,this.notify())}toggleOpen(){this.setOpen(!this.isOpen)}setActiveTab(t){this.activeTab!==t&&(this.activeTab=t,this.notify())}setLocale(t){this.locale!==t&&(this.locale=t,this.saveLocale(t),this.notify())}updateSetting(t,e){this.settings[t]=e,t!=="activePreset"&&this.settings.activePreset!=="none"&&(this.settings.activePreset="none"),this.saveSettings(),this.notify()}applyPreset(t){if(t==="none"){this.resetSettings();return}t==="blind"?this.settings={...u,activePreset:"blind",imageCaptions:!0}:t==="low-vision"?this.settings={...u,activePreset:"low-vision",textSize:1.3,contrastMode:!0,bigCursor:"dark"}:t==="dyslexia"&&(this.settings={...u,activePreset:"dyslexia",lineSpacing:1.4,readingGuide:!0,stopAnimations:!0}),this.saveSettings(),this.notify()}resetSettings(){this.settings={...u},this.saveSettings(),this.notify()}subscribe(t){return this.listeners.push(t),()=>{this.listeners=this.listeners.filter(e=>e!==t)}}notify(){for(const t of this.listeners)try{t()}catch(e){console.error("[RaawiX Widget] State listener error:",e)}}loadSettings(){try{if(typeof window<"u"&&window.localStorage){const t=window.localStorage.getItem(A);if(t){const e=JSON.parse(t);return{...u,...e}}}}catch{}return{...u}}saveSettings(){try{typeof window<"u"&&window.localStorage&&window.localStorage.setItem(A,JSON.stringify(this.settings))}catch{}}loadLocale(t){try{if(typeof window<"u"&&window.localStorage){const e=window.localStorage.getItem(L);if(e==="ar"||e==="en")return e}}catch{}return t}saveLocale(t){try{typeof window<"u"&&window.localStorage&&window.localStorage.setItem(L,t)}catch{}}}class E{constructor(t,e){this.styleElement=null,this.unsubscribe=null,this.readingRuler=null,this.readingMaskTop=null,this.readingMaskBottom=null,this.isTrackingMouse=!1,this.rafId=null,this.currentY=200,this.targetY=200,this.pausedVideos=new WeakSet,this.state=t,this.shadow=e,this.ensureStyleElement(),this.applySettings(this.state.getSettings()),this.unsubscribe=this.state.subscribe(()=>{this.applySettings(this.state.getSettings())}),this.handleMouseMove=this.handleMouseMove.bind(this),this.handleFocusIn=this.handleFocusIn.bind(this),this.animateOverlays=this.animateOverlays.bind(this)}applySettings(t){if(typeof document>"u")return;const e=document.documentElement;t.textSize!==1?(e.style.setProperty("--raawi-text-size",String(t.textSize)),e.setAttribute("data-raawi-text-size",String(t.textSize))):(e.style.removeProperty("--raawi-text-size"),e.removeAttribute("data-raawi-text-size")),t.lineSpacing!==1?(e.style.setProperty("--raawi-line-spacing",String(t.lineSpacing)),e.setAttribute("data-raawi-line-spacing",String(t.lineSpacing))):(e.style.removeProperty("--raawi-line-spacing"),e.removeAttribute("data-raawi-line-spacing")),t.contrastMode?e.setAttribute("data-raawi-contrast-mode","true"):e.removeAttribute("data-raawi-contrast-mode"),t.stopAnimations?(e.setAttribute("data-raawi-stop-animations","true"),this.pauseHostMedia()):e.removeAttribute("data-raawi-stop-animations"),t.bigCursor!=="off"?e.setAttribute("data-raawi-cursor",t.bigCursor):e.removeAttribute("data-raawi-cursor"),t.hideImages?e.setAttribute("data-raawi-hide-images","true"):e.removeAttribute("data-raawi-hide-images"),this.syncReadingRuler(t.readingGuide),this.syncReadingMask(t.readingMask,t.readingMaskWindowHeight),this.syncTrackingListeners(t.readingGuide||t.readingMask)}syncReadingRuler(t){t?(this.readingRuler||(this.readingRuler=document.createElement("div"),this.readingRuler.id="raawi-reading-ruler",this.readingRuler.className="raawi-reading-ruler",this.readingRuler.setAttribute("aria-hidden","true"),this.readingRuler.setAttribute("data-testid","raawi-reading-ruler"),this.shadow.appendChild(this.readingRuler),this.updateRulerPosition(this.currentY)),this.readingRuler.style.display="block"):this.readingRuler&&(this.readingRuler.style.display="none")}syncReadingMask(t,e){t?((!this.readingMaskTop||!this.readingMaskBottom)&&(this.readingMaskTop=document.createElement("div"),this.readingMaskTop.id="raawi-reading-mask-top",this.readingMaskTop.className="raawi-reading-mask-overlay raawi-reading-mask-top",this.readingMaskTop.setAttribute("aria-hidden","true"),this.readingMaskTop.setAttribute("data-testid","raawi-reading-mask-overlay"),this.shadow.appendChild(this.readingMaskTop),this.readingMaskBottom=document.createElement("div"),this.readingMaskBottom.id="raawi-reading-mask-bottom",this.readingMaskBottom.className="raawi-reading-mask-overlay raawi-reading-mask-bottom",this.readingMaskBottom.setAttribute("aria-hidden","true"),this.readingMaskBottom.setAttribute("data-testid","raawi-reading-mask-overlay"),this.shadow.appendChild(this.readingMaskBottom)),this.readingMaskTop.style.display="block",this.readingMaskBottom.style.display="block",this.updateMaskPosition(this.currentY,e)):(this.readingMaskTop&&(this.readingMaskTop.style.display="none"),this.readingMaskBottom&&(this.readingMaskBottom.style.display="none"))}syncTrackingListeners(t){t&&!this.isTrackingMouse?(this.isTrackingMouse=!0,document.addEventListener("mousemove",this.handleMouseMove,{passive:!0}),document.addEventListener("focusin",this.handleFocusIn,{passive:!0})):!t&&this.isTrackingMouse&&(this.isTrackingMouse=!1,document.removeEventListener("mousemove",this.handleMouseMove),document.removeEventListener("focusin",this.handleFocusIn),this.rafId!==null&&(cancelAnimationFrame(this.rafId),this.rafId=null))}handleMouseMove(t){this.targetY=t.clientY,this.requestOverlayUpdate()}handleFocusIn(t){const e=t.target;if(e&&typeof e.getBoundingClientRect=="function"){const a=e.getBoundingClientRect();this.targetY=Math.round(a.top+a.height/2),this.requestOverlayUpdate()}}requestOverlayUpdate(){this.rafId===null&&(this.rafId=requestAnimationFrame(this.animateOverlays))}animateOverlays(){this.rafId=null,this.currentY=this.targetY,this.readingRuler&&this.readingRuler.style.display!=="none"&&this.updateRulerPosition(this.currentY),this.readingMaskTop&&this.readingMaskTop.style.display!=="none"&&this.updateMaskPosition(this.currentY,this.state.getSettings().readingMaskWindowHeight)}updateRulerPosition(t){if(!this.readingRuler)return;const e=4,a=Math.max(0,Math.min(t-e/2,window.innerHeight-e));this.readingRuler.style.top=`${a}px`}updateMaskPosition(t,e){if(!this.readingMaskTop||!this.readingMaskBottom)return;const n=({small:80,medium:120,large:180}[e]||120)/2,g=Math.max(0,t-n),h=t+n,m=Math.max(0,(typeof window<"u"?window.innerHeight:800)-h);this.readingMaskTop.style.top="0px",this.readingMaskTop.style.height=`${g}px`,this.readingMaskBottom.style.top=`${h}px`,this.readingMaskBottom.style.height=`${m}px`}pauseHostMedia(){if(typeof document>"u")return;document.querySelectorAll("video").forEach(e=>{if(!e.paused){this.pausedVideos.add(e);try{e.pause()}catch{}}})}ensureStyleElement(){if(typeof document>"u")return;let t=document.getElementById("raawi-display-styles");t||(t=document.createElement("style"),t.id="raawi-display-styles",t.textContent=this.generateManagedStyles(),document.head.appendChild(t)),this.styleElement=t}generateManagedStyles(){const t=encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><path d="M4 4 L4 28 L11 21 L17 33 L21 31 L15 19 L24 19 Z" fill="#000000" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/></svg>'),e=encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><path d="M4 4 L4 28 L11 21 L17 33 L21 31 L15 19 L24 19 Z" fill="#ffffff" stroke="#000000" stroke-width="2.5" stroke-linejoin="round"/></svg>');return`
      /* =========================================================================
         RAAWI X MANAGED DISPLAY PREFERENCES (Phase 5.3)
         Scoped strictly to [data-raawi-*] attributes. Fully reversible.
         Does NOT modify widget internal Shadow DOM.
         ========================================================================= */

      /* 1. Proportional Text Scaling (Preserves Heading & Body Hierarchy) */
      html[data-raawi-text-size] {
        font-size: calc(100% * var(--raawi-text-size, 1)) !important;
      }

      /* 2. Proportional Line Spacing (Content Blocks Only) */
      html[data-raawi-line-spacing] p,
      html[data-raawi-line-spacing] li,
      html[data-raawi-line-spacing] dd,
      html[data-raawi-line-spacing] dt,
      html[data-raawi-line-spacing] blockquote,
      html[data-raawi-line-spacing] figcaption {
        line-height: calc(1.6 * var(--raawi-line-spacing, 1)) !important;
      }

      /* 3. Curated High-Contrast Dark Theme (WCAG AAA 21:1 Ratio) */
      html[data-raawi-contrast-mode="true"] {
        background-color: #000000 !important;
        color: #ffffff !important;
      }

      html[data-raawi-contrast-mode="true"] body,
      html[data-raawi-contrast-mode="true"] main,
      html[data-raawi-contrast-mode="true"] header,
      html[data-raawi-contrast-mode="true"] footer,
      html[data-raawi-contrast-mode="true"] section,
      html[data-raawi-contrast-mode="true"] article,
      html[data-raawi-contrast-mode="true"] aside,
      html[data-raawi-contrast-mode="true"] nav,
      html[data-raawi-contrast-mode="true"] .card,
      html[data-raawi-contrast-mode="true"] .hero {
        background: #000000 !important;
        color: #ffffff !important;
        border-color: #555555 !important;
      }

      html[data-raawi-contrast-mode="true"] h1,
      html[data-raawi-contrast-mode="true"] h2,
      html[data-raawi-contrast-mode="true"] h3,
      html[data-raawi-contrast-mode="true"] h4,
      html[data-raawi-contrast-mode="true"] h5,
      html[data-raawi-contrast-mode="true"] h6 {
        color: #ffffff !important;
      }

      html[data-raawi-contrast-mode="true"] p,
      html[data-raawi-contrast-mode="true"] span:not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-contrast-mode="true"] li {
        color: #f0f0f0 !important;
      }

      html[data-raawi-contrast-mode="true"] a:not(raawi-accessibility-widget *) {
        color: #ffff00 !important;
        text-decoration: underline !important;
      }

      html[data-raawi-contrast-mode="true"] a:not(raawi-accessibility-widget *):hover,
      html[data-raawi-contrast-mode="true"] a:not(raawi-accessibility-widget *):focus {
        color: #00ffff !important;
      }

      html[data-raawi-contrast-mode="true"] input:not(raawi-accessibility-widget *),
      html[data-raawi-contrast-mode="true"] select:not(raawi-accessibility-widget *),
      html[data-raawi-contrast-mode="true"] textarea:not(raawi-accessibility-widget *) {
        background-color: #111111 !important;
        color: #ffffff !important;
        border: 2px solid #ffffff !important;
      }

      html[data-raawi-contrast-mode="true"] button:not(raawi-accessibility-widget *),
      html[data-raawi-contrast-mode="true"] .button:not(raawi-accessibility-widget *) {
        background-color: #222222 !important;
        color: #ffffff !important;
        border: 2px solid #ffff00 !important;
      }

      html[data-raawi-contrast-mode="true"] :focus-visible:not(raawi-accessibility-widget *) {
        outline: 3px solid #ffff00 !important;
        outline-offset: 3px !important;
      }

      /* 4. Stop Animations & Reduced Motion */
      html[data-raawi-stop-animations="true"] *,
      html[data-raawi-stop-animations="true"] *::before,
      html[data-raawi-stop-animations="true"] *::after {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
        scroll-behavior: auto !important;
      }

      /* 5. High-Visibility Cursors */
      html[data-raawi-cursor="dark"] *,
      html[data-raawi-cursor="dark"] *::before,
      html[data-raawi-cursor="dark"] *::after {
        cursor: url("data:image/svg+xml,${t}") 4 4, auto !important;
      }

      html[data-raawi-cursor="light"] *,
      html[data-raawi-cursor="light"] *::before,
      html[data-raawi-cursor="light"] *::after {
        cursor: url("data:image/svg+xml,${e}") 4 4, auto !important;
      }

      /* 6. Hide Images */
      html[data-raawi-hide-images="true"] img:not(raawi-accessibility-widget *),
      html[data-raawi-hide-images="true"] svg:not(raawi-accessibility-widget *):not(.raawi-icon),
      html[data-raawi-hide-images="true"] picture:not(raawi-accessibility-widget *),
      html[data-raawi-hide-images="true"] video:not(raawi-accessibility-widget *) {
        opacity: 0 !important;
        visibility: hidden !important;
      }

      /* 7. Ensure Widget Host & Internal Elements are 100% Protected */
      raawi-accessibility-widget {
        font-size: 14px !important;
        line-height: normal !important;
        color: initial !important;
      }
    `}reset(){if(typeof document>"u")return;const t=document.documentElement;t.style.removeProperty("--raawi-text-size"),t.style.removeProperty("--raawi-line-spacing"),t.removeAttribute("data-raawi-text-size"),t.removeAttribute("data-raawi-line-spacing"),t.removeAttribute("data-raawi-contrast-mode"),t.removeAttribute("data-raawi-stop-animations"),t.removeAttribute("data-raawi-cursor"),t.removeAttribute("data-raawi-hide-images"),this.readingRuler&&(this.readingRuler.style.display="none"),this.readingMaskTop&&(this.readingMaskTop.style.display="none"),this.readingMaskBottom&&(this.readingMaskBottom.style.display="none"),this.syncTrackingListeners(!1)}destroy(){this.reset(),this.unsubscribe&&(this.unsubscribe(),this.unsubscribe=null),this.styleElement&&this.styleElement.parentNode&&(this.styleElement.parentNode.removeChild(this.styleElement),this.styleElement=null),this.readingRuler&&this.readingRuler.parentNode&&(this.readingRuler.parentNode.removeChild(this.readingRuler),this.readingRuler=null),this.readingMaskTop&&this.readingMaskTop.parentNode&&(this.readingMaskTop.parentNode.removeChild(this.readingMaskTop),this.readingMaskTop=null),this.readingMaskBottom&&this.readingMaskBottom.parentNode&&(this.readingMaskBottom.parentNode.removeChild(this.readingMaskBottom),this.readingMaskBottom=null)}getReadingRuler(){return this.readingRuler}getReadingMaskTop(){return this.readingMaskTop}getReadingMaskBottom(){return this.readingMaskBottom}}const T=`
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="raawi-launcher-icon">
  <circle cx="24" cy="24" r="22" fill="white" fill-opacity="0.15"/>
  <!-- Figure head -->
  <circle cx="24" cy="12" r="4.5" fill="#ffffff"/>
  <!-- Figure torso and welcoming arms (universal accessibility symbol) -->
  <path d="M12 21C16 19 32 19 36 21" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M24 18V30" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
  <!-- Figure legs -->
  <path d="M24 30L17 40" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M24 30L31 40" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
</svg>
`;class R{constructor(t,e){this.state=t,this.i18n=e,this.element=document.createElement("button"),this.element.className="raawi-launcher-btn",this.element.setAttribute("type","button"),this.element.setAttribute("data-testid","raawi-launcher"),this.element.setAttribute("aria-haspopup","dialog"),this.element.setAttribute("aria-controls","raawi-accessibility-panel"),this.element.innerHTML=T,this.updateAria(),this.setupEvents(),this.state.subscribe(()=>this.updateAria()),this.i18n.subscribe(()=>this.updateAria())}getElement(){return this.element}focus(){this.element.focus()}updateAria(){const t=this.state.getIsOpen();this.element.setAttribute("aria-expanded",t?"true":"false"),this.element.setAttribute("aria-label",t?this.i18n.t().closeOptions:this.i18n.t().openOptions),this.element.setAttribute("title",t?this.i18n.t().closeOptions:this.i18n.t().openOptions)}setupEvents(){this.element.addEventListener("click",t=>{t.preventDefault(),t.stopPropagation(),this.state.toggleOpen()}),this.element.addEventListener("keydown",t=>{(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),t.stopPropagation(),this.state.toggleOpen())})}}class ${constructor(t,e){this.state=t,this.i18n=e,this.lastTab=this.state.getActiveTab(),this.element=document.createElement("section"),this.element.id="raawi-accessibility-panel",this.element.className="raawi-panel-container",this.element.setAttribute("data-testid","raawi-panel"),this.element.setAttribute("role","dialog"),this.element.setAttribute("aria-labelledby","raawi-panel-title"),this.render(),this.updateVisibility(),this.state.subscribe(()=>{this.updateVisibility();const a=this.state.getActiveTab();a!==this.lastTab&&(this.lastTab=a,this.render())}),this.i18n.subscribe(()=>this.render())}getElement(){return this.element}getFocusableElements(){const t=["a[href]","button:not([disabled])","input:not([disabled])","select:not([disabled])","textarea:not([disabled])",'[tabindex]:not([tabindex="-1"])'].join(", ");return Array.from(this.element.querySelectorAll(t)).filter(a=>{if(a.hasAttribute("disabled")||a.getAttribute("aria-hidden")==="true")return!1;const i=a.closest('[role="tabpanel"]');return!(i&&i.style.display==="none"||a.offsetParent===null&&a.offsetWidth===0&&a.offsetHeight===0&&i&&i.style.display==="none")})}focusFirstElement(){const t=this.getFocusableElements(),e=this.element.querySelector('[data-testid="raawi-close"]');if(e&&t.includes(e)){e.focus();return}if(t.length>0){t[0].focus();return}const a=this.element.querySelector("#raawi-panel-title");a?a.focus():this.element.focus()}focusLastElement(){const t=this.getFocusableElements();t.length>0?t[t.length-1].focus():this.focusFirstElement()}updateVisibility(){this.state.getIsOpen()?(this.element.classList.add("open"),this.element.removeAttribute("hidden"),this.element.setAttribute("aria-modal","true")):(this.element.classList.remove("open"),this.element.setAttribute("hidden",""),this.element.setAttribute("aria-modal","false"))}render(){const t=this.i18n.t(),e=this.state.getLocale(),a=this.state.getSettings(),i=this.state.getActiveTab();this.element.innerHTML=`
      <!-- Topbar Header -->
      <header class="raawi-panel-header">
        <div class="raawi-brand-group">
          <svg class="raawi-brand-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="#27ae60" fill-opacity="0.15"/>
            <circle cx="12" cy="7" r="2.5" fill="#27ae60"/>
            <path d="M6 11C9 10 15 10 18 11" stroke="#27ae60" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 9.5V16" stroke="#27ae60" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 16L8.5 21" stroke="#27ae60" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 16L15.5 21" stroke="#27ae60" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <h2 id="raawi-panel-title" class="raawi-brand-title" tabindex="-1">${t.widgetTitle}</h2>
        </div>
        
        <div class="raawi-header-actions">
          <div class="raawi-lang-switch">
            <button type="button" class="raawi-lang-btn ${e==="ar"?"active":""}" data-lang="ar" data-testid="raawi-lang-switch" aria-label="العربية">العربية</button>
            <button type="button" class="raawi-lang-btn ${e==="en"?"active":""}" data-lang="en" data-testid="raawi-lang-switch" aria-label="English">EN</button>
          </div>

          <button type="button" class="raawi-icon-btn" id="raawi-reset-btn" data-testid="raawi-reset-all" aria-label="${t.resetAll}" title="${t.resetAll}">↻</button>
          <button type="button" class="raawi-icon-btn" id="raawi-close-btn" data-testid="raawi-close" aria-label="${t.closeOptions}" title="${t.closeOptions}">✕</button>
        </div>
      </header>

      <!-- Tab Navigation -->
      <nav class="raawi-tab-bar" role="tablist" aria-label="${t.widgetTitle}">
        <button type="button" class="raawi-tab-btn ${i==="assist"?"active":""}" data-tab="assist" data-testid="raawi-tab-assist" role="tab" aria-selected="${i==="assist"}">${t.assist}</button>
        <button type="button" class="raawi-tab-btn ${i==="vision"?"active":""}" data-tab="vision" data-testid="raawi-tab-vision" role="tab" aria-selected="${i==="vision"}">${t.vision}</button>
        <button type="button" class="raawi-tab-btn ${i==="reading"?"active":""}" data-tab="reading" data-testid="raawi-tab-reading" role="tab" aria-selected="${i==="reading"}">${t.reading}</button>
        <button type="button" class="raawi-tab-btn ${i==="tools"?"active":""}" data-tab="tools" data-testid="raawi-tab-tools" role="tab" aria-selected="${i==="tools"}">${t.tools}</button>
      </nav>

      <!-- Tab Content: Assist -->
      <div id="raawi-tabpanel-assist" class="raawi-tab-body" role="tabpanel" style="display: ${i==="assist"?"flex":"none"};">
        <!-- Presets -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.presets}</span>
          </div>
          <div class="raawi-preset-grid">
            <button type="button" class="raawi-preset-btn ${a.activePreset==="blind"?"active":""}" data-preset="blind" data-testid="raawi-preset-blind">${t.presetBlind}</button>
            <button type="button" class="raawi-preset-btn ${a.activePreset==="low-vision"?"active":""}" data-preset="low-vision" data-testid="raawi-preset-lowvision">${t.presetLowVision}</button>
            <button type="button" class="raawi-preset-btn ${a.activePreset==="dyslexia"?"active":""}" data-preset="dyslexia" data-testid="raawi-preset-dyslexia">${t.presetDyslexia}</button>
            <button type="button" class="raawi-preset-btn ${a.activePreset==="none"?"active":""}" data-preset="none">${t.presetNone}</button>
          </div>
        </div>

        <!-- Quick AI Tools -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.assist}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button type="button" class="raawi-action-btn" id="raawi-btn-describe-image" data-testid="raawi-tool-describe-image">
              <span aria-hidden="true">🖼️</span> ${t.describeImage}
            </button>
            <button type="button" class="raawi-action-btn" id="raawi-btn-describe-focused" data-testid="raawi-tool-describe-focused">
              <span aria-hidden="true">🎯</span> ${t.describeFocusedElement}
            </button>
            <button type="button" class="raawi-action-btn" id="raawi-btn-what-can-i-do" data-testid="raawi-tool-what-can-i-do">
              <span aria-hidden="true">🧭</span> ${t.whatCanIDoHere}
            </button>
          </div>
        </div>
      </div>

      <!-- Tab Content: Vision -->
      <div id="raawi-tabpanel-vision" class="raawi-tab-body" role="tabpanel" style="display: ${i==="vision"?"flex":"none"};">
        <!-- Text Size -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <div>
              <div class="raawi-control-title">${t.textSize}</div>
              <div class="raawi-control-desc">80% - 200%</div>
            </div>
            <div class="raawi-stepper-group">
              <button type="button" class="raawi-stepper-btn" id="raawi-btn-text-dec" aria-label="${t.decreaseTextSize}">-</button>
              <span class="raawi-stepper-value" id="raawi-text-size-val" aria-live="polite">${Math.round(a.textSize*100)}%</span>
              <button type="button" class="raawi-stepper-btn" id="raawi-btn-text-inc" aria-label="${t.increaseTextSize}">+</button>
            </div>
          </div>
        </div>

        <!-- Line Spacing -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <div>
              <div class="raawi-control-title">${t.lineSpacing}</div>
              <div class="raawi-control-desc">80% - 200%</div>
            </div>
            <div class="raawi-stepper-group">
              <button type="button" class="raawi-stepper-btn" id="raawi-btn-line-dec" aria-label="${t.decreaseLineSpacing}">-</button>
              <span class="raawi-stepper-value" id="raawi-line-spacing-val" aria-live="polite">${Math.round(a.lineSpacing*100)}%</span>
              <button type="button" class="raawi-stepper-btn" id="raawi-btn-line-inc" aria-label="${t.increaseLineSpacing}">+</button>
            </div>
          </div>
        </div>

        <!-- Contrast Mode Toggle -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.highContrastMode}</span>
            <label class="raawi-toggle">
              <input type="checkbox" id="raawi-toggle-contrast" ${a.contrastMode?"checked":""} aria-label="${t.toggleHighContrast}">
              <span class="raawi-toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Stop Animations Toggle -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.stopAnimations}</span>
            <label class="raawi-toggle">
              <input type="checkbox" id="raawi-toggle-stop-animations" data-testid="raawi-tool-stop-animations" ${a.stopAnimations?"checked":""} aria-label="${t.toggleStopAnimations}">
              <span class="raawi-toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Large Cursor Toggle -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.bigCursor}</span>
            <div class="raawi-lang-switch">
              <button type="button" class="raawi-lang-btn ${a.bigCursor==="off"?"active":""}" data-cursor="off">${t.off}</button>
              <button type="button" class="raawi-lang-btn ${a.bigCursor==="dark"?"active":""}" data-cursor="dark">${t.bigDarkCursor}</button>
              <button type="button" class="raawi-lang-btn ${a.bigCursor==="light"?"active":""}" data-cursor="light">${t.bigLightCursor}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Content: Reading -->
      <div id="raawi-tabpanel-reading" class="raawi-tab-body" role="tabpanel" style="display: ${i==="reading"?"flex":"none"};">
        <!-- Reading Guide Ruler -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.readingGuide}</span>
            <label class="raawi-toggle">
              <input type="checkbox" id="raawi-toggle-reading-guide" data-testid="raawi-tool-reading-guide" ${a.readingGuide?"checked":""} aria-label="${t.toggleReadingGuide}">
              <span class="raawi-toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Reading Focus Mask -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.readingMask}</span>
            <label class="raawi-toggle">
              <input type="checkbox" id="raawi-toggle-reading-mask" data-testid="raawi-tool-reading-mask" ${a.readingMask?"checked":""} aria-label="${t.toggleReadingMask}">
              <span class="raawi-toggle-slider"></span>
            </label>
          </div>
          <div id="raawi-mask-height-container" style="display: ${a.readingMask?"flex":"none"}; margin-top: 10px; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; color: var(--text-secondary);">${t.maskWindowHeight}</span>
            <div class="raawi-lang-switch">
              <button type="button" class="raawi-lang-btn ${a.readingMaskWindowHeight==="small"?"active":""}" data-mask-height="small">${t.small}</button>
              <button type="button" class="raawi-lang-btn ${a.readingMaskWindowHeight==="medium"?"active":""}" data-mask-height="medium">${t.medium}</button>
              <button type="button" class="raawi-lang-btn ${a.readingMaskWindowHeight==="large"?"active":""}" data-mask-height="large">${t.large}</button>
            </div>
          </div>
        </div>

        <!-- Hide Images -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.hideImages}</span>
            <label class="raawi-toggle">
              <input type="checkbox" id="raawi-toggle-hide-images" ${a.hideImages?"checked":""} aria-label="${t.toggleHideImages}">
              <span class="raawi-toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Tab Content: Tools -->
      <div id="raawi-tabpanel-tools" class="raawi-tab-body" role="tabpanel" style="display: ${i==="tools"?"flex":"none"};">
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.tools}</span>
          </div>
          <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
            ${t.statusReady} • ${t.poweredBy}
          </div>
        </div>
      </div>

      <!-- Footer Bar -->
      <footer class="raawi-panel-footer">
        <div class="raawi-status-badge">
          <span class="raawi-status-dot"></span>
          <span>${t.statusReady}</span>
        </div>
        <p class="raawi-disclaimer">${t.disclaimer}</p>
      </footer>
    `,this.attachDomEvents(),this.updateVisibility()}attachDomEvents(){const t=this.element.querySelector("#raawi-close-btn");t==null||t.addEventListener("click",s=>{s.preventDefault(),this.state.setOpen(!1)});const e=this.element.querySelector("#raawi-reset-btn");e==null||e.addEventListener("click",s=>{s.preventDefault(),this.state.resetSettings(),this.render()}),this.element.querySelectorAll(".raawi-lang-btn[data-lang]").forEach(s=>{s.addEventListener("click",o=>{o.preventDefault();const r=s.getAttribute("data-lang");r&&(this.state.setLocale(r),this.i18n.setLocale(r))})}),this.element.querySelectorAll(".raawi-tab-btn[data-tab]").forEach(s=>{s.addEventListener("click",o=>{o.preventDefault();const r=s.getAttribute("data-tab");r&&(this.state.setActiveTab(r),this.render())})}),this.element.querySelectorAll(".raawi-preset-btn[data-preset]").forEach(s=>{s.addEventListener("click",o=>{o.preventDefault();const r=s.getAttribute("data-preset");r&&(this.state.applyPreset(r),this.render())})});const g=this.element.querySelector("#raawi-btn-text-dec");g==null||g.addEventListener("click",s=>{s.preventDefault();const o=this.state.getSettings().textSize,r=Math.max(.8,Math.round((o-.1)*10)/10);this.state.updateSetting("textSize",r),this.render()});const h=this.element.querySelector("#raawi-btn-text-inc");h==null||h.addEventListener("click",s=>{s.preventDefault();const o=this.state.getSettings().textSize,r=Math.min(2,Math.round((o+.1)*10)/10);this.state.updateSetting("textSize",r),this.render()});const m=this.element.querySelector("#raawi-btn-line-dec");m==null||m.addEventListener("click",s=>{s.preventDefault();const o=this.state.getSettings().lineSpacing,r=Math.max(.8,Math.round((o-.1)*10)/10);this.state.updateSetting("lineSpacing",r),this.render()});const k=this.element.querySelector("#raawi-btn-line-inc");k==null||k.addEventListener("click",s=>{s.preventDefault();const o=this.state.getSettings().lineSpacing,r=Math.min(2,Math.round((o+.1)*10)/10);this.state.updateSetting("lineSpacing",r),this.render()});const b=this.element.querySelector("#raawi-toggle-contrast");b==null||b.addEventListener("change",()=>{this.state.updateSetting("contrastMode",b.checked)});const w=this.element.querySelector("#raawi-toggle-stop-animations");w==null||w.addEventListener("change",()=>{this.state.updateSetting("stopAnimations",w.checked)});const f=this.element.querySelector("#raawi-toggle-reading-guide");f==null||f.addEventListener("change",()=>{this.state.updateSetting("readingGuide",f.checked)});const v=this.element.querySelector("#raawi-toggle-reading-mask");v==null||v.addEventListener("change",()=>{this.state.updateSetting("readingMask",v.checked),this.render()}),this.element.querySelectorAll("button[data-mask-height]").forEach(s=>{s.addEventListener("click",o=>{o.preventDefault();const r=s.getAttribute("data-mask-height");r&&(this.state.updateSetting("readingMaskWindowHeight",r),this.render())})});const y=this.element.querySelector("#raawi-toggle-hide-images");y==null||y.addEventListener("change",()=>{this.state.updateSetting("hideImages",y.checked)}),this.element.querySelectorAll("button[data-cursor]").forEach(s=>{s.addEventListener("click",o=>{o.preventDefault();const r=s.getAttribute("data-cursor");r&&(this.state.updateSetting("bigCursor",r),this.render())})})}}class I{constructor(t){this.clearTimer=null,this.i18n=t,this.element=document.createElement("div"),this.element.id="raawi-live-announcer",this.element.className="raawi-sr-only",this.element.setAttribute("data-testid","raawi-live-announcer"),this.element.setAttribute("role","status"),this.element.setAttribute("aria-live","polite"),this.element.setAttribute("aria-atomic","true")}getElement(){return this.element}announce(t){!t||t.trim()===""||(this.clearTimer&&clearTimeout(this.clearTimer),this.element.textContent="",setTimeout(()=>{this.element.textContent=t.trim()},50),this.clearTimer=setTimeout(()=>{this.element.textContent=""},6e3))}announceOpen(){const t=this.i18n.getLocale()==="ar";this.announce(t?"تم فتح لوحة سهولة الاستخدام":"Accessibility options dialog opened")}announceClose(){const t=this.i18n.getLocale()==="ar";this.announce(t?"تم إغلاق لوحة سهولة الاستخدام":"Accessibility options dialog closed")}announceLanguageChange(t){this.announce(t==="ar"?"تم التبديل إلى اللغة العربية":"Switched interface language to English")}announcePreset(t){const e=this.i18n.getLocale()==="ar";this.announce(e?`تم تفعيل ملف الوصول: ${t}`:`Activated accessibility profile: ${t}`)}announceReset(){this.announce(this.i18n.t().resetAllConfirm)}}const O=`
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

  /* Design Tokens */
  .raawi-theme {
    --primary: #27ae60;
    --primary-hover: #219653;
    --primary-light: #e8f8f0;
    --primary-focus: rgba(39, 174, 96, 0.4);
    --surface: #ffffff;
    --surface-elevated: #f8fafc;
    --border: #e2e8f0;
    --border-hover: #cbd5e1;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-muted: #64748b;
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 16px;
    --radius-full: 9999px;
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
    background: linear-gradient(135deg, var(--primary) 0%, #1e824c 100%);
    border: 2px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 8px 20px rgba(39, 174, 96, 0.35), var(--shadow-md);
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
    box-shadow: 0 12px 24px rgba(39, 174, 96, 0.45), var(--shadow-lg);
  }

  .raawi-launcher-btn:focus-visible {
    outline: 3px solid #2563eb;
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
    box-shadow: var(--shadow-lg), 0 0 0 1px rgba(0, 0, 0, 0.05);
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
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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
    padding: 14px 18px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }

  .raawi-brand-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .raawi-brand-icon {
    width: 24px;
    height: 24px;
  }

  .raawi-brand-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .raawi-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Language Switcher */
  .raawi-lang-switch {
    display: inline-flex;
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 2px;
  }

  .raawi-lang-btn {
    border: none;
    background: transparent;
    padding: 3px 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border-radius: 4px;
    color: var(--text-secondary);
    transition: all 0.15s ease;
  }

  .raawi-lang-btn.active {
    background: var(--surface);
    color: var(--primary);
    box-shadow: var(--shadow-sm);
  }

  .raawi-icon-btn {
    border: none;
    background: transparent;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 16px;
    transition: background 0.15s ease;
  }

  .raawi-icon-btn:hover {
    background: var(--surface-elevated);
    color: var(--text-primary);
  }

  .raawi-icon-btn:focus-visible {
    outline: 2px solid var(--primary);
  }

  /* Tab Bar */
  .raawi-tab-bar {
    display: flex;
    background: var(--surface-elevated);
    border-bottom: 1px solid var(--border);
    padding: 4px 6px 0;
    overflow-x: auto;
  }

  .raawi-tab-btn {
    flex: 1;
    border: none;
    background: transparent;
    padding: 8px 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    text-align: center;
  }

  .raawi-tab-btn:hover {
    color: var(--text-primary);
  }

  .raawi-tab-btn.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
    background: var(--surface);
    border-top-left-radius: var(--radius-sm);
    border-top-right-radius: var(--radius-sm);
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
  }

  .raawi-control-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .raawi-control-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .raawi-control-desc {
    font-size: 12px;
    color: var(--text-muted);
  }

  /* Stepper Group */
  .raawi-stepper-group {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: space-between;
  }

  .raawi-stepper-btn {
    width: 34px;
    height: 34px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--surface-elevated);
    color: var(--text-primary);
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .raawi-stepper-btn:hover {
    background: var(--surface);
    border-color: var(--primary);
    color: var(--primary);
  }

  .raawi-stepper-value {
    font-size: 13px;
    font-weight: 700;
    color: var(--primary);
    min-width: 48px;
    text-align: center;
  }

  /* Switch Toggle */
  .raawi-toggle {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
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

  /* Preset Grid */
  .raawi-preset-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
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

  .raawi-preset-btn:hover {
    border-color: var(--primary);
    color: var(--primary);
  }

  .raawi-preset-btn.active {
    background: var(--primary-light);
    border-color: var(--primary);
    color: var(--primary);
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
    padding: 12px 18px;
    background: var(--surface-elevated);
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .raawi-disclaimer {
    font-size: 11px;
    line-height: 1.4;
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
    color: var(--primary);
    background: var(--primary-light);
    padding: 3px 8px;
    border-radius: var(--radius-full);
  }

  .raawi-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--primary);
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
`,x=class x extends HTMLElement{constructor(){super(),this.wasOpen=!1;const t=this.detectInitialLocale();this.state=new C(t),this.i18n=new S(this.state.getLocale()),this.shadow=this.attachShadow({mode:"open"});const e=document.createElement("style");e.textContent=O,this.shadow.appendChild(e),this.backdrop=document.createElement("div"),this.backdrop.className="raawi-backdrop",this.backdrop.setAttribute("aria-hidden","true"),this.shadow.appendChild(this.backdrop);const a=document.createElement("div");a.className="raawi-theme";const i=document.createElement("div");i.className="raawi-launcher-container",this.launcher=new R(this.state,this.i18n),i.appendChild(this.launcher.getElement()),this.panel=new $(this.state,this.i18n),a.appendChild(i),a.appendChild(this.panel.getElement()),this.shadow.appendChild(a),this.announcer=new I(this.i18n),this.shadow.appendChild(this.announcer.getElement()),this.displayManager=new E(this.state,this.shadow),this.state.subscribe(()=>{this.isConnected&&this.updateHostDirection(),this.handleStateChange()}),this.i18n.subscribe(n=>{this.announcer.announceLanguageChange(n)}),this.onDocumentKeyDown=n=>this.handleKeyDown(n),this.onDocumentFocusIn=n=>this.handleFocusIn(n),this.backdrop.addEventListener("click",n=>{n.preventDefault(),n.stopPropagation(),this.close()})}connectedCallback(){document.addEventListener("keydown",this.onDocumentKeyDown,!0),document.addEventListener("focusin",this.onDocumentFocusIn,!0),this.updateHostDirection()}disconnectedCallback(){document.removeEventListener("keydown",this.onDocumentKeyDown,!0),document.removeEventListener("focusin",this.onDocumentFocusIn,!0),this.displayManager&&this.displayManager.destroy()}open(){this.state.setOpen(!0)}close(){this.state.setOpen(!1)}toggle(){this.state.toggleOpen()}setLocale(t){this.state.setLocale(t),this.i18n.setLocale(t)}getStateManager(){return this.state}getI18nManager(){return this.i18n}getAnnouncer(){return this.announcer}getDisplayManager(){return this.displayManager}getShadowRoot(){return this.shadow}getPanelComponent(){return this.panel}getLauncherComponent(){return this.launcher}detectInitialLocale(){var t,e;if(typeof document<"u"){const a=((t=document.documentElement.lang)==null?void 0:t.toLowerCase())||"",i=((e=document.documentElement.dir)==null?void 0:e.toLowerCase())||"",n=(typeof window<"u"?window.location.hostname:"").toLowerCase();if(i==="rtl"||a.startsWith("ar")||n.endsWith(".sa"))return"ar"}return"en"}updateHostDirection(){const t=this.state.getDirection(),e=this.state.getLocale();this.setAttribute("dir",t),this.setAttribute("lang",e)}handleStateChange(){this.state.getIsOpen()?(this.backdrop.classList.add("open"),this.wasOpen||(this.wasOpen=!0,this.announcer.announceOpen(),setTimeout(()=>{this.panel.focusFirstElement()},50))):(this.backdrop.classList.remove("open"),this.wasOpen&&(this.wasOpen=!1,this.announcer.announceClose(),this.launcher&&this.launcher.getElement()&&this.launcher.getElement().isConnected&&this.launcher.focus()))}handleKeyDown(t){if(this.state.getIsOpen()){if(t.key==="Escape"){t.preventDefault(),t.stopPropagation(),this.close();return}t.key==="Tab"&&this.trapTabKey(t)}}trapTabKey(t){const e=this.panel.getFocusableElements();if(e.length===0){t.preventDefault(),this.panel.focusFirstElement();return}const a=e[0],i=e[e.length-1],n=this.shadow.activeElement||document.activeElement;t.shiftKey?(!n||n===a||!e.includes(n))&&(t.preventDefault(),i.focus()):(!n||n===i||!e.includes(n))&&(t.preventDefault(),a.focus())}handleFocusIn(t){if(!this.state.getIsOpen())return;const e=t.target;e&&e!==this&&!this.contains(e)&&this.panel.focusFirstElement()}};x.TAG_NAME="raawi-accessibility-widget";let l=x;function D(c){const t=typeof customElements<"u"?customElements:null;t&&!t.get(l.TAG_NAME)&&t.define(l.TAG_NAME,l)}D();const d=class d{static init(){if(typeof document>"u")return null;let t=document.querySelector(l.TAG_NAME);return t||(t=document.createElement(l.TAG_NAME),document.body.appendChild(t)),d.instance=t,typeof window<"u"&&(window.raawiAccessibilityWidget=t,window.RaawiXAccessibility=d),t}static getInstance(){return d.instance}static destroy(){d.instance&&(d.instance.remove(),d.instance=null)}};d.instance=null;let p=d;if(typeof window<"u"){const c=()=>{document.querySelector(l.TAG_NAME)||p.init()};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",c):c()}return Object.assign(p,{RaawiAccessibilityWidget:l,StateManager:C,I18nManager:S,AccessibilityWidget:p})}();
