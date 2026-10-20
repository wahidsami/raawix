/**
 * Shared Localization module for Raawi X (@raawi-x/core)
 * Provides bilingual (en/ar) translation for rule finding messages,
 * recommendations, agent finding types, and interaction trace summaries.
 */

export type SupportedLocale = 'en' | 'ar';

/**
 * Localize dynamic WCAG and agent finding messages.
 * Preserves numbers, colors, ratios, and unknown free-form messages.
 */
export function getLocalizedFindingMessage(
  message: string | undefined | null,
  locale: SupportedLocale = 'en'
): string {
  if (!message) return '';
  if (locale === 'en') return message;

  // 1. Agent form field heuristic
  let match = message.match(/^(\d+) form field\(s\) appear to lack an accessible name during the form task\.$/);
  if (match) {
    return `يبدو أن ${match[1]} حقل (حقول) نموذج يفتقر إلى اسم يمكن الوصول إليه أثناء مهمة النموذج.`;
  }

  // 2. Focusable elements count
  match = message.match(/^Only (\d+) focusable element\(s\) found - may need review$/);
  if (match) {
    return `تم العثور على ${match[1]} عنصر (عناصر) قابلة للتركيز فقط - قد تحتاج إلى مراجعة`;
  }
  if (message === 'No focusable elements found') {
    return 'لم يتم العثور على عناصر قابلة للتركيز';
  }

  // 3. Focus indicator
  match = message.match(/^No visible focus indicator detected\. Checked for: outline, border, box-shadow \(repeated (\d+)x\)$/);
  if (match) {
    return `لم يتم اكتشاف مؤشر تركيز مرئي. تم فحص: outline و border و box-shadow (تكرر ${match[1]} مرة)`;
  }
  if (message === 'No visible focus indicator detected. Checked for: outline, border, box-shadow') {
    return 'لم يتم اكتشاف مؤشر تركيز مرئي. تم فحص: outline و border و box-shadow';
  }
  match = message.match(/^(\d+)\/(\d+) sampled elements have focus indicators$/);
  if (match) {
    return `${match[1]}/${match[2]} من العناصر التي تم فحصها تحتوي على مؤشرات تركيز`;
  }
  match = message.match(/^None of (\d+) sampled elements have visible focus indicators$/);
  if (match) {
    return `لا يوجد أي عنصر من ${match[1]} عنصر تم فحصه يحتوي على مؤشر تركيز مرئي`;
  }
  match = message.match(/^Only (\d+)\/(\d+) sampled elements have focus indicators$/);
  if (match) {
    return `فقط ${match[1]}/${match[2]} من العناصر التي تم فحصها تحتوي على مؤشرات تركيز`;
  }
  match = message.match(/^(\d+) sampled element\(s\) require computed focus indicator review in browser$/);
  if (match) {
    return `يتطلب ${match[1]} عنصر (عناصر) تم فحصها مراجعة مؤشر التركيز في المتصفح`;
  }

  // 4. Undetermined colors from inline styles
  match = message.match(/^Cannot determine text\/background colors from inline styles - check computed styles \(repeated (\d+)x\)$/);
  if (match) {
    return `لا يمكن تحديد ألوان النص/الخلفية من الأنماط المضمنة - تحقق من الأنماط المحسوبة (تكرر ${match[1]} مرة)`;
  }
  if (message === 'Cannot determine text/background colors from inline styles - check computed styles') {
    return 'لا يمكن تحديد ألوان النص/الخلفية من الأنماط المضمنة - تحقق من الأنماط المحسوبة';
  }

  // 5. Contrast violations count
  match = message.match(/^Found (\d+) text element\(s\) with insufficient contrast$/);
  if (match) {
    return `تم العثور على ${match[1]} عنصر (عناصر) نصية ذات تباين غير كافٍ`;
  }

  // 6. Contrast manual review count
  match = message.match(/^(\d+) element\(s\) need manual contrast review$/);
  if (match) {
    return `${match[1]} عنصر (عناصر) بحاجة إلى مراجعة تباين يدوية`;
  }

  // 7. Checked all pass contrast
  match = message.match(/^Checked (\d+) text element\(s\) - all meet contrast requirements$/);
  if (match) {
    return `تم فحص ${match[1]} عنصر (عناصر) نصية - جميعها تفي بمتطلبات التباين`;
  }

  // 8. Detailed contrast ratio diagnostic with large text
  match = message.match(/^Contrast ratio ([\d.]+):1 \(below ([\d.]+):1\)\. Font size suggests large text - needs review\. Text: (.+?), BG: (.+)$/);
  if (match) {
    return `نسبة التباين ${match[1]}:1 (أقل من ${match[2]}:1). حجم الخط يشير إلى نص كبير - يتطلب مراجعة. النص: ${match[3].trim()}، الخلفية: ${match[4].trim()}`;
  }

  // 9. Detailed contrast ratio diagnostic normal text
  match = message.match(/^Contrast ratio ([\d.]+):1 \(below ([\d.]+):1\)\. Text: (.+?), BG: (.+)$/);
  if (match) {
    return `نسبة التباين ${match[1]}:1 (أقل من ${match[2]}:1). النص: ${match[3].trim()}، الخلفية: ${match[4].trim()}`;
  }

  // 10. Axe-core color contrast diagnostic template
  match = message.match(/^Element has insufficient color contrast of ([\d.]+):1 \(foreground color: ([^,]+), background color: ([^,]+), font size: ([^,]+), font weight: ([^)]+)\)\. Expected contrast ratio of ([\d.]+):1$/);
  if (match) {
    return `العنصر لديه تباين لوني غير كافٍ بنسبة ${match[1]}:1 (لون المقدمة: ${match[2].trim()}، لون الخلفية: ${match[3].trim()}، حجم الخط: ${match[4].trim()}، وزن الخط: ${match[5].trim()}). نسبة التباين المتوقعة هي ${match[6]}:1`;
  }

  // 11. Image missing alt
  match = message.match(/^Found (\d+) image\(s\) with alt text issues$/);
  if (match) {
    return `تم العثور على ${match[1]} صورة (صور) بها مشكلات في النص البديل`;
  }

  // 12. Form control without accessible name
  match = message.match(/^Found (\d+) form control\(s\) without accessible names$/);
  if (match) {
    return `تم العثور على ${match[1]} عنصر (عناصر) تحكم نموذج بدون أسماء يمكن الوصول إليها`;
  }

  // 13. Generic link text
  match = message.match(/^Found (\d+) link\(s\) with potentially generic text that may need review$/);
  if (match) {
    return `تم العثور على ${match[1]} رابط (روابط) بنص عام قد يحتاج إلى مراجعة`;
  }

  // 14. Potential keyboard traps
  match = message.match(/^Found (\d+) potential keyboard trap\(s\) that need review$/);
  if (match) {
    return `تم العثور على ${match[1]} فخ (فخاخ) لوحة مفاتيح محتملة تحتاج إلى مراجعة`;
  }

  // 15. Reflow issues
  match = message.match(/^Found (\d+) potential reflow issue\(s\) - manual testing required$/);
  if (match) {
    return `تم العثور على ${match[1]} مشكلة (مشكلات) إعادة تدفق محتملة - يلزم إجراء اختبار يدوي`;
  }

  // 16. Dynamic keyboard interaction messages
  match = message.match(/^Keyboard focus appears trapped: same focus target repeated (\d+) times within (\d+) steps\.$/);
  if (match) {
    return `يبدو أن تركيز لوحة المفاتيح محاصر: تكرر نفس هدف التركيز ${match[1]} مرات خلال ${match[2]} خطوات.`;
  }

  match = message.match(/^Found (\d+) interactive control\(s\) without an accessible name\.$/);
  if (match) {
    return `تم العثور على ${match[1]} عنصر (عناصر) تحكم تفاعلي بدون اسم يمكن الوصول إليه.`;
  }

  match = message.match(/^(\d+) control name\(s\) repeated ≥(\d+) times; may confuse users\.$/);
  if (match) {
    return `تكرر ${match[1]} اسم عنصر تحكم ≥${match[2]} مرات؛ قد يربك المستخدمين.`;
  }

  match = message.match(/^Focus indicator not visible for (\d+) of (\d+) focus steps\.$/);
  if (match) {
    return `مؤشر التركيز غير مرئي لـ ${match[1]} من أصل ${match[2]} خطوات تركيز.`;
  }

  match = message.match(/^Focus indicator not visible on (\d+) interactive element\(s\)\.$/);
  if (match) {
    return `مؤشر التركيز غير مرئي على ${match[1]} عنصر (عناصر) تفاعلي.`;
  }

  if (message === 'Modal opened but focus did not move inside the dialog.') {
    return 'تم فتح النافذة المنبثقة ولكن لم ينتقل التركيز إلى داخل مربع الحوار.';
  }
  if (message === 'Focus was not restored to the modal trigger after closing.') {
    return 'لم تتم استعادة التركيز إلى زر فتح النافذة بعد إغلاقها.';
  }
  if (message === 'Validation errors appeared but focus did not move to the first invalid field or error summary.') {
    return 'ظهرت أخطاء التحقق ولكن لم ينتقل التركيز إلى الحقل غير الصالح الأول أو ملخص الخطأ.';
  }
  if (message === 'Submitting an incomplete form did not surface clear validation feedback.') {
    return 'إرسال نموذج غير مكتمل لم يظهر ملاحظات تحقق واضحة.';
  }
  if (message === 'Invalid fields were detected, but no clear inline or alert-based error explanation was captured.') {
    return 'تم اكتشاف حقول غير صالحة، ولكن لم يتم التقاط توضيح خطأ واضح في السطر أو عبر تنبيه.';
  }
  if (message === 'Authenticated navigation reached a destination, but the resulting page did not expose clear account context or structure.') {
    return 'وصل التنقل المصادق عليه إلى وجهة، ولكن الصفحة الناتجة لم تكشف عن سياق حساب أو بنية واضحة.';
  }
  if (message === 'Media was detected without exposed native controls, so pause/play access may be unavailable to keyboard and assistive-tech users.') {
    return 'تم اكتشاف وسائط بدون عناصر تحكم أصلية معروضة، لذا قد يتعذر وصول مستخدمي لوحة المفاتيح والتقنيات المساعدة إلى الإيقاف المؤقت/التشغيل.';
  }
  if (message === 'Media appears to autoplay or already play on load, which needs a clear pause or stop mechanism.') {
    return 'يبدو أن الوسائط تعمل تلقائيًا أو قيد التشغيل بالفعل عند التحميل، مما يتطلب آلية إيقاف مؤقت أو إيقاف واضحة.';
  }

  // Fallback: Return original unknown message untouched
  return message;
}

