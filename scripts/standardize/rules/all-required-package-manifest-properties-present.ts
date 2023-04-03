import { getPropertyViaPath } from '../misc-utils';
import { buildRule } from '../rule';
import { RuleExecutionFailure, RuleName } from '../types';

export default buildRule({
  name: RuleName.AllRequiredPackageManifestPropertiesPresent,
  description: 'Are all the settings in package.json being used?',
  dependencies: [RuleName.RequirePackageManifest],
  verify: ({ pass, fail }) => {
    return async ({ projectCache }) => {
      const requiredPropertyPaths = [['name'], ['version']];
      const packageManifest = await projectCache.fetch('packageManifest');
      const entryPath = 'package.json';

      const failures = requiredPropertyPaths.reduce<RuleExecutionFailure[]>(
        (array, propertyPath) => {
          if (getPropertyViaPath(packageManifest, propertyPath)) {
            return array;
          }
          return [
            ...array,
            {
              message: `Package manifest is missing a "${propertyPath.join(
                '.',
              )}" field.`,
              details: {
                entryPath,
                propertyPath,
              },
            },
          ];
        },
        [],
      );

      return failures.length > 0 ? fail({ failures }) : pass();
    };
  },
});
