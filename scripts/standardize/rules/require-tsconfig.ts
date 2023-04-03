import { buildRule } from '../rule';
import { RuleName } from '../types';

export default buildRule({
  name: RuleName.RequireTsConfig,
  description: 'Does the project have a tsconfig.json?',
  dependencies: [RuleName.RequireSourceDirectory],
  verify: ({ pass, fail }) => {
    return async ({ projectCache }) => {
      const passed = await projectCache.fetch('hasTsConfig');
      const entryPath = 'tsconfig.json';
      const failures = [
        {
          message:
            'This file exists in the module template, but not in this repo.',
          details: { entryPath },
        },
      ];

      return passed ? pass() : fail({ failures });
    };
  },
});
