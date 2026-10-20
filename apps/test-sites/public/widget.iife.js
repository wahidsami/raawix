this.RaawiXAccessibility=function(){"use strict";const S={ar:{widgetTitle:"أدوات الوصول وسهولة الاستخدام",openOptions:"فتح خيارات سهولة الاستخدام",closeOptions:"إغلاق لوحة سهولة الاستخدام",resetAll:"إعادة ضبط الإعدادات",resetAllConfirm:"تمت استعادة الإعدادات الافتراضية بنجاح",assist:"المساعدة",vision:"الرؤية",reading:"القراءة",tools:"الأدوات",presets:"الملفات المخصصة السريعة",presetBlind:"إمكانية وصول لفاقدي البصر",presetLowVision:"ضعف البصر وتباين عالٍ",presetDyslexia:"عسر القراءة والتركيز",presetNone:"الوضع الافتراضي (إيقاف)",textSize:"حجم الخط",increaseTextSize:"تكبير حجم الخط",decreaseTextSize:"تصغير حجم الخط",lineSpacing:"تباعد الأسطر",increaseLineSpacing:"زيادة تباعد الأسطر",decreaseLineSpacing:"تقليل تباعد الأسطر",highContrastMode:"وضع التباين العالي",toggleHighContrast:"تبديل وضع التباين العالي",focusHighlight:"إبراز مؤشر التركيز",toggleFocusHighlight:"تبديل إبراز مؤشر التركيز",stopAnimations:"إيقاف الرسوم المتحركة",toggleStopAnimations:"تبديل إيقاف الرسوم المتحركة",reduceMotion:"تقليل الحركة",toggleReduceMotion:"تبديل تقليل الحركة",bigCursor:"مؤشر الفأرة الكبير",selectBigCursor:"اختيار نمط المؤشر الكبير",bigDarkCursor:"مؤشر كبير داكن",bigLightCursor:"مؤشر كبير فاتح",off:"إيقاف",readingMode:"وضع القراءة المركزة",toggleReadingMode:"تبديل وضع القراءة",readingGuide:"مسطرة القراءة الأفقية",toggleReadingGuide:"تبديل مسطرة القراءة",readingMask:"قناع حجب وتظليل القراءة",toggleReadingMask:"تبديل قناع القراءة",maskWindowHeight:"ارتفاع نافذة القراءة",small:"صغير",medium:"متوسط",large:"كبير",hideImages:"إخفاء الصور",toggleHideImages:"تبديل إخفاء الصور",imageCaptions:"عرض التسميات التوضيحية للصور",toggleImageCaptions:"تبديل عرض التسميات التوضيحية",describeImage:"وصف الصورة الحالية",describeFocusedElement:"وصف العنصر المحدّد",whatCanIDoHere:"ماذا يمكنني أن أفعل هنا؟",disclaimer:"راوي إكس يوفر أدوات مساعدة للتصفح والقراءة، ولا يغني عن الامتثال لمعايير WCAG 2.1 AA.",statusReady:"جاهز ونشط",statusOffline:"الوضع المحلي المستقل",statusStale:"تنبيه: تغير محتوى الصفحة منذ آخر مسح",statusRemediated:"تمت معالجة العناصر بدقة عالية",poweredBy:"منصة راوي إكس الرقمية"},en:{widgetTitle:"Accessibility & Usability Options",openOptions:"Open accessibility options",closeOptions:"Close accessibility panel",resetAll:"Reset all settings",resetAllConfirm:"Settings restored to default successfully",assist:"Assist",vision:"Vision",reading:"Reading",tools:"Tools",presets:"Quick Accessibility Profiles",presetBlind:"Blind Access Profile",presetLowVision:"Low Vision & Contrast",presetDyslexia:"Dyslexia & Focus",presetNone:"Default (Off)",textSize:"Text Size",increaseTextSize:"Increase text size",decreaseTextSize:"Decrease text size",lineSpacing:"Line Spacing",increaseLineSpacing:"Increase line spacing",decreaseLineSpacing:"Decrease line spacing",highContrastMode:"High Contrast Mode",toggleHighContrast:"Toggle high contrast mode",focusHighlight:"Focus Highlight",toggleFocusHighlight:"Toggle focus highlight ring",stopAnimations:"Stop Animations",toggleStopAnimations:"Toggle stop animations",reduceMotion:"Reduce Motion",toggleReduceMotion:"Toggle reduce motion",bigCursor:"Large Cursor",selectBigCursor:"Select large cursor mode",bigDarkCursor:"Large Dark Cursor",bigLightCursor:"Large Light Cursor",off:"Off",readingMode:"Reading Mode",toggleReadingMode:"Toggle reading mode",readingGuide:"Reading Guide Ruler",toggleReadingGuide:"Toggle reading guide ruler",readingMask:"Reading Focus Mask",toggleReadingMask:"Toggle reading mask",maskWindowHeight:"Mask Window Height",small:"Small",medium:"Medium",large:"Large",hideImages:"Hide Images",toggleHideImages:"Toggle hide images",imageCaptions:"Show Image Captions",toggleImageCaptions:"Toggle show image captions",describeImage:"Describe current image",describeFocusedElement:"Describe focused element",whatCanIDoHere:"What can I do here?",disclaimer:"Raawi X provides assistive navigation aids and does not substitute for native WCAG 2.1 AA compliance.",statusReady:"Active & Ready",statusOffline:"Standalone / Offline Mode",statusStale:"Notice: Page content changed since last scan",statusRemediated:"High-confidence remediations applied",poweredBy:"Raawi X Platform"}};class A{constructor(e="ar"){this.listeners=[],this.currentLocale=e}getLocale(){return this.currentLocale}setLocale(e){if(this.currentLocale!==e){this.currentLocale=e;for(const t of this.listeners)t(e)}}t(){return S[this.currentLocale]}get(e){return S[this.currentLocale][e]||e}subscribe(e){return this.listeners.push(e),()=>{this.listeners=this.listeners.filter(t=>t!==e)}}}const p={textSize:1,lineSpacing:1,contrastMode:!1,stopAnimations:!1,reduceMotion:!1,bigCursor:"off",readingGuide:!1,readingMask:!1,readingMaskWindowHeight:"medium",hideImages:!1,imageCaptions:!1,magnifier:!1,magnifierZoom:2,activePreset:"none"},L="raawi_accessibility_settings_v2",C="raawi_accessibility_locale";class E{constructor(e="ar"){this.isOpen=!1,this.activeTab="assist",this.listeners=[],this.locale=this.loadLocale(e),this.settings=this.loadSettings()}getSettings(){return{...this.settings}}getLocale(){return this.locale}getDirection(){return this.locale==="ar"?"rtl":"ltr"}getIsOpen(){return this.isOpen}getActiveTab(){return this.activeTab}setOpen(e){this.isOpen!==e&&(this.isOpen=e,this.notify())}toggleOpen(){this.setOpen(!this.isOpen)}setActiveTab(e){this.activeTab!==e&&(this.activeTab=e,this.notify())}setLocale(e){this.locale!==e&&(this.locale=e,this.saveLocale(e),this.notify())}updateSetting(e,t){this.settings[e]=t,e!=="activePreset"&&this.settings.activePreset!=="none"&&(this.settings.activePreset="none"),this.saveSettings(),this.notify()}applyPreset(e){if(e==="none"){this.resetSettings();return}e==="blind"?this.settings={...p,activePreset:"blind",imageCaptions:!0}:e==="low-vision"?this.settings={...p,activePreset:"low-vision",textSize:1.3,contrastMode:!0,bigCursor:"dark"}:e==="dyslexia"&&(this.settings={...p,activePreset:"dyslexia",lineSpacing:1.4,readingGuide:!0,stopAnimations:!0}),this.saveSettings(),this.notify()}resetSettings(){this.settings={...p},this.saveSettings(),this.notify()}subscribe(e){return this.listeners.push(e),()=>{this.listeners=this.listeners.filter(t=>t!==e)}}notify(){for(const e of this.listeners)try{e()}catch(t){console.error("[RaawiX Widget] State listener error:",t)}}loadSettings(){try{if(typeof window<"u"&&window.localStorage){const e=window.localStorage.getItem(L);if(e){const t=JSON.parse(e);return{...p,...t}}}}catch{}return{...p}}saveSettings(){try{typeof window<"u"&&window.localStorage&&window.localStorage.setItem(L,JSON.stringify(this.settings))}catch{}}loadLocale(e){try{if(typeof window<"u"&&window.localStorage){const t=window.localStorage.getItem(C);if(t==="ar"||t==="en")return t}}catch{}return e}saveLocale(e){try{typeof window<"u"&&window.localStorage&&window.localStorage.setItem(C,e)}catch{}}}const T=`
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
`;class ${constructor(e,t){this.state=e,this.i18n=t,this.element=document.createElement("button"),this.element.className="raawi-launcher-btn",this.element.setAttribute("type","button"),this.element.setAttribute("data-testid","raawi-launcher"),this.element.setAttribute("aria-haspopup","dialog"),this.element.setAttribute("aria-controls","raawi-accessibility-panel"),this.element.innerHTML=T,this.updateAria(),this.setupEvents(),this.state.subscribe(()=>this.updateAria()),this.i18n.subscribe(()=>this.updateAria())}getElement(){return this.element}focus(){this.element.focus()}updateAria(){const e=this.state.getIsOpen();this.element.setAttribute("aria-expanded",e?"true":"false"),this.element.setAttribute("aria-label",e?this.i18n.t().closeOptions:this.i18n.t().openOptions),this.element.setAttribute("title",e?this.i18n.t().closeOptions:this.i18n.t().openOptions)}setupEvents(){this.element.addEventListener("click",e=>{e.preventDefault(),e.stopPropagation(),this.state.toggleOpen()}),this.element.addEventListener("keydown",e=>{(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),e.stopPropagation(),this.state.toggleOpen())})}}class M{constructor(e,t){this.state=e,this.i18n=t,this.lastTab=this.state.getActiveTab(),this.element=document.createElement("section"),this.element.id="raawi-accessibility-panel",this.element.className="raawi-panel-container",this.element.setAttribute("data-testid","raawi-panel"),this.element.setAttribute("role","dialog"),this.element.setAttribute("aria-labelledby","raawi-panel-title"),this.render(),this.updateVisibility(),this.state.subscribe(()=>{this.updateVisibility();const a=this.state.getActiveTab();a!==this.lastTab&&(this.lastTab=a,this.render())}),this.i18n.subscribe(()=>this.render())}getElement(){return this.element}getFocusableElements(){const e=["a[href]","button:not([disabled])","input:not([disabled])","select:not([disabled])","textarea:not([disabled])",'[tabindex]:not([tabindex="-1"])'].join(", ");return Array.from(this.element.querySelectorAll(e)).filter(a=>{if(a.hasAttribute("disabled")||a.getAttribute("aria-hidden")==="true")return!1;const i=a.closest('[role="tabpanel"]');return!(i&&i.style.display==="none"||a.offsetParent===null&&a.offsetWidth===0&&a.offsetHeight===0&&i&&i.style.display==="none")})}focusFirstElement(){const e=this.getFocusableElements(),t=this.element.querySelector('[data-testid="raawi-close"]');if(t&&e.includes(t)){t.focus();return}if(e.length>0){e[0].focus();return}const a=this.element.querySelector("#raawi-panel-title");a?a.focus():this.element.focus()}focusLastElement(){const e=this.getFocusableElements();e.length>0?e[e.length-1].focus():this.focusFirstElement()}updateVisibility(){this.state.getIsOpen()?(this.element.classList.add("open"),this.element.removeAttribute("hidden"),this.element.setAttribute("aria-modal","true")):(this.element.classList.remove("open"),this.element.setAttribute("hidden",""),this.element.setAttribute("aria-modal","false"))}render(){const e=this.i18n.t(),t=this.state.getLocale(),a=this.state.getSettings(),i=this.state.getActiveTab();this.element.innerHTML=`
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
          <h2 id="raawi-panel-title" class="raawi-brand-title" tabindex="-1">${e.widgetTitle}</h2>
        </div>
        
        <div class="raawi-header-actions">
          <div class="raawi-lang-switch">
            <button type="button" class="raawi-lang-btn ${t==="ar"?"active":""}" data-lang="ar" data-testid="raawi-lang-switch" aria-label="العربية">العربية</button>
            <button type="button" class="raawi-lang-btn ${t==="en"?"active":""}" data-lang="en" data-testid="raawi-lang-switch" aria-label="English">EN</button>
          </div>

          <button type="button" class="raawi-icon-btn" id="raawi-reset-btn" aria-label="${e.resetAll}" title="${e.resetAll}">↻</button>
          <button type="button" class="raawi-icon-btn" id="raawi-close-btn" data-testid="raawi-close" aria-label="${e.closeOptions}" title="${e.closeOptions}">✕</button>
        </div>
      </header>

      <!-- Tab Navigation -->
      <nav class="raawi-tab-bar" role="tablist" aria-label="${e.widgetTitle}">
        <button type="button" class="raawi-tab-btn ${i==="assist"?"active":""}" data-tab="assist" data-testid="raawi-tab-assist" role="tab" aria-selected="${i==="assist"}">${e.assist}</button>
        <button type="button" class="raawi-tab-btn ${i==="vision"?"active":""}" data-tab="vision" data-testid="raawi-tab-vision" role="tab" aria-selected="${i==="vision"}">${e.vision}</button>
        <button type="button" class="raawi-tab-btn ${i==="reading"?"active":""}" data-tab="reading" data-testid="raawi-tab-reading" role="tab" aria-selected="${i==="reading"}">${e.reading}</button>
        <button type="button" class="raawi-tab-btn ${i==="tools"?"active":""}" data-tab="tools" data-testid="raawi-tab-tools" role="tab" aria-selected="${i==="tools"}">${e.tools}</button>
      </nav>

      <!-- Tab Content: Assist -->
      <div id="raawi-tabpanel-assist" class="raawi-tab-body" role="tabpanel" style="display: ${i==="assist"?"flex":"none"};">
        <!-- Presets -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${e.presets}</span>
          </div>
          <div class="raawi-preset-grid">
            <button type="button" class="raawi-preset-btn ${a.activePreset==="blind"?"active":""}" data-preset="blind" data-testid="raawi-preset-blind">${e.presetBlind}</button>
            <button type="button" class="raawi-preset-btn ${a.activePreset==="low-vision"?"active":""}" data-preset="low-vision" data-testid="raawi-preset-lowvision">${e.presetLowVision}</button>
            <button type="button" class="raawi-preset-btn ${a.activePreset==="dyslexia"?"active":""}" data-preset="dyslexia" data-testid="raawi-preset-dyslexia">${e.presetDyslexia}</button>
            <button type="button" class="raawi-preset-btn ${a.activePreset==="none"?"active":""}" data-preset="none">${e.presetNone}</button>
          </div>
        </div>

        <!-- Quick AI Tools -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${e.assist}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button type="button" class="raawi-action-btn" id="raawi-btn-describe-image" data-testid="raawi-tool-describe-image">
              <span aria-hidden="true">🖼️</span> ${e.describeImage}
            </button>
            <button type="button" class="raawi-action-btn" id="raawi-btn-describe-focused" data-testid="raawi-tool-describe-focused">
              <span aria-hidden="true">🎯</span> ${e.describeFocusedElement}
            </button>
            <button type="button" class="raawi-action-btn" id="raawi-btn-what-can-i-do" data-testid="raawi-tool-what-can-i-do">
              <span aria-hidden="true">🧭</span> ${e.whatCanIDoHere}
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
              <div class="raawi-control-title">${e.textSize}</div>
              <div class="raawi-control-desc">80% - 200%</div>
            </div>
            <div class="raawi-stepper-group">
              <button type="button" class="raawi-stepper-btn" id="raawi-btn-text-dec" aria-label="${e.decreaseTextSize}">-</button>
              <span class="raawi-stepper-value" id="raawi-text-size-val" aria-live="polite">${Math.round(a.textSize*100)}%</span>
              <button type="button" class="raawi-stepper-btn" id="raawi-btn-text-inc" aria-label="${e.increaseTextSize}">+</button>
            </div>
          </div>
        </div>

        <!-- Line Spacing -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <div>
              <div class="raawi-control-title">${e.lineSpacing}</div>
              <div class="raawi-control-desc">80% - 200%</div>
            </div>
            <div class="raawi-stepper-group">
              <button type="button" class="raawi-stepper-btn" id="raawi-btn-line-dec" aria-label="${e.decreaseLineSpacing}">-</button>
              <span class="raawi-stepper-value" id="raawi-line-spacing-val" aria-live="polite">${Math.round(a.lineSpacing*100)}%</span>
              <button type="button" class="raawi-stepper-btn" id="raawi-btn-line-inc" aria-label="${e.increaseLineSpacing}">+</button>
            </div>
          </div>
        </div>

        <!-- Contrast Mode Toggle -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${e.highContrastMode}</span>
            <label class="raawi-toggle">
              <input type="checkbox" id="raawi-toggle-contrast" ${a.contrastMode?"checked":""} aria-label="${e.toggleHighContrast}">
              <span class="raawi-toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Stop Animations Toggle -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${e.stopAnimations}</span>
            <label class="raawi-toggle">
              <input type="checkbox" id="raawi-toggle-stop-animations" data-testid="raawi-tool-stop-animations" ${a.stopAnimations?"checked":""} aria-label="${e.toggleStopAnimations}">
              <span class="raawi-toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Large Cursor Toggle -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${e.bigCursor}</span>
            <div class="raawi-lang-switch">
              <button type="button" class="raawi-lang-btn ${a.bigCursor==="off"?"active":""}" data-cursor="off">${e.off}</button>
              <button type="button" class="raawi-lang-btn ${a.bigCursor==="dark"?"active":""}" data-cursor="dark">${e.bigDarkCursor}</button>
              <button type="button" class="raawi-lang-btn ${a.bigCursor==="light"?"active":""}" data-cursor="light">${e.bigLightCursor}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Content: Reading -->
      <div id="raawi-tabpanel-reading" class="raawi-tab-body" role="tabpanel" style="display: ${i==="reading"?"flex":"none"};">
        <!-- Reading Guide Ruler -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${e.readingGuide}</span>
            <label class="raawi-toggle">
              <input type="checkbox" id="raawi-toggle-reading-guide" data-testid="raawi-tool-reading-guide" ${a.readingGuide?"checked":""} aria-label="${e.toggleReadingGuide}">
              <span class="raawi-toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Reading Focus Mask -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${e.readingMask}</span>
            <label class="raawi-toggle">
              <input type="checkbox" id="raawi-toggle-reading-mask" data-testid="raawi-tool-reading-mask" ${a.readingMask?"checked":""} aria-label="${e.toggleReadingMask}">
              <span class="raawi-toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Hide Images -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${e.hideImages}</span>
            <label class="raawi-toggle">
              <input type="checkbox" id="raawi-toggle-hide-images" ${a.hideImages?"checked":""} aria-label="${e.toggleHideImages}">
              <span class="raawi-toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Tab Content: Tools -->
      <div id="raawi-tabpanel-tools" class="raawi-tab-body" role="tabpanel" style="display: ${i==="tools"?"flex":"none"};">
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${e.tools}</span>
          </div>
          <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
            ${e.statusReady} • ${e.poweredBy}
          </div>
        </div>
      </div>

      <!-- Footer Bar -->
      <footer class="raawi-panel-footer">
        <div class="raawi-status-badge">
          <span class="raawi-status-dot"></span>
          <span>${e.statusReady}</span>
        </div>
        <p class="raawi-disclaimer">${e.disclaimer}</p>
      </footer>
    `,this.attachDomEvents(),this.updateVisibility()}attachDomEvents(){const e=this.element.querySelector("#raawi-close-btn");e==null||e.addEventListener("click",s=>{s.preventDefault(),this.state.setOpen(!1)});const t=this.element.querySelector("#raawi-reset-btn");t==null||t.addEventListener("click",s=>{s.preventDefault(),this.state.resetSettings()}),this.element.querySelectorAll(".raawi-lang-btn[data-lang]").forEach(s=>{s.addEventListener("click",o=>{o.preventDefault();const n=s.getAttribute("data-lang");n&&(this.state.setLocale(n),this.i18n.setLocale(n))})}),this.element.querySelectorAll(".raawi-tab-btn[data-tab]").forEach(s=>{s.addEventListener("click",o=>{o.preventDefault();const n=s.getAttribute("data-tab");n&&(this.state.setActiveTab(n),this.render())})}),this.element.querySelectorAll(".raawi-preset-btn[data-preset]").forEach(s=>{s.addEventListener("click",o=>{o.preventDefault();const n=s.getAttribute("data-preset");n&&(this.state.applyPreset(n),this.render())})});const v=this.element.querySelector("#raawi-btn-text-dec");v==null||v.addEventListener("click",s=>{s.preventDefault();const o=this.state.getSettings().textSize,n=Math.max(.8,Math.round((o-.1)*10)/10);this.state.updateSetting("textSize",n),this.render()});const x=this.element.querySelector("#raawi-btn-text-inc");x==null||x.addEventListener("click",s=>{s.preventDefault();const o=this.state.getSettings().textSize,n=Math.min(2,Math.round((o+.1)*10)/10);this.state.updateSetting("textSize",n),this.render()});const y=this.element.querySelector("#raawi-btn-line-dec");y==null||y.addEventListener("click",s=>{s.preventDefault();const o=this.state.getSettings().lineSpacing,n=Math.max(.8,Math.round((o-.1)*10)/10);this.state.updateSetting("lineSpacing",n),this.render()});const k=this.element.querySelector("#raawi-btn-line-inc");k==null||k.addEventListener("click",s=>{s.preventDefault();const o=this.state.getSettings().lineSpacing,n=Math.min(2,Math.round((o+.1)*10)/10);this.state.updateSetting("lineSpacing",n),this.render()});const g=this.element.querySelector("#raawi-toggle-contrast");g==null||g.addEventListener("change",()=>{this.state.updateSetting("contrastMode",g.checked)});const h=this.element.querySelector("#raawi-toggle-stop-animations");h==null||h.addEventListener("change",()=>{this.state.updateSetting("stopAnimations",h.checked)});const b=this.element.querySelector("#raawi-toggle-reading-guide");b==null||b.addEventListener("change",()=>{this.state.updateSetting("readingGuide",b.checked)});const w=this.element.querySelector("#raawi-toggle-reading-mask");w==null||w.addEventListener("change",()=>{this.state.updateSetting("readingMask",w.checked)});const f=this.element.querySelector("#raawi-toggle-hide-images");f==null||f.addEventListener("change",()=>{this.state.updateSetting("hideImages",f.checked)}),this.element.querySelectorAll("button[data-cursor]").forEach(s=>{s.addEventListener("click",o=>{o.preventDefault();const n=s.getAttribute("data-cursor");n&&(this.state.updateSetting("bigCursor",n),this.render())})})}}class O{constructor(e){this.clearTimer=null,this.i18n=e,this.element=document.createElement("div"),this.element.id="raawi-live-announcer",this.element.className="raawi-sr-only",this.element.setAttribute("data-testid","raawi-live-announcer"),this.element.setAttribute("role","status"),this.element.setAttribute("aria-live","polite"),this.element.setAttribute("aria-atomic","true")}getElement(){return this.element}announce(e){!e||e.trim()===""||(this.clearTimer&&clearTimeout(this.clearTimer),this.element.textContent="",setTimeout(()=>{this.element.textContent=e.trim()},50),this.clearTimer=setTimeout(()=>{this.element.textContent=""},6e3))}announceOpen(){const e=this.i18n.getLocale()==="ar";this.announce(e?"تم فتح لوحة سهولة الاستخدام":"Accessibility options dialog opened")}announceClose(){const e=this.i18n.getLocale()==="ar";this.announce(e?"تم إغلاق لوحة سهولة الاستخدام":"Accessibility options dialog closed")}announceLanguageChange(e){this.announce(e==="ar"?"تم التبديل إلى اللغة العربية":"Switched interface language to English")}announcePreset(e){const t=this.i18n.getLocale()==="ar";this.announce(t?`تم تفعيل ملف الوصول: ${e}`:`Activated accessibility profile: ${e}`)}announceReset(){this.announce(this.i18n.t().resetAllConfirm)}}const D=`
  :host {
    all: initial;
    position: fixed;
    z-index: 2147483640;
    pointer-events: auto;
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
`,m=class m extends HTMLElement{constructor(){super(),this.wasOpen=!1;const e=this.detectInitialLocale();this.state=new E(e),this.i18n=new A(this.state.getLocale()),this.shadow=this.attachShadow({mode:"open"});const t=document.createElement("style");t.textContent=D,this.shadow.appendChild(t),this.backdrop=document.createElement("div"),this.backdrop.className="raawi-backdrop",this.backdrop.setAttribute("aria-hidden","true"),this.shadow.appendChild(this.backdrop);const a=document.createElement("div");a.className="raawi-theme";const i=document.createElement("div");i.className="raawi-launcher-container",this.launcher=new $(this.state,this.i18n),i.appendChild(this.launcher.getElement()),this.panel=new M(this.state,this.i18n),a.appendChild(i),a.appendChild(this.panel.getElement()),this.shadow.appendChild(a),this.announcer=new O(this.i18n),this.shadow.appendChild(this.announcer.getElement()),this.state.subscribe(()=>{this.isConnected&&this.updateHostDirection(),this.handleStateChange()}),this.i18n.subscribe(r=>{this.announcer.announceLanguageChange(r)}),this.onDocumentKeyDown=r=>this.handleKeyDown(r),this.onDocumentFocusIn=r=>this.handleFocusIn(r),this.backdrop.addEventListener("click",r=>{r.preventDefault(),r.stopPropagation(),this.close()})}connectedCallback(){document.addEventListener("keydown",this.onDocumentKeyDown,!0),document.addEventListener("focusin",this.onDocumentFocusIn,!0),this.updateHostDirection()}disconnectedCallback(){document.removeEventListener("keydown",this.onDocumentKeyDown,!0),document.removeEventListener("focusin",this.onDocumentFocusIn,!0)}open(){this.state.setOpen(!0)}close(){this.state.setOpen(!1)}toggle(){this.state.toggleOpen()}setLocale(e){this.state.setLocale(e),this.i18n.setLocale(e)}getStateManager(){return this.state}getI18nManager(){return this.i18n}getAnnouncer(){return this.announcer}getShadowRoot(){return this.shadow}getPanelComponent(){return this.panel}getLauncherComponent(){return this.launcher}detectInitialLocale(){var e,t;if(typeof document<"u"){const a=((e=document.documentElement.lang)==null?void 0:e.toLowerCase())||"",i=((t=document.documentElement.dir)==null?void 0:t.toLowerCase())||"",r=(typeof window<"u"?window.location.hostname:"").toLowerCase();if(i==="rtl"||a.startsWith("ar")||r.endsWith(".sa"))return"ar"}return"en"}updateHostDirection(){const e=this.state.getDirection(),t=this.state.getLocale();this.setAttribute("dir",e),this.setAttribute("lang",t)}handleStateChange(){this.state.getIsOpen()?(this.backdrop.classList.add("open"),this.wasOpen||(this.wasOpen=!0,this.announcer.announceOpen(),setTimeout(()=>{this.panel.focusFirstElement()},50))):(this.backdrop.classList.remove("open"),this.wasOpen&&(this.wasOpen=!1,this.announcer.announceClose(),this.launcher&&this.launcher.getElement()&&this.launcher.getElement().isConnected&&this.launcher.focus()))}handleKeyDown(e){if(this.state.getIsOpen()){if(e.key==="Escape"){e.preventDefault(),e.stopPropagation(),this.close();return}e.key==="Tab"&&this.trapTabKey(e)}}trapTabKey(e){const t=this.panel.getFocusableElements();if(t.length===0){e.preventDefault(),this.panel.focusFirstElement();return}const a=t[0],i=t[t.length-1],r=this.shadow.activeElement||document.activeElement;e.shiftKey?(!r||r===a||!t.includes(r))&&(e.preventDefault(),i.focus()):(!r||r===i||!t.includes(r))&&(e.preventDefault(),a.focus())}handleFocusIn(e){if(!this.state.getIsOpen())return;const t=e.target;t&&t!==this&&!this.contains(t)&&this.panel.focusFirstElement()}};m.TAG_NAME="raawi-accessibility-widget";let l=m;function I(d){const e=typeof customElements<"u"?customElements:null;e&&!e.get(l.TAG_NAME)&&e.define(l.TAG_NAME,l)}I();const c=class c{static init(){if(typeof document>"u")return null;let e=document.querySelector(l.TAG_NAME);return e||(e=document.createElement(l.TAG_NAME),document.body.appendChild(e)),c.instance=e,typeof window<"u"&&(window.raawiAccessibilityWidget=e,window.RaawiXAccessibility=c),e}static getInstance(){return c.instance}static destroy(){c.instance&&(c.instance.remove(),c.instance=null)}};c.instance=null;let u=c;if(typeof window<"u"){const d=()=>{document.querySelector(l.TAG_NAME)||u.init()};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",d):d()}return Object.assign(u,{RaawiAccessibilityWidget:l,StateManager:E,I18nManager:A,AccessibilityWidget:u})}();
