import type { RaawiPageProfile, RaawiTaskAssessment, RaawiTaskAssessmentResult } from './page-understanding.js';
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
export declare const raawiCalibrationFixtures: RaawiCalibrationFixture[];
export {};
//# sourceMappingURL=raawi-calibration-fixtures.d.ts.map