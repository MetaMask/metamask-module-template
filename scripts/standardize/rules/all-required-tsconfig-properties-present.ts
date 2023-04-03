import { flattenObject, getPropertyViaPath } from '../misc-utils';
import { buildRule } from '../rule';
import { RuleExecutionFailure, RuleName } from '../types';

export default buildRule({
  name: RuleName.AllRequiredTsConfigPropertiesPresent,
  description: 'Are all the settings in tsconfig.json being used?',
  dependencies: [RuleName.RequireTsConfig],
  verify: ({ pass, fail }) => {
    return async ({ projectCache }) => {
      const templateJsonContent = await projectCache.fetch('templateTsConfig');
      const projectJsonContent = await projectCache.fetch('tsConfig');
      const entryPath = 'tsconfig.json';

      const failures = flattenObject(templateJsonContent).reduce<
        RuleExecutionFailure[]
      >((array, { propertyPath }) => {
        if (getPropertyViaPath(projectJsonContent, propertyPath)) {
          return array;
        }
        return [
          ...array,
          {
            message: `Missing property "${propertyPath.join('.')}".`,
            details: {
              entryPath,
              propertyPath,
            },
          },
        ];
      }, []);

      return failures.length > 0 ? fail({ failures }) : pass();
    };
  },
});
