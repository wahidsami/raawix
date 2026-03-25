/**
 * AI-Powered Report Content Generator
 * 
 * Uses OpenAI to generate professional, contextual report content
 * especially tailored for government entities
 */

import { config } from '../config.js';
import { StructuredLogger } from '../utils/logger.js';
import OpenAI from 'openai';

export interface ReportContent {
  introduction: string;
  executiveSummary: string;
  keyFindings: string;
  recommendations?: string;
}

export interface ScanData {
  entityName: string;
  entityType: 'government' | 'private';
  propertyName: string;
  scanDate: string;
  totalPages: number;
  totalFindings: number;
  scoreA: number | null;
  scoreAA: number | null;
  needsReviewRate: number | null;
  failedRules: number;
  needsReviewRules: number;
  topFindings: Array<{
    wcagId: string;
    level: string;
    status: string;
    message: string;
    pageUrl: string;
  }>;
  locale: 'en' | 'ar';
}

export class ReportContentGenerator {
  private logger: StructuredLogger;
  private client: OpenAI | null = null;

  constructor(scanId?: string) {
    this.logger = new StructuredLogger(scanId);
    
    if (config.openai.enabled && config.openai.apiKey) {
      try {
        this.client = new OpenAI({ apiKey: config.openai.apiKey });
        this.logger.info('OpenAI initialized for report content generation');
      } catch (error) {
        this.logger.warn('Failed to initialize OpenAI', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Generate professional report content using AI
   */
  async generateContent(data: ScanData): Promise<ReportContent> {
    // If OpenAI is not available, use fallback templates
    if (!this.client) {
      return this.generateFallbackContent(data);
    }

    try {
      const prompt = this.buildPrompt(data);
      
      this.logger.info('Generating AI report content', {
        locale: data.locale,
        entityType: data.entityType,
      });

      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You write formal accessibility audit report narratives. Do not include remediation steps unless explicitly requested.',
          },
          { role: 'user', content: prompt },
        ],
      });
      const text = response.choices[0]?.message?.content || '';

      // Parse AI response into structured content
      return this.parseAIResponse(text, data);
    } catch (error) {
      this.logger.warn('AI content generation failed, using fallback', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return this.generateFallbackContent(data);
    }
  }

  /**
   * Build prompt for AI content generation
   */
  private buildPrompt(data: ScanData): string {
    const isArabic = data.locale === 'ar';
    const entityTypeText = data.entityType === 'government' 
      ? (isArabic ? 'حكومي' : 'government')
      : (isArabic ? 'خاص' : 'private');

    const prompt = isArabic ? `
أنت خبير في إمكانية الوصول الرقمي وتقارير الامتثال لمعايير WCAG. 
قم بإنشاء تقرير احترافي باللغة العربية لجهة ${entityTypeText}:

**البيانات:**
- اسم الجهة: ${data.entityName}
- الموقع: ${data.propertyName}
- تاريخ الفحص: ${data.scanDate}
- عدد الصفحات المفحوصة: ${data.totalPages}
- إجمالي النتائج: ${data.totalFindings}
- درجة الامتثال WCAG A: ${data.scoreA !== null ? data.scoreA.toFixed(1) + '%' : 'غير متاح'}
- درجة الامتثال WCAG AA: ${data.scoreAA !== null ? data.scoreAA.toFixed(1) + '%' : 'غير متاح'}
- القواعد الفاشلة: ${data.failedRules}
- القواعد التي تحتاج مراجعة: ${data.needsReviewRules}

**أهم النتائج:**
${data.topFindings.slice(0, 5).map((f, i) => `${i + 1}. ${f.wcagId} (${f.level}): ${f.message}`).join('\n')}

**المطلوب:**
قم بإنشاء محتوى تقرير احترافي يتضمن:

1. **مقدمة** (3-4 فقرات):
   - أهمية إمكانية الوصول الرقمي
   - أهداف الفحص
   - نطاق العمل
   - أهمية الامتثال لمعايير WCAG

2. **ملخص تنفيذي** (2-3 فقرات):
   - نظرة عامة على النتائج
   - نقاط القوة والضعف الرئيسية
   - التوصيات الأولية

3. **النتائج الرئيسية** (3-4 فقرات):
   - تحليل مفصل لأهم المشاكل المكتشفة
   - تأثيرها على المستخدمين ذوي الإعاقة
   - تصنيف المشاكل حسب الأولوية (مستوى A ثم AA)

**ملاحظات مهمة:**
- هذا تقرير تدقيق ومراجعة فقط، لا تذكر أي حلول تقنية أو كيفية الإصلاح
- استخدم لغة رسمية واحترافية مناسبة للجهات الحكومية
- كن دقيقاً ومحدداً في الوصف
- ركز على وصف المشاكل وتأثيرها، وليس على كيفية حلها
- استخدم مصطلحات تقنية صحيحة
- لا تذكر أي شيء عن طبقات المعالجة أو أنظمة الإصلاح

قم بكتابة المحتوى مباشرة بدون عناوين فرعية، فقط الأقسام الثلاثة المطلوبة.
` : `
You are an expert in digital accessibility and WCAG compliance reporting.
Generate a professional report in English for a ${entityTypeText} entity:

**Data:**
- Entity Name: ${data.entityName}
- Property: ${data.propertyName}
- Scan Date: ${data.scanDate}
- Pages Scanned: ${data.totalPages}
- Total Findings: ${data.totalFindings}
- WCAG A Compliance: ${data.scoreA !== null ? data.scoreA.toFixed(1) + '%' : 'N/A'}
- WCAG AA Compliance: ${data.scoreAA !== null ? data.scoreAA.toFixed(1) + '%' : 'N/A'}
- Failed Rules: ${data.failedRules}
- Needs Review: ${data.needsReviewRules}

**Top Findings:**
${data.topFindings.slice(0, 5).map((f, i) => `${i + 1}. ${f.wcagId} (${f.level}): ${f.message}`).join('\n')}

**Required:**
Generate professional report content including:

1. **Introduction** (3-4 paragraphs):
   - Importance of digital accessibility
   - Scan objectives
   - Scope of work
   - Importance of WCAG compliance

2. **Executive Summary** (2-3 paragraphs):
   - Overview of results
   - Key strengths and weaknesses
   - Initial recommendations

3. **Key Findings** (3-4 paragraphs):
   - Detailed analysis of main issues discovered
   - Impact on users with disabilities
   - Prioritization of issues (Level A first, then Level AA)

**Important Notes:**
- This is an audit and compliance report only - do NOT mention technical solutions or how to fix issues
- Use formal, professional language appropriate for ${data.entityType === 'government' ? 'government' : 'corporate'} entities
- Be precise and specific in descriptions
- Focus on describing problems and their impact, NOT on how to solve them
- Use correct technical terminology
- Do NOT mention anything about processing layers or remediation systems

Write the content directly without subheadings, just the three required sections.
`;

    return prompt;
  }

  /**
   * Parse AI response into structured content
   */
  private parseAIResponse(text: string, data: ScanData): ReportContent {
    const isArabic = data.locale === 'ar';
    
    // Try to split by common section markers
    const sections = text.split(/\n\s*(?:1\.|2\.|3\.|مقدمة|ملخص|نتائج|Introduction|Executive|Key)/i);
    
    let introduction = '';
    let executiveSummary = '';
    let keyFindings = '';

    if (sections.length >= 3) {
      introduction = sections[1]?.trim() || '';
      executiveSummary = sections[2]?.trim() || '';
      keyFindings = sections[3]?.trim() || '';
    } else {
      // Fallback: split by paragraphs
      const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50);
      const introCount = Math.ceil(paragraphs.length * 0.4);
      const summaryCount = Math.ceil(paragraphs.length * 0.3);
      
      introduction = paragraphs.slice(0, introCount).join('\n\n');
      executiveSummary = paragraphs.slice(introCount, introCount + summaryCount).join('\n\n');
      keyFindings = paragraphs.slice(introCount + summaryCount).join('\n\n');
    }

    // If parsing failed, use fallback
    if (!introduction || !executiveSummary || !keyFindings) {
      return this.generateFallbackContent(data);
    }

    return {
      introduction: introduction || this.getFallbackIntroduction(data),
      executiveSummary: executiveSummary || this.getFallbackExecutiveSummary(data),
      keyFindings: keyFindings || this.getFallbackKeyFindings(data),
    };
  }