/**
 * Localize recommendations and how-to-verify instructions.
 */
export function getLocalizedRecommendation(
  rec: string | undefined | null,
  locale: SupportedLocale = 'en'
): string {
  if (!rec) return '';
  if (locale === 'en') return rec;

  const recommendationsMap: Record<string, string> = {
    'Add accessible names to all form controls using label, aria-label, or aria-labelledby':
      'أضف أسماء يمكن الوصول إليها لجميع عناصر التحكم في النماذج باستخدام label أو aria-label أو aria-labelledby',
    'Add alt text to images using alt attribute or aria-label':
      'أضف نصاً بديلاً للصور باستخدام السمة alt أو aria-label',
    'Increase contrast by adjusting text or background colors to meet 4.5:1 ratio':
      'قم بزيادة التباين عن طريق ضبط ألوان النص أو الخلفية لتلبية نسبة 4.5:1',
    'Increase contrast by adjusting text or background colors to meet 4.5:1 ratio (3:1 for large text)':
      'قم بزيادة التباين عن طريق ضبط ألوان النص أو الخلفية لتلبية نسبة 4.5:1 (3:1 للنص الكبير)',
    'Verify text contrast using browser DevTools or contrast checker tools':
      'تحقق من تباين النص باستخدام أدوات المطورين في المتصفح أو أدوات فحص التباين',
    'Review text contrast using computed styles. Some elements may need manual verification.':
      'راجع تباين النص باستخدام الأنماط المحسوبة. قد تحتاج بعض العناصر إلى تحقق يدوي.',
    'Review focusable elements in browser with stylesheets loaded. Static parser cannot verify external CSS focus styles.':
      'راجع العناصر القابلة للتركيز في المتصفح مع تحميل أوراق الأنماط. لا يمكن للمحلل الثابت التحقق من أنماط تركيز CSS الخارجية.',
    'Add CSS :focus or :focus-visible styles with outline, border, or box-shadow to all focusable elements':
      'أضف أنماط CSS :focus أو :focus-visible باستخدام outline أو border أو box-shadow لجميع العناصر القابلة للتركيز',
    'Verify all focusable elements have visible focus indicators (outline, border, or box-shadow)':
      'تحقق من أن جميع العناصر القابلة للتركيز لها مؤشرات تركيز مرئية (outline أو border أو box-shadow)',
    'Test Tab navigation manually to verify all interactive elements are reachable':
      'اختبر التنقل بمفتاح Tab يدويًا للتحقق من إمكانية الوصول إلى جميع العناصر التفاعلية',
    'Test keyboard navigation manually to verify users can escape regions':
      'اختبر التنقل بلوحة المفاتيح يدويًا للتحقق من إمكانية خروج المستخدمين من المناطق',
    'Verify that content reflows without requiring two-dimensional scrolling at 400% zoom':
      'تحقق من إعادة تدفق المحتوى دون الحاجة إلى التمرير ثنائي الأبعاد عند تكبير 400%',
    'Navigate the form with a screen reader and confirm every field announces a clear label and instruction.':
      'تنقل في النموذج باستخدام قارئ الشاشة وتأكد من أن كل حقل يعلن عن تسمية وتعليمات واضحة.',
    'Tab through the page; if focus cycles without reaching new content, a focus trap is likely.':
      'تنقل بمفتاح Tab عبر الصفحة؛ إذا دار التركيز في حلقة دون الوصول إلى محتوى جديد، فمن المحتمل وجود فخ تركيز.',
    'Use Tab to focus each control; screen readers should announce a name (e.g. aria-label or visible text).':
      'استخدم Tab للتركيز على كل عنصر تحكم؛ يجب أن تعلن قارئات الشاشة عن اسم (مثل aria-label أو نص مرئي).',
    'Tab through and note repeated labels; ensure context (e.g. "Add to cart – Product A") differentiates them.':
      'تنقل بمفتاح Tab ولاحظ التسميات المكررة؛ تأكد من أن السياق يميز بينها.',
    'Tab through the page and confirm a visible focus ring or highlight on each focused element.':
      'تنقل عبر الصفحة بمفتاح Tab وتأكد من وجود حلقة تركيز مرئية أو تمييز على كل عنصر يتم التركيز عليه.',
    'Open the modal with keyboard; focus should move to the dialog.':
      'افتح النافذة المنبثقة بلوحة المفاتيح؛ يجب أن ينتقل التركيز إلى مربع الحوار.',
    'Close the modal with Escape; focus should return to the trigger.':
      'أغلق النافذة المنبثقة بمفتاح Escape؛ يجب أن يعود التركيز إلى عنصر التشغيل.',
    'Submit invalid form; focus should move to first error or role="alert" summary.':
      'أرسل نموذجًا غير صالح؛ يجب أن ينتقل التركيز إلى الخطأ الأول أو ملخص role="alert".',
    'Submit the form with empty required fields and confirm the error is announced and explained.':
      'أرسل النموذج بحقول مطلوبة فارغة وتأكد من الإعلان عن الخطأ وشرحه.',
    'Open a profile or settings destination from the signed-in area and confirm the destination announces a clear heading, landmarks, and account context.':
      'افتح وجهة ملف شخصي أو إعدادات من منطقة تسجيل الدخول وتأكد من أن الوجهة تعلن عن عنوان ومعالم وسياق حساب واضح.',
    'Navigate to the media with keyboard only and confirm that play, pause, and other essential controls are reachable and announced.':
      'انتقل إلى الوسائط باستخدام لوحة المفاتيح فقط وتأكد من إمكانية الوصول إلى عناصر التحكم الأساسية في التشغيل والإيقاف المؤقت والإعلان عنها.',
    'Load the page and confirm whether media starts automatically; if it does, verify that a keyboard-accessible pause or stop control is available immediately.':
      'قم بتحميل الصفحة وتأكد مما إذا كانت الوسائط تبدأ تلقائيًا؛ إذا كان الأمر كذلك، فتحقق من توفر عنصر تحكم في الإيقاف المؤقت أو الإيقاف يمكن الوصول إليه عبر لوحة المفاتيح على الفور.',
  };

  return recommendationsMap[rec] || rec;
}

