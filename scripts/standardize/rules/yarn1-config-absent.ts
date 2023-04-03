import { buildRule } from '../rule';
import { RuleName } from '../types';

export default buildRule({
  name: RuleName.Yarn1ConfigAbsent,
  description: 'Has the Yarn config file been migrated?',
  dependencies: [],
  verify: ({ pass, fail }) => {
    return async ({ projectCache }) => {
      const failed = await projectCache.fetch('hasYarn1Config');
      const entryPath = '.yarnrc.yml';
      const failures = [
        {
          message:
            'This file is obsolete. Please convert this project to Yarn v3, making sure to merge these settings into .yarnrc.yml.',
          details: { entryPath },
        },
      ];

      return failed ? fail({ failures }) : pass();
    };
  },
});