  /**
   * Generate fallback content (when AI is unavailable)
   */
  private generateFallbackContent(data: ScanData): ReportContent {
    return {
      introduction: this.getFallbackIntroduction(data),
      executiveSummary: this.getFallbackExecutiveSummary(data),
      keyFindings: this.getFallbackKeyFindings(data),
    };
  }

  private getFallbackIntroduction(data: ScanData): string {
    const isArabic = data.locale === 'ar';
    
    if (isArabic) {
      return `تم إجراء هذا الفحص الشامل لإمكانية الوصول الرقمي لموقع ${data.propertyName} التابع لـ ${data.entityName} في ${data.scanDate}. يهدف هذا التقرير إلى تقييم مدى امتثال الموقع لمعايير إمكانية الوصول للمحتوى على الويب (WCAG) 2.1، والتي تعد المعيار الدولي لضمان إمكانية وصول جميع المستخدمين، بما في ذلك ذوي الإعاقة، إلى المحتوى الرقمي.

يعد إمكانية الوصول الرقمي أمراً بالغ الأهمية لضمان المساواة في الوصول إلى المعلومات والخدمات الحكومية. من خلال الامتثال لمعايير WCAG، نضمن أن جميع المواطنين يمكنهم استخدام الخدمات الرقمية بفعالية، مما يعزز الشمولية والمساواة.

غطى هذا الفحص ${data.totalPages} صفحة من الموقع، وتم فحصها باستخدام أدوات آلية ومراجعة يدوية لتحديد أي مشاكل في إمكانية الوصول.`;
    }
    
    return `This comprehensive digital accessibility audit was conducted for ${data.propertyName} of ${data.entityName} on ${data.scanDate}. This report aims to assess the website's compliance with the Web Content Accessibility Guidelines (WCAG) 2.1, the international standard for ensuring that all users, including those with disabilities, can access digital content.

Digital accessibility is crucial for ensuring equal access to information and ${data.entityType === 'government' ? 'government services' : 'services'}. By complying with WCAG standards, we ensure that all citizens can effectively use digital services, promoting inclusion and equality.

This audit covered ${data.totalPages} pages of the website, which were examined using automated tools and manual review to identify any accessibility issues.`;
  }

