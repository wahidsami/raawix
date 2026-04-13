import { describe, expect, it } from 'vitest';
import { assessRaawiTaskIntents } from './page-understanding.js';
import { raawiCalibrationFixtures } from './raawi-calibration-fixtures.js';

describe('raawi calibration fixtures', () => {
  it('keeps benchmark expectations stable across known scenarios', () => {
    const failures: string[] = [];

    for (const fixture of raawiCalibrationFixtures) {
      const assessments = assessRaawiTaskIntents(fixture.profile);

      for (const expectation of fixture.expectations) {
        const assessment = assessments.find((item) => item.taskId === expectation.taskId);
        if (!assessment) {
          failures.push(`${fixture.id}: missing assessment for task ${expectation.taskId}`);
          continue;
        }

        if (assessment.result !== expectation.result) {
          failures.push(
            `${fixture.id}: expected ${expectation.taskId} to be ${expectation.result}, got ${assessment.result}`
          );
        }

        if (expectation.issueKind && assessment.issue?.kind !== expectation.issueKind) {
          failures.push(
            `${fixture.id}: expected issue ${expectation.issueKind} for ${expectation.taskId}, got ${assessment.issue?.kind ?? 'none'}`
          );
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
