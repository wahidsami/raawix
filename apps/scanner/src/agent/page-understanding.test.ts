import { describe, expect, it } from 'vitest';
import { assessRaawiTaskIntents, type RaawiPageProfile } from './page-understanding.js';

describe('page-understanding: authenticated workspace classification', () => {
  it('does NOT emit authenticated_workspace_navigation_unclear for a public page with "dashboard" in the heading', () => {
    // Mimic the profile captured from Deque Broken Workshop
    const publicRecipeProfile: RaawiPageProfile = {
      pageType: 'home',
      title: '[INSERT TITLE HERE]',
      lang: 'en',
      direction: 'ltr',
      mainHeading: 'Recipe Dashboard (with intentional a11y issues)',
      headings: [
        'Recipe Dashboard (with intentional a11y issues)',
        'Chocolate Cake',
        "Mom's Spaghetti",
        'Filet Mignon',
        'Mega Burger',
      ],
      landmarks: ['banner', 'main', 'navigation'],
      counts: {
        headings: 5,
        links: 1,
        skipLinks: 1,
        buttons: 8,
        forms: 0,
        fields: 0,
        fieldsWithoutName: 0,
        fieldsWithoutInstructions: 0,
        requiredFields: 0,
        requiredFieldsWithoutIndicator: 0,
        passwordFields: 0,
        otpLikeFields: 0,
        images: 20,
        imagesWithoutAlt: 8,
        media: 0,
        liveRegions: 4,
        alertRegions: 0,
        nonEmptyAnnouncementRegions: 0,
        meaningfulAnnouncementRegions: 0,
        accountControls: 0,
        logoutControls: 0,
        buttonsWithoutName: 0,
        linksWithoutName: 0,
      },
      signals: {
        hasPrimaryNavigation: true,
        hasSkipLink: true,
        hasSearch: false,
        hasLogin: false,
        hasRegister: false,
        hasOtp: false,
        hasPassword: false,
        hasForgotPassword: false,
        hasResendCode: false,
        hasContact: false,
        hasAccountArea: false,
        hasLogout: false,
        hasAuthenticatedWorkspace: false,
        hasDynamicUpdateRisk: false,
        hasModalTrigger: false,
        hasMenuToggle: false,
      },
      sampleControls: [],
      forms: [],
      taskIntents: [
        {
          id: 'understand-page-structure',
          label: 'Understand page structure and primary navigation',
          category: 'Keyboard & Navigation',
          reason: 'Users need predictable landmarks, headings, links, and focus order.',
          confidence: 0.9,
        },
        {
          id: 'understand-images',
          label: 'Understand image purpose and alternatives',
          category: 'Images',
          reason: 'Some images lack alt text.',
          confidence: 0.9,
        },
      ],
    };

    const assessments = assessRaawiTaskIntents(publicRecipeProfile);

    // 1. Task intent should NOT be present on public recipe page
    const authTask = assessments.find((a) => a.taskId === 'navigate-authenticated-workspace');
    expect(authTask).toBeUndefined();

    // 2. Even if manually assessed, it must not emit authenticated_workspace_navigation_unclear
    const manualAssessment = assessRaawiTaskIntents({
      ...publicRecipeProfile,
      taskIntents: [
        ...publicRecipeProfile.taskIntents,
        {
          id: 'navigate-authenticated-workspace',
          label: 'Navigate authenticated workspace and account controls',
          category: 'Authentication & Security',
          reason: 'Testing boundary safety',
          confidence: 0.7,
        },
      ],
    });

    const manualAuth = manualAssessment.find((a) => a.taskId === 'navigate-authenticated-workspace');
    expect(manualAuth).toBeDefined();
    expect(manualAuth?.result).toBe('working');
    expect(manualAuth?.issue).toBeUndefined();
  });

  it('correctly detects authenticated_workspace_navigation_unclear when a REAL workspace lacks exit cues', () => {
    const realUnclearWorkspaceProfile: RaawiPageProfile = {
      pageType: 'dashboard',
      title: 'Portal Dashboard',
      lang: 'en',
      direction: 'ltr',
      mainHeading: null,
      headings: [],
      landmarks: [],
      counts: {
        headings: 0,
        links: 4,
        skipLinks: 0,
        buttons: 2,
        forms: 0,
        fields: 0,
        fieldsWithoutName: 0,
        fieldsWithoutInstructions: 0,
        requiredFields: 0,
        requiredFieldsWithoutIndicator: 0,
        passwordFields: 0,
        otpLikeFields: 0,
        images: 0,
        imagesWithoutAlt: 0,
        media: 0,
        liveRegions: 0,
        alertRegions: 0,
        nonEmptyAnnouncementRegions: 0,
        meaningfulAnnouncementRegions: 0,
        accountControls: 2,
        logoutControls: 0,
        buttonsWithoutName: 0,
        linksWithoutName: 0,
      },
      signals: {
        hasPrimaryNavigation: false,
        hasSkipLink: false,
        hasSearch: false,
        hasLogin: false,
        hasRegister: false,
        hasOtp: false,
        hasPassword: false,
        hasForgotPassword: false,
        hasResendCode: false,
        hasContact: false,
        hasAccountArea: true,
        hasLogout: false,
        hasAuthenticatedWorkspace: true,
        hasDynamicUpdateRisk: false,
        hasModalTrigger: false,
        hasMenuToggle: false,
      },
      sampleControls: [],
      forms: [],
      taskIntents: [
        {
          id: 'navigate-authenticated-workspace',
          label: 'Navigate authenticated workspace and account controls',
          category: 'Authentication & Security',
          reason: 'Signed-in areas should expose clear headings and logout controls.',
          confidence: 0.86,
        },
      ],
    };

    const assessments = assessRaawiTaskIntents(realUnclearWorkspaceProfile);
    const authTask = assessments.find((a) => a.taskId === 'navigate-authenticated-workspace');
    expect(authTask).toBeDefined();
    expect(authTask?.result).toBe('needs_review');
    expect(authTask?.issue?.kind).toBe('authenticated_workspace_navigation_unclear');
  });
});