/**
 * Localize agent finding kinds/types.
 */
export function getLocalizedAgentKind(
  kind: string | undefined | null,
  locale: SupportedLocale = 'en'
): string {
  if (!kind) return '';
  if (locale === 'en') return kind;

  const agentKindsMap: Record<string, string> = {
    unnamed_task_control: 'عنصر تحكم للمهمة بدون اسم',
    unnamed_control: 'عنصر تحكم بدون اسم',
    focus_trap: 'فخ تركيز لوحة المفاتيح',
    focus_not_visible: 'مؤشر التركيز غير مرئي',
    duplicate_control_name: 'اسم عنصر تحكم مكرر',
    modal_focus_not_moved: 'لم ينتقل التركيز إلى النافذة المنبثقة',
    focus_not_restored: 'لم تتم استعادة التركيز بعد الإغلاق',
    validation_error_not_focused: 'لم يتم التركيز على خطأ التحقق',
    unclear_error_recovery: 'استعادة غير واضحة من الخطأ',
    missing_form_instructions: 'تعليمات النموذج مفقودة',
    missing_page_structure: 'بنية الصفحة مفقودة',
    missing_skip_link: 'رابط التخطي مفقود',
    authenticated_workspace_navigation_unclear: 'تنقل غير واضح في مساحة العمل المصادق عليها',
    dynamic_updates_not_announced: 'تحديثات ديناميكية غير معلن عنها',
    silent_update: 'تحديث صامت للمحتوى',
    image_alt_task_issue: 'مشكلة في النص البديل للصورة',
    verification_checkpoint_requires_manual_input: 'نقطة تحقق تتطلب إدخالاً يدوياً',
    media_controls_not_exposed: 'عناصر التحكم في الوسائط غير معروضة',
    media_autoplay_without_control: 'تشغيل تلقائي للوسائط بدون تحكم',
    ambiguous_control: 'عنصر تحكم غامض',
    poor_label_quality: 'جودة تسمية ضعيفة',
    clickable_unlabeled: 'عنصر قابل للنقر بدون تسمية',
  };

  return agentKindsMap[kind] || kind;
}

