import {
  FailedRuleExecutionResult,
  Rule,
  RuleName,
  SuccessfulRuleExecutionResult,
} from './types';

// type PartialSuccessfulRuleExecutionResult<Name extends RuleName> = Omit<
// SuccessfulRuleExecutionResult<Name>,
// 'ruleName' | 'passed'
// >;
type PartialFailedRuleExecutionResult<Name extends RuleName> = Omit<
  FailedRuleExecutionResult<Name>,
  'ruleName' | 'ruleDescription' | 'passed'
>;

type Utils<Name extends RuleName> = {
  pass: () => SuccessfulRuleExecutionResult<Name>;
  fail: (
    partialRuleResult: PartialFailedRuleExecutionResult<Name>,
  ) => FailedRuleExecutionResult<Name>;
};

/**
 * TODO.
 *
 * @param args - TODO.
 * @param args.name - TODO.
 * @param args.description - TODO.
 * @param args.dependencies - TODO.
 * @param args.verify - TODO.
 * @returns TODO.
 */
export function buildRule<Name extends RuleName>({
  name,
  description,
  dependencies = [],
  verify,
}: {
  name: Name;
  description: string;
  dependencies?: Exclude<RuleName, Name>[];
  verify: (utils: Utils<Name>) => Rule<Name>['verify'];
}): Rule<Name> {
  const pass = (): SuccessfulRuleExecutionResult<Name> => {
    return {
      ruleName: name,
      ruleDescription: description,
      passed: true,
    };
  };

  const fail = (
    partialRuleResult: PartialFailedRuleExecutionResult<Name>,
  ): FailedRuleExecutionResult<Name> => {
    return {
      ruleName: name,
      ruleDescription: description,
      passed: false,
      ...partialRuleResult,
    };
  };

  return {
    name,
    description,
    dependencies,
    verify: verify({ pass, fail }),
  };
}
