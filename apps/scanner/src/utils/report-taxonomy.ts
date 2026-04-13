export const reportCategories = {
  Images: [
    'Missing alt text',
    'Decorative images incorrectly announced',
    'Icons without labels',
    'CAPTCHA without alternatives',
    'Image-based buttons without description',
  ],
  Content: [
    'Missing or incorrect headings structure (H1-H6)',
    'Poor readability (complex language)',
    'Missing page titles',
    'Incorrect language declaration',
    'Abbreviations not explained',
  ],
  'Color & Contrast': [
    'Low text contrast',
    'Low contrast for UI components',
    'Reliance on color alone',
    'Placeholder text too light to read',
    'Disabled states not distinguishable',
  ],
  'Keyboard & Navigation': [
    'Not accessible via keyboard',
    'Missing focus indicator',
    'Incorrect tab order',
    'Keyboard traps',
    'Missing skip links',
    'Navigation inconsistency',
  ],
  'Forms & Inputs': [
    'Missing labels',
    'Placeholder instead of label',
    'Missing error messages',
    'Errors not explained',
    'Required fields not indicated',
    'No input instructions',
    'Incorrect associations',
  ],
  Multimedia: [
    'Missing captions',
    'Missing transcripts',
    'No audio descriptions',
    'Auto-play without control',
    'No pause/stop controls',
  ],
  'Touch & Mobile': [
    'Small tap targets',
    'Gesture-only interactions',
    'No gesture alternatives',
    'Elements too close',
    'No orientation support',
    'Motion without fallback',
  ],
  'Structure & Semantics': [
    'Missing ARIA roles',
    'Improper HTML structure',
    'Screen reader issues',
    'Inaccessible custom components',
    'Missing landmarks',
    'Duplicate IDs',
  ],
  'Timing & Interaction': [
    'Time limits without warning',
    'No extend option',
    'Auto-refresh',
    'Unstoppable animations',
    'Moving content without control',
  ],
  'Assistive Technology': [
    'Screen reader issues',
    'Voice control problems',
    'Zoom issues',
  ],
  'Authentication & Security': [
    'Cognitive complexity',
    'CAPTCHA barriers',
    'Memory-based challenges',
  ],
} as const;

export type ReportCategory = keyof typeof reportCategories;
export type ReportSubcategory = (typeof reportCategories)[ReportCategory][number];

export interface TaxonomyMatch {
  category: ReportCategory;
  subcategory: string;
}

export const defaultTaxonomyMatch: TaxonomyMatch = {
  category: 'Assistive Technology',
  subcategory: 'Screen reader issues',
};

export function getCategorySubcategories(category: ReportCategory): readonly string[] {
  return reportCategories[category];
}

export function getReportCategories(): ReportCategory[] {
  return Object.keys(reportCategories) as ReportCategory[];
}

export function isReportCategory(value: unknown): value is ReportCategory {
  return typeof value === 'string' && value in reportCategories;
}

export function isSubcategoryForCategory(category: ReportCategory, value: unknown): value is string {
  return typeof value === 'string' && reportCategories[category].includes(value as never);
}

export function normalizeTaxonomyMatch(input?: Partial<TaxonomyMatch> | null): TaxonomyMatch {
  if (!input || !isReportCategory(input.category)) {
    return defaultTaxonomyMatch;
  }

  if (!isSubcategoryForCategory(input.category, input.subcategory)) {
    const [firstSubcategory] = reportCategories[input.category];
    return {
      category: input.category,
      subcategory: firstSubcategory ?? defaultTaxonomyMatch.subcategory,
    };
  }

  return {
    category: input.category,
    subcategory: input.subcategory,
  };
}

export function formatTaxonomyChecklistForPrompt(): string {
  return getReportCategories()
    .map((category) => {
      const subcategories = reportCategories[category].map((subcategory) => `    - ${subcategory}`).join('\n');
      return `  - ${category}\n${subcategories}`;
    })
    .join('\n');
}
