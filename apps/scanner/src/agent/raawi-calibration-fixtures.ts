import type {
  RaawiPageProfile,
  RaawiTaskAssessment,
  RaawiTaskAssessmentResult,
  RaawiTaskIntent,
  RaawiPageType,
} from './page-understanding.js';

type CalibrationExpectation = {
  taskId: string;
  result: RaawiTaskAssessmentResult;
  issueKind?: NonNullable<RaawiTaskAssessment['issue']>['kind'];
};

export type RaawiCalibrationFixture = {
  id: string;
  label: string;
  focus: string[];
  profile: RaawiPageProfile;
  expectations: CalibrationExpectation[];
};

type ProfileOverrides = Partial<Omit<RaawiPageProfile, 'counts' | 'signals' | 'forms' | 'taskIntents' | 'sampleControls'>> & {
  counts?: Partial<RaawiPageProfile['counts']>;
  signals?: Partial<RaawiPageProfile['signals']>;
  forms?: RaawiPageProfile['forms'];
  taskIntents?: RaawiTaskIntent[];
  sampleControls?: RaawiPageProfile['sampleControls'];
};

function taskIntent(
  id: string,
  label: string,
  category: RaawiTaskIntent['category'],
  confidence = 0.9
): RaawiTaskIntent {
  return {
    id,
    label,
    category,
    reason: `Calibration fixture for ${label}.`,
    confidence,
  };
}

function createProfile(overrides: ProfileOverrides): RaawiPageProfile {
  const pageType = overrides.pageType ?? ('content' satisfies RaawiPageType);
  return {
    pageType,
    title: overrides.title ?? 'Calibration Fixture',
    lang: overrides.lang ?? 'en',
    direction: overrides.direction ?? 'ltr',
    mainHeading: 'mainHeading' in overrides ? (overrides.mainHeading ?? null) : 'Calibration Fixture',
    headings: 'headings' in overrides ? (overrides.headings ?? []) : ['Calibration Fixture'],
    landmarks: 'landmarks' in overrides ? (overrides.landmarks ?? []) : ['main'],
    counts: {
      headings: 1,
      links: 0,
      skipLinks: 0,
      buttons: 0,
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
      accountControls: 0,
      logoutControls: 0,
      buttonsWithoutName: 0,
      linksWithoutName: 0,
      ...(overrides.counts ?? {}),
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
      hasAccountArea: false,
      hasLogout: false,
      hasAuthenticatedWorkspace: false,
      hasDynamicUpdateRisk: false,
      hasModalTrigger: false,
      hasMenuToggle: false,
      ...(overrides.signals ?? {}),
    },
    sampleControls: overrides.sampleControls ?? [],
    forms: overrides.forms ?? [],
    taskIntents: overrides.taskIntents ?? [],
  };
}

