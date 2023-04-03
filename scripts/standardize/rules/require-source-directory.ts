import { buildRule } from '../rule';
import { RuleName } from '../types';

export default buildRule({
  name: RuleName.RequireSourceDirectory,
  description: 'Does the src/ directory exist?',
  verify: ({ pass, fail }) => {
    return async ({ projectCache }) => {
      const passed = await projectCache.fetch('hasSourceDirectory');
      const entryPath = 'src/';
      const failures = [
        {
          message:
            'This directory exists in the module template, but not in this repo.',
          details: { entryPath },
        },
      ];

      return passed ? pass() : fail({ failures });
    };
  },
});
