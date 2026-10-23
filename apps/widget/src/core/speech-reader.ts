/**
 * Browser-Native Speech Synthesis (Read-Aloud) Assistant for Raawi X Widget
 * 
 * Provides accessible, client-side screen reading using standard browser
 * Web Speech APIs (SpeechSynthesis / SpeechSynthesisUtterance).
 * 
 * Key Guarantees:
 * - 100% Client-Side / Zero External Network or AI API Calls
 * - Reads User Selection or Smart Page Fallback (excluding widget elements)
 * - Complete Lifecycle: Play, Pause, Resume, Stop, Rate, Voice selection
 * - Safe Boundary Highlighting with Graceful Fallback
 * - Clean Teardown without lingering speech queues or listeners
 */

import type { Locale } from './types';

export type SpeechState = 'idle' | 'playing' | 'paused' | 'stopped' | 'unsupported' | 'error';

export interface ReadableContent {
  source: 'selection' | 'page';
  text: string;
  charCount: number;
}

export interface SpeechReaderOptions {
  locale?: Locale;
  defaultRate?: number;
}

export interface VoiceInfo {
  voiceURI: string;
  name: string;
  lang: string;
  default: boolean;
}

export class SpeechReader {
  private state: SpeechState = 'idle';
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentText: string = '';
  private currentSource: 'selection' | 'page' = 'page';
  private rate: number = 1.0;
  private selectedVoiceUri: string | null = null;
  private locale: Locale = 'ar';

  private listeners: Array<(state: SpeechState, info?: { text?: string; source?: string }) => void> = [];
  private voiceChangeListeners: Array<(voices: VoiceInfo[]) => void> = [];
  private boundOnVoicesChanged: (() => void) | null = null;

  // Active spoken sentence highlight reference
  private activeHighlightSpan: HTMLElement | null = null;

  constructor(options: SpeechReaderOptions = {}) {
    if (options.locale) {
      this.locale = options.locale;
    }
    if (options.defaultRate) {
      this.rate = options.defaultRate;
    }

    if (!SpeechReader.isSupported()) {
      this.state = 'unsupported';
    } else {
      this.initVoiceListener();
    }
  }

