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
      return key;
    });
  });

  it('should extract count for form field missing name', () => {
    const result = getLocalizedIssueMessage('2 form field(s) appear to lack an accessible name during the form task.', mockT);
    expect(result).toBe('ARABIC 2 form fields');
  });

  it('should fallback to original message if no match', () => {
    const result = getLocalizedIssueMessage('Some unknown message', mockT);
    expect(result).toBe('Some unknown message');
  });
});