/**
 * Localize trace summary strings.
 */
export function getLocalizedTraceSummary(
  summary: string | undefined | null,
  locale: SupportedLocale = 'en'
): string {
  if (!summary) return '';
  if (locale === 'en') return summary;

  if (summary === 'No keyboard trace recorded') {
    return 'لم يتم تسجيل أي تتبّع للوحة المفاتيح';
  }
  if (summary === '0 steps, 0 probes attempted (incomplete)') {
    return '0 خطوات، 0 اختبارات مطلوبة (غير مكتمل)';
  }

  let match = summary.match(/^0 steps, 0 probes attempted \(static assessment: (\d+) issues?(?:\(s\))?\)$/);
  if (match) {
    return `0 خطوات، 0 اختبارات مطلوبة (تقييم ثابت: ${match[1]} مشكلة)`;
  }

  match = summary.match(/^(\d+) step\(s\), (\d+) probe\(s\) attempted, (\d+) issue\(s\)$/);
  if (match) {
    return `${match[1]} خطوة، ${match[2]} اختبار مطلوب، ${match[3]} مشكلة`;
  }

  match = summary.match(/^(\d+) steps?, (\d+) probes? attempted, (\d+) issues?$/);
  if (match) {
    return `${match[1]} خطوة، ${match[2]} اختبار مطلوب، ${match[3]} مشكلة`;
  }

  return summary;
}

/**
 * Localize status string.
 */
export function getLocalizedStatus(
  status: string | undefined | null,
  locale: SupportedLocale = 'en'
): string {
  if (!status) return '';
  if (locale === 'en') return status;

  const statusMap: Record<string, string> = {
    pass: 'نجح',
    fail: 'لم ينجح',
    incomplete: 'غير مكتمل',
    inconclusive: 'غير حاسم',
    not_run: 'لم يعمل',
    needs_review: 'يحتاج مراجعة',
    na: 'غير منطبق',
  };

  return statusMap[status] || status;
}

/**
 * Localize severity string.
 */
export function getLocalizedSeverity(
  severity: string | undefined | null,
  locale: SupportedLocale = 'en'
): string {
  if (!severity) return '';
  if (locale === 'en') return severity;

  const severityMap: Record<string, string> = {
    critical: 'حرج',
    important: 'مهم',
    moderate: 'متوسط',
    minor: 'طفيف',
    info: 'معلومات',
  };

  return severityMap[severity] || severity;
}
