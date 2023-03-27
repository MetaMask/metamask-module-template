export type Repository = {
  directoryPath: string;
  currentBranchName: string;
  defaultBranchName: string;
};

export type CheckName =
  | 'hasSourceDirectory'
  | 'hasTsConfig'
  | 'hasTsConfigProperty'
  | 'doesNotHaveYarn1Config'
  | 'manifestHasNameField'
  | 'manifestHasVersionField'
  | 'hasFileFromModuleTemplate'
  | 'doesNotHaveFileNotInModuleTemplate';

type BaseCheckResult = {
  entryPath: string;
  checkName: CheckName;
  details?: Record<string, unknown>;
};

export type SuccessfulCheckResult = BaseCheckResult & { passed: true };
export type FailedCheckResult = BaseCheckResult & {
  passed: false;
  failureMessage: string;
};
export type CheckResult = SuccessfulCheckResult | FailedCheckResult;

export type ProjectAnalysis = {
  elapsedTime: number;
  projectName: string;
  checkResults: CheckResult[];
};

/**
 * TODO.
 *
 * @param checkResult - TODO.
 */
export function isFailedCheckResult(
  checkResult: CheckResult,
): checkResult is FailedCheckResult {
  return !checkResult.passed;
}
