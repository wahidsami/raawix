// @ts-ignore
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLocalizedIssueTitle, getLocalizedIssueMessage } from './localization-helpers';
import { getWCAGRuleTitle } from '@raawi-x/core';

vi.mock('@raawi-x/core', () => ({
  getWCAGRuleTitle: vi.fn(),
}));

describe('getLocalizedIssueTitle', () => {
  let mockT: any;

  beforeEach(() => {
    vi.resetAllMocks();
    mockT = vi.fn((key: string, defaultValue: string) => {
      // Mock some translations
      if (key === 'agentFindings.missing_page_structure') {
        return 'هيكل الصفحة غير واضح: لم يتم التقاط عنوان رئيسي.';
      }
      if (key === 'agentFindings.known_kind') {
        return 'Translated known kind';
      }
      return defaultValue;
    });
  });

  it('should return WCAG title if wcagId is provided and source is dom', () => {
    vi.mocked(getWCAGRuleTitle).mockReturnValue('Translated WCAG Rule');

    const result = getLocalizedIssueTitle(
      { wcagId: '1.3.1', source: 'dom' },
      mockT,
      'ar'
    );

    expect(getWCAGRuleTitle).toHaveBeenCalledWith('1.3.1', 'ar');
    expect(result).toBe('Translated WCAG Rule');
  });

  it('should fallback to agent finding kind translation if available', () => {
    const result = getLocalizedIssueTitle(
      { kind: 'missing_page_structure' },
      mockT,
      'ar'
    );

    expect(result).toBe('هيكل الصفحة غير واضح: لم يتم التقاط عنوان رئيسي.');
  });

  it('should fallback to English issueTitle if no translation is found', () => {
    const result = getLocalizedIssueTitle(
      { kind: 'unknown_kind', issueTitle: 'Original Issue Title' },
      mockT,
      'en'
    );

    expect(result).toBe('Original Issue Title');
  });

  it('should fallback to message if issueTitle is missing', () => {
    const result = getLocalizedIssueTitle(
      { message: 'Original Message' },
      mockT,
      'en'
    );

    expect(result).toBe('Original Message');
  });
  
  it('should use wcagIds array if wcagId string is not provided', () => {
    vi.mocked(getWCAGRuleTitle).mockReturnValue('WCAG Array Title');

    const result = getLocalizedIssueTitle(
      { wcagIds: ['1.1.1'], source: 'dom' },
      mockT,
      'en'
    );

    expect(getWCAGRuleTitle).toHaveBeenCalledWith('1.1.1', 'en');
    expect(result).toBe('WCAG Array Title');
  });
});

describe('getLocalizedIssueMessage', () => {
  let mockT: any;

  beforeEach(() => {
    vi.resetAllMocks();
    mockT = vi.fn((key: string, options: any) => {
      if (key === 'ruleMessages.formFieldMissingName') {
        return `ARABIC ${options.count} form fields`;
      }
      if (key === 'ruleMessages.contrastInsufficient') {
        return `ARABIC ${options.count} insufficient contrast`;
      }
      if (key === 'ruleMessages.contrastNeedReview') {
        return `ARABIC ${options.count} need manual contrast review`;
      }
      if (key === 'ruleMessages.contrastRatioDetail') {
        return `ARABIC ratio ${options.ratio}:1 below ${options.expected}:1 text ${options.fg} bg ${options.bg}`;
      }
      if (key === 'ruleMessages.contrastRatioLargeDetail') {
        return `ARABIC large ratio ${options.ratio}:1 below ${options.expected}:1 text ${options.fg} bg ${options.bg}`;
      }
      if (key === 'ruleMessages.axeColorContrast') {
        return `ARABIC axe ratio ${options.ratio}:1 expected ${options.expected}:1 fg ${options.fg} bg ${options.bg} size ${options.fontSize} weight ${options.fontWeight}`;
      }
      if (key === 'ruleMessages.imageMissingAlt') {
        return `ARABIC ${options.count} alt issues`;
      }
      if (key === 'ruleMessages.keyboardTrapPotential') {
        return `ARABIC ${options.count} keyboard traps`;
      }
      return key;
    });
  });

  it('should extract count for form field missing name', () => {
    const result = getLocalizedIssueMessage('2 form field(s) appear to lack an accessible name during the form task.', mockT);
    expect(result).toBe('ARABIC 2 form fields');
  });

  it('should extract count for contrast violations', () => {
    const result = getLocalizedIssueMessage('Found 4 text element(s) with insufficient contrast', mockT);
    expect(result).toBe('ARABIC 4 insufficient contrast');
  });

  it('should extract count for manual contrast review', () => {
    const result = getLocalizedIssueMessage('3 element(s) need manual contrast review', mockT);
    expect(result).toBe('ARABIC 3 need manual contrast review');
  });

  it('should extract structured variables for normal contrast diagnostic', () => {
    const result = getLocalizedIssueMessage('Contrast ratio 2.50:1 (below 4.5:1). Text: #777777, BG: #ffffff', mockT);
    expect(result).toBe('ARABIC ratio 2.50:1 below 4.5:1 text #777777 bg #ffffff');
  });

  it('should extract structured variables for large text contrast diagnostic', () => {
    const result = getLocalizedIssueMessage('Contrast ratio 2.80:1 (below 4.5:1). Font size suggests large text - needs review. Text: #888, BG: #fff', mockT);
    expect(result).toBe('ARABIC large ratio 2.80:1 below 4.5:1 text #888 bg #fff');
  });

  it('should extract structured variables for axe-core color contrast diagnostic', () => {
    const result = getLocalizedIssueMessage('Element has insufficient color contrast of 2.5:1 (foreground color: #777777, background color: #ffffff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1', mockT);
    expect(result).toBe('ARABIC axe ratio 2.5:1 expected 4.5:1 fg #777777 bg #ffffff size 10.5pt (14px) weight normal');
  });

  it('should extract count for images missing alt and keyboard traps', () => {
    expect(getLocalizedIssueMessage('Found 5 image(s) with alt text issues', mockT)).toBe('ARABIC 5 alt issues');
    expect(getLocalizedIssueMessage('Found 1 potential keyboard trap(s) that need review', mockT)).toBe('ARABIC 1 keyboard traps');
  });

  it('should fallback to original message if no match', () => {
    const result = getLocalizedIssueMessage('Some unknown message', mockT);
    expect(result).toBe('Some unknown message');
  });

  it('should preserve arbitrary unstructured technical diagnostics exactly without distortion', () => {
    const unstructured = 'Custom browser engine warning: GPU rasterization failed on canvas #gl-viewport at depth 32';
    const result = getLocalizedIssueMessage(unstructured, mockT);
    expect(result).toBe(unstructured);
  });
});