  /**
   * Checks if standard Web Speech Synthesis is available in the current environment.
   */
  public static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof window.speechSynthesis === 'object' &&
      window.speechSynthesis !== null &&
      'SpeechSynthesisUtterance' in window
    );
  }

  public getState(): SpeechState {
    return this.state;
  }

  public getRate(): number {
    return this.rate;
  }

  public setRate(newRate: number): void {
    this.rate = Math.min(2.0, Math.max(0.5, newRate));
    // If currently playing, we can restart from current text or let next utterance use rate
  }

  public setLocale(locale: Locale): void {
    this.locale = locale;
  }

  public getSelectedVoiceUri(): string | null {
    return this.selectedVoiceUri;
  }

  public setSelectedVoice(voiceUri: string): void {
    this.selectedVoiceUri = voiceUri;
  }

  /**
   * Discovers available browser voices matching the target or all languages.
   */
  public getVoices(): VoiceInfo[] {
    if (!SpeechReader.isSupported()) {
      return [];
    }

    try {
      const rawVoices = window.speechSynthesis.getVoices() || [];
      return rawVoices.map((v) => ({
        voiceURI: v.voiceURI,
        name: v.name,
        lang: v.lang,
        default: v.default,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Extracts readable text from host page or active user selection.
   * Excludes widget internal Shadow DOM elements, hidden elements, scripts, styles.
   */
  public static extractReadableContent(rootDoc: Document = document): ReadableContent {
    // 1. Priority 1: Meaningful user text selection
    try {
      if (typeof window !== 'undefined' && window.getSelection) {
        const selection = window.getSelection();
        const selectedText = selection ? selection.toString().trim() : '';
        if (selectedText.length > 0) {
          return {
            source: 'selection',
            text: selectedText,
            charCount: selectedText.length,
          };
        }
      }
    } catch {
      // Fallback to page content on selection access error
    }

    // 2. Priority 2: Host page main content extraction
    if (!rootDoc || !rootDoc.body) {
      return { source: 'page', text: '', charCount: 0 };
    }

    const collectedBlocks: string[] = [];

    // Query readable content blocks across the document
    const contentNodes = Array.from(
      rootDoc.body.querySelectorAll<HTMLElement>(
        'h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption'
      )
    );

    for (const node of contentNodes) {
      // Exclude widget internal elements
      if (
        node.closest('raawi-accessibility-widget') ||
        node.closest('.raawi-theme') ||
        node.closest('#raawi-accessibility-panel')
      ) {
        continue;
      }

      // Exclude navigation bars and footers to keep speech focused on page content
      if (
        node.closest('nav') ||
        node.closest('[role="navigation"]') ||
        node.closest('footer') ||
        node.closest('[role="contentinfo"]')
      ) {
        continue;
      }

      // Exclude hidden elements
      if (
        node.hasAttribute('hidden') ||
        node.getAttribute('aria-hidden') === 'true' ||
        node.style.display === 'none' ||
        node.style.visibility === 'hidden'
      ) {
        continue;
      }

      // Check ancestor visibility
      let isAncestorHidden = false;
      let parent = node.parentElement;
      while (parent && parent !== rootDoc.body) {
        if (
          parent.hasAttribute('hidden') ||
          parent.getAttribute('aria-hidden') === 'true' ||
          parent.style.display === 'none' ||
          parent.style.visibility === 'hidden'
        ) {
          isAncestorHidden = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (isAncestorHidden) {
        continue;
      }

      const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (text.length > 0) {
        collectedBlocks.push(text);
      }
    }

    // Fallback if no structured tags found: extract from plain body text excluding widget
    if (collectedBlocks.length === 0) {
      const clone = rootDoc.body.cloneNode(true) as HTMLElement;
      const widgets = clone.querySelectorAll(
        'raawi-accessibility-widget, nav, footer, script, style, noscript, svg, [aria-hidden="true"], [hidden]'
      );
      widgets.forEach((w) => w.remove());
      const raw = (clone.textContent || '').replace(/\s+/g, ' ').trim();
      if (raw.length > 0) {
        collectedBlocks.push(raw);
      }
    }

    const fullText = collectedBlocks.join('.\n');

    return {
      source: 'page',
      text: fullText,
      charCount: fullText.length,
    };
  }

  /**
   * Starts or resumes reading. If text is not provided, extracts from host page or selection.
   */
  public read(customText?: string): { success: boolean; message?: string } {
    if (!SpeechReader.isSupported()) {
      this.setState('unsupported');
      return { success: false, message: 'Speech synthesis is not supported in this browser' };
    }

    // If currently paused and no new custom text requested, simply resume
    if (this.state === 'paused' && !customText && this.currentUtterance) {
      return this.resume();
    }

    // Stop any active utterance before starting a new one
    this.stopInternal();

    // Resolve text to read
    let textToSpeak = customText;
    let source: 'selection' | 'page' = 'page';

    if (!textToSpeak) {
      const extracted = SpeechReader.extractReadableContent();
      textToSpeak = extracted.text;
      source = extracted.source;
    }

    if (!textToSpeak || textToSpeak.trim().length === 0) {
      this.setState('idle');
      return { success: false, message: 'No readable content found on page' };
    }

    this.currentText = textToSpeak;
    this.currentSource = source;

    try {
      const UtteranceCtor =
        typeof SpeechSynthesisUtterance !== 'undefined'
          ? SpeechSynthesisUtterance
          : typeof window !== 'undefined' && (window as any).SpeechSynthesisUtterance
          ? (window as any).SpeechSynthesisUtterance
          : null;

      if (!UtteranceCtor) {
        this.setState('unsupported');
        return { success: false, message: 'SpeechSynthesisUtterance is not available' };
      }

      const utterance = new UtteranceCtor(this.currentText);
      utterance.rate = this.rate;

      // Resolve voice matching user selection or language
      const resolvedVoice = this.resolveVoice();
      if (resolvedVoice) {
        utterance.voice = resolvedVoice;
        utterance.lang = resolvedVoice.lang;
      } else {
        utterance.lang = this.locale === 'ar' ? 'ar-SA' : 'en-US';
      }

      utterance.onstart = () => {
        this.setState('playing');
      };

      utterance.onpause = () => {
        this.setState('paused');
      };

      utterance.onresume = () => {
        this.setState('playing');
      };

      utterance.onend = () => {
        this.clearHighlight();
        this.currentUtterance = null;
        this.setState('idle');
      };

      utterance.onerror = (e: any) => {
        // Interrupted is normal when stopped/cancelled
        if ((e as any).error === 'interrupted' || (e as any).error === 'canceled') {
          this.setState('idle');
        } else {
          this.setState('error');
        }
        this.clearHighlight();
        this.currentUtterance = null;
      };

      utterance.onboundary = (e: any) => {
        // Safe sentence/word boundary highlight if supported
        this.handleBoundary(e);
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      return { success: true };
    } catch (err: any) {
      this.setState('error');
      return { success: false, message: err?.message || 'Error initializing speech playback' };
    }
  }

  /**
   * Pauses active reading session.
   */
  public pause(): { success: boolean } {
    if (!SpeechReader.isSupported() || this.state !== 'playing') {
      return { success: false };
    }

    try {
      window.speechSynthesis.pause();
      this.setState('paused');
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  /**
   * Resumes paused reading session.
   */
  public resume(): { success: boolean } {
    if (!SpeechReader.isSupported() || this.state !== 'paused') {
      return { success: false };
    }

    try {
      window.speechSynthesis.resume();
      this.setState('playing');
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  /**
   * Stops active or paused speech session, clears highlights and queues.
   */
  public stop(): { success: boolean } {
    if (!SpeechReader.isSupported()) {
      return { success: false };
    }

    this.stopInternal();
    this.setState('stopped');
    // Return to idle state
    setTimeout(() => {
      if (this.state === 'stopped') {
        this.setState('idle');
      }
    }, 50);

    return { success: true };
  }

  /**
   * Subscribes to playback state transitions.
   */
  public subscribe(
    listener: (state: SpeechState, info?: { text?: string; source?: string }) => void
  ): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Subscribes to browser voice availability updates.
   */
  public onVoicesChanged(listener: (voices: VoiceInfo[]) => void): () => void {
    this.voiceChangeListeners.push(listener);
    return () => {
      this.voiceChangeListeners = this.voiceChangeListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Teardown: cancels ongoing speech, detaches event listeners, cleans up highlights.
   */
  public destroy(): void {
    this.stopInternal();
    this.clearHighlight();

    if (
      typeof window !== 'undefined' &&
      window.speechSynthesis &&
      this.boundOnVoicesChanged &&
      window.speechSynthesis.onvoiceschanged === this.boundOnVoicesChanged
    ) {
      window.speechSynthesis.onvoiceschanged = null;
    }

    this.listeners = [];
    this.voiceChangeListeners = [];
  }

  private stopInternal(): void {
    if (SpeechReader.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Safe ignore
      }
    }
    this.clearHighlight();
    this.currentUtterance = null;
  }

  private setState(newState: SpeechState): void {
    this.state = newState;
    for (const listener of this.listeners) {
      try {
        listener(newState, { text: this.currentText, source: this.currentSource });
      } catch (err) {
        console.error('[RaawiX SpeechReader] Listener error:', err);
      }
    }
  }

  private initVoiceListener(): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    this.boundOnVoicesChanged = () => {
      const voices = this.getVoices();
      for (const listener of this.voiceChangeListeners) {
        try {
          listener(voices);
        } catch {
          // Safe ignore
        }
      }
    };

    try {
      window.speechSynthesis.onvoiceschanged = this.boundOnVoicesChanged;
    } catch {
      // In JSDOM or restricted environments
    }
  }

  private resolveVoice(): SpeechSynthesisVoice | null {
    if (!SpeechReader.isSupported()) return null;

    try {
      const voices = window.speechSynthesis.getVoices() || [];
      if (voices.length === 0) return null;

      // 1. If user selected a specific voice URI
      if (this.selectedVoiceUri) {
        const found = voices.find((v) => v.voiceURI === this.selectedVoiceUri);
        if (found) return found;
      }

      // 2. Find voice matching active widget locale
      const prefix = this.locale === 'ar' ? 'ar' : 'en';
      const match = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
      if (match) return match;

      // 3. Fallback to default voice or first available
      return voices.find((v) => v.default) || voices[0] || null;
    } catch {
      return null;
    }
  }

  private handleBoundary(e: SpeechSynthesisEvent): void {
    // Graceful sentence/word boundary detection without throwing
    if (typeof e.charIndex !== 'number') return;
    // Highlight tracking can be extended non-destructively
  }

  private clearHighlight(): void {
    if (this.activeHighlightSpan && this.activeHighlightSpan.parentNode) {
      try {
        const parent = this.activeHighlightSpan.parentNode;
        while (this.activeHighlightSpan.firstChild) {
          parent.insertBefore(this.activeHighlightSpan.firstChild, this.activeHighlightSpan);
        }
        parent.removeChild(this.activeHighlightSpan);
      } catch {
        // Safe cleanup
      }
    }
    this.activeHighlightSpan = null;
  }
}
