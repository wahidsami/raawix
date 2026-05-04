import type {
  SemanticAction,
  SemanticBuilderInput,
  SemanticBlock,
  SemanticConfidence,
  SemanticPageModel,
  SemanticRelationship,
} from './schema.js';
import { mixToConfidence, computeSourceMix } from './confidence.js';
import { collectFusionSignals } from './fusion/index.js';

const normalizeText = (text: string | undefined): string | undefined =>
  text?.replace(/\s+/g, ' ').trim() || undefined;

const firstMatch = (html: string, regex: RegExp): string | undefined => {
  const match = regex.exec(html);
  return match?.[1]?.trim();
};

const createId = (prefix: string, index: number | string) => `${prefix}-${index}`;

const createBlock = (
  id: string,
  type: SemanticBlock['type'],
  label?: string,
  content?: string,
  confidence: SemanticConfidence = 'medium',
  metadata?: Record<string, unknown>
): SemanticBlock => ({
  id,
  type,
  label: normalizeText(label),
  content: normalizeText(content),
  confidence,
  metadata,
});

const createAction = (
  id: string,
  type: SemanticAction['type'],
  label?: string,
  targetId?: string,
  selector?: string,
  confidence: SemanticConfidence = 'medium',
  metadata?: Record<string, unknown>
): SemanticAction => ({
  id,
  type,
  label: normalizeText(label),
  targetId,
  selector,
  confidence,
  metadata,
});

export function buildSemanticModel(input: SemanticBuilderInput): SemanticPageModel {
  const sourceMix = computeSourceMix(input);
  const fusionSignals = collectFusionSignals(input);
  const modelConfidence = mixToConfidence(sourceMix);
  const title = normalizeText(input.title || firstMatch(input.html ?? '', /<title>([^<]+)<\/title>/i) || input.url || 'Untitled page');
  const rootBlock = createBlock('page-root', 'page', title, title, 'high', {
    url: input.url,
    pageNumber: input.pageNumber,
    source: 'semantic-engine',
  });

  const structure: SemanticBlock[] = [rootBlock];
  const actions: SemanticAction[] = [];
  const relationships: SemanticRelationship[] = [];

  if (input.html) {
    const headingText = firstMatch(input.html, /<h1[^>]*>([^<]+)<\/h1>/i);
    if (headingText) {
      const headingBlock = createBlock('heading-1', 'heading', headingText, headingText, 'high', { level: 1 });
      structure.push(headingBlock);
      relationships.push({
        id: 'rel-root-heading',
        type: 'contains',
        sourceId: rootBlock.id,
        targetId: headingBlock.id,
        confidence: 'high',
      });
    }

    const buttonMatches = Array.from(input.html.matchAll(/<button[^>]*>([^<]*)<\/button>/gi)).slice(0, 3);
    buttonMatches.forEach((match, index) => {
      const label = normalizeText(match[1]) || `button-${index + 1}`;
      const buttonId = createId('button', index + 1);
      const action = createAction(buttonId, 'click', label, buttonId, `button:nth-of-type(${index + 1})`, 'medium', {
        htmlSnippet: match[0],
      });
      actions.push(action);
      structure.push(createBlock(buttonId, 'button', label, label, 'medium', { selector: action.selector }));
      relationships.push({
        id: `rel-page-button-${index + 1}`,
        type: 'contains',
        sourceId: rootBlock.id,
        targetId: buttonId,
        confidence: 'medium',
      });
    });
  }

  if (input.a11y && Array.isArray(input.a11y)) {
    structure.push(
      createBlock(
        'a11y-section',
        'section',
        'Accessibility snapshot',
        `Captured ${input.a11y.length} accessibility nodes`,
        'low',
        { source: 'a11y-snapshot' }
      )
    );
  }

  if (input.assistiveMap && typeof input.assistiveMap === 'object') {
    structure.push(
      createBlock(
        'assistive-section',
        'section',
        'Assistive map',
        'Assistive guidance from the scanner pipeline',
        'low',
        { source: 'assistive-map' }
      )
    );
  }

  return {
    modelVersion: 1,
    pageUrl: input.url,
    pageNumber: input.pageNumber,
    title,
    generatedAt: new Date().toISOString(),
    confidence: modelConfidence,
    sourceMix,
    structure,
    actions,
    relationships,
    metadata: {
      origin: 'semantic-engine',
      version: '0.1.0',
      fusionSignals,
      builderInput: {
        url: input.url,
        pageNumber: input.pageNumber,
      },
    },
  };
}