  private getFallbackExecutiveSummary(data: ScanData): string {
    const isArabic = data.locale === 'ar';
    const scoreAText = data.scoreA !== null ? `${data.scoreA.toFixed(1)}%` : 'غير متاح';
    const scoreAAText = data.scoreAA !== null ? `${data.scoreAA.toFixed(1)}%` : 'غير متاح';
    
    if (isArabic) {
      return `يظهر التقرير أن الموقع حقق درجة امتثال ${scoreAText} لمعايير WCAG A و${scoreAAText} لمعايير WCAG AA. تم تحديد ${data.totalFindings} نتيجة إجمالية، منها ${data.failedRules} قاعدة فاشلة و${data.needsReviewRules} قاعدة تحتاج إلى مراجعة.

${data.failedRules > 0 ? `هناك حاجة لاتخاذ إجراءات فورية لمعالجة القواعد الفاشلة، خاصة تلك التي تؤثر على المستخدمين ذوي الإعاقة البصرية والسمعية.` : 'الموقع يظهر مستوى جيد من الامتثال، ولكن هناك مجال للتحسين.'}`;
    }
    
    return `The report shows that the website achieved ${scoreAText} compliance with WCAG A standards and ${scoreAAText} compliance with WCAG AA standards. A total of ${data.totalFindings} findings were identified, including ${data.failedRules} failed rules and ${data.needsReviewRules} rules requiring review.

${data.failedRules > 0 ? 'Immediate action is needed to address the failed rules, particularly those affecting users with visual and hearing impairments.' : 'The website shows good compliance levels, but there is room for improvement.'}`;
  }

  private getFallbackKeyFindings(data: ScanData): string {
    const isArabic = data.locale === 'ar';
    
    if (isArabic) {
      return `من أهم النتائج التي تم تحديدها في هذا التدقيق: ${data.topFindings.slice(0, 3).map(f => `${f.wcagId} (${f.level})`).join('، ')}. هذه المشاكل تؤثر بشكل مباشر على إمكانية وصول المستخدمين ذوي الإعاقة إلى المحتوى والخدمات.

يجب معالجة هذه المشاكل حسب الأولوية، مع التركيز على القواعد من المستوى A أولاً، تليها القواعد من المستوى AA. يوصى بإجراء فحص إضافي بعد معالجة المشاكل للتأكد من الامتثال الكامل لمعايير WCAG.`;
    }
    
    return `Key findings identified in this audit include: ${data.topFindings.slice(0, 3).map(f => `${f.wcagId} (${f.level})`).join(', ')}. These issues directly impact the ability of users with disabilities to access content and services.

These issues should be addressed in priority order, focusing on Level A rules first, followed by Level AA rules. A follow-up audit is recommended after remediation to ensure full WCAG compliance.`;
  }
}

