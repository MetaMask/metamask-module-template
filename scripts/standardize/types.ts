import { PlainObject } from '@metamask/utils';

import { Cache } from './cache';

export type Repository = {
  directoryPath: string;
  currentBranchName: string;
  defaultBranchName: string;
};

export enum RuleName {
  RequireSourceDirectory = 'require-source-directory',
  RequireTsConfig = 'require-tsconfig',
  AllRequiredTsConfigPropertiesPresent = 'all-required-tsconfig-properties-present',
  Yarn1ConfigAbsent = 'yarn1-config-absent',
  RequirePackageManifest = 'require-package-manifest',
  AllRequiredPackageManifestPropertiesPresent = 'all-required-package-manifest-properties-present',
  NoUnknownEntries = 'no-unknown-entries',
}

export type ProjectCacheProperties = {
  hasSourceDirectory: boolean;
  hasTsConfig: boolean;
  templateTsConfig: PlainObject;
  tsConfig: PlainObject;
  hasYarn1Config: boolean;
  hasPackageManifest: boolean;
  packageManifest: PlainObject;
  templateRootEntryPaths: string[];
  rootEntryPaths: string[];
};
export type ProjectCache = Cache<ProjectCacheProperties>;

type BaseRuleExecutionResult<Name extends RuleName> = {
  ruleName: Name;
  ruleDescription: string;
};
export type SuccessfulRuleExecutionResult<Name extends RuleName> =
  BaseRuleExecutionResult<Name> & {
    passed: true;
  };
export type RuleExecutionFailure = {
  message: string;
  // Could include entryPath, etc.
  details?: Record<string, unknown>;
};
export type FailedRuleExecutionResult<Name extends RuleName> =
  BaseRuleExecutionResult<Name> & {
    passed: false;
    failures: RuleExecutionFailure[];
  };
export type RuleExecutionResult<Name extends RuleName> =
  | SuccessfulRuleExecutionResult<Name>
  | FailedRuleExecutionResult<Name>;

export type RuleExecutionResultNode<Name extends RuleName> = {
  value: RuleExecutionResult<Name>;
  // TODO: Figure out a way to have Name be RuleName but also exclude Name
  children: RuleExecutionResultNode<RuleName>[];
};

export type ProjectAnalysis = {
  elapsedTime: number;
  projectName: string;
  ruleExecutionResultNodes: RuleExecutionResultNode<RuleName>[];
};

export type Rule<Name extends RuleName> = {
  name: Name;
  description: string;
  dependencies: Exclude<RuleName, Name>[];
  verify(helpers: {
    projectCache: ProjectCache;
    repositoryDirectoryPath: string;
  }): Promise<RuleExecutionResult<Name>>;
};

/**
 * TODO.
 *
 * @param ruleResult - TODO.
 * @returns TODO.
 */
// export function isFailedRuleExecutionResult<Name extends RuleName>(
// ruleResult: RuleExecutionResult<Name>,
// ): ruleResult is FailedRuleExecutionResult<Name> {
// return !ruleResult.passed;
// }