export const raawiCalibrationFixtures: RaawiCalibrationFixture[] = [
  {
    id: 'dynamic-empty-announcement',
    label: 'Dynamic update page with empty announcement regions',
    focus: ['assistive-tech', 'dynamic-updates'],
    profile: createProfile({
      pageType: 'search',
      mainHeading: 'Search Results',
      headings: ['Search Results'],
      landmarks: ['main', 'search'],
      counts: {
        liveRegions: 1,
        nonEmptyAnnouncementRegions: 0,
        meaningfulAnnouncementRegions: 0,
      },
      signals: {
        hasDynamicUpdateRisk: true,
        hasSearch: true,
      },
      taskIntents: [
        taskIntent('follow-dynamic-updates', 'Follow dynamic updates with assistive technology', 'Assistive Technology'),
      ],
    }),
    expectations: [
      {
        taskId: 'follow-dynamic-updates',
        result: 'needs_review',
        issueKind: 'dynamic_updates_not_announced',
      },
    ],
  },
  {
    id: 'dynamic-meaningful-announcement',
    label: 'Dynamic update page with meaningful announcements and orientation',
    focus: ['assistive-tech', 'dynamic-updates'],
    profile: createProfile({
      pageType: 'search',
      mainHeading: 'Search Results',
      headings: ['Search Results'],
      landmarks: ['main', 'search'],
      counts: {
        liveRegions: 1,
        nonEmptyAnnouncementRegions: 1,
        meaningfulAnnouncementRegions: 1,
      },
      signals: {
        hasDynamicUpdateRisk: true,
        hasSearch: true,
      },
      taskIntents: [
        taskIntent('follow-dynamic-updates', 'Follow dynamic updates with assistive technology', 'Assistive Technology'),
      ],
    }),
    expectations: [
      {
        taskId: 'follow-dynamic-updates',
        result: 'working',
      },
    ],
  },
  {
    id: 'dynamic-weak-orientation',
    label: 'Dynamic update page with announcements but weak orientation cues',
    focus: ['assistive-tech', 'dynamic-updates'],
    profile: createProfile({
      pageType: 'search',
      mainHeading: null,
      headings: [],
      landmarks: [],
      counts: {
        headings: 0,
        liveRegions: 1,
        nonEmptyAnnouncementRegions: 1,
        meaningfulAnnouncementRegions: 1,
      },
      signals: {
        hasDynamicUpdateRisk: true,
        hasSearch: true,
      },
      taskIntents: [
        taskIntent('follow-dynamic-updates', 'Follow dynamic updates with assistive technology', 'Assistive Technology'),
      ],
    }),
    expectations: [
      {
        taskId: 'follow-dynamic-updates',
        result: 'needs_review',
        issueKind: 'dynamic_updates_not_announced',
      },
    ],
  },
  {
    id: 'authenticated-workspace-clear',
    label: 'Signed-in workspace with clear structure and logout cues',
    focus: ['authenticated-journeys', 'workspace'],
    profile: createProfile({
      pageType: 'dashboard',
      mainHeading: 'Account Overview',
      headings: ['Account Overview'],
      landmarks: ['main', 'navigation'],
      counts: {
        accountControls: 3,
        logoutControls: 1,
      },
      signals: {
        hasAccountArea: true,
        hasLogout: true,
        hasAuthenticatedWorkspace: true,
      },
      taskIntents: [
        taskIntent(
          'navigate-authenticated-workspace',
          'Navigate authenticated workspace and account controls',
          'Authentication & Security'
        ),
      ],
    }),
    expectations: [
      {
        taskId: 'navigate-authenticated-workspace',
        result: 'working',
      },
    ],
  },
  {
    id: 'authenticated-workspace-unclear',
    label: 'Signed-in workspace with weak structure and no exit cue',
    focus: ['authenticated-journeys', 'workspace'],
    profile: createProfile({
      pageType: 'dashboard',
      mainHeading: null,
      headings: [],
      landmarks: [],
      counts: {
        headings: 0,
        accountControls: 2,
        logoutControls: 0,
      },
      signals: {
        hasAccountArea: true,
        hasLogout: false,
        hasAuthenticatedWorkspace: true,
      },
      taskIntents: [
        taskIntent(
          'navigate-authenticated-workspace',
          'Navigate authenticated workspace and account controls',
          'Authentication & Security'
        ),
      ],
    }),
    expectations: [
      {
        taskId: 'navigate-authenticated-workspace',
        result: 'needs_review',
        issueKind: 'authenticated_workspace_navigation_unclear',
      },
    ],
  },
  {
    id: 'form-missing-instructions',
    label: 'Form task with missing instructions',
    focus: ['forms', 'calibration'],
    profile: createProfile({
      pageType: 'contact',
      mainHeading: 'Contact Us',
      headings: ['Contact Us'],
      landmarks: ['main', 'form'],
      counts: {
        forms: 1,
        fields: 3,
        fieldsWithoutInstructions: 1,
        requiredFields: 1,
      },
      taskIntents: [
        taskIntent('complete-form', 'Complete and submit form', 'Forms & Inputs'),
      ],
    }),
    expectations: [
      {
        taskId: 'complete-form',
        result: 'needs_review',
        issueKind: 'missing_form_instructions',
      },
    ],
  },
  {
    id: 'content-page-missing-heading',
    label: 'Content page with no clear main heading',
    focus: ['content', 'structure'],
    profile: createProfile({
      pageType: 'content',
      mainHeading: null,
      headings: [],
      landmarks: ['navigation'],
      counts: {
        headings: 0,
        links: 14,
      },
      signals: {
        hasPrimaryNavigation: true,
      },
      taskIntents: [
        taskIntent('understand-page-structure', 'Understand page structure and primary navigation', 'Keyboard & Navigation'),
      ],
    }),
    expectations: [
      {
        taskId: 'understand-page-structure',
        result: 'not_working',
        issueKind: 'missing_page_structure',
      },
    ],
  },
];
