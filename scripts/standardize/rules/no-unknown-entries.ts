import path from 'path';

import { isDirectory } from '../fs';
import { buildRule } from '../rule';
import { RuleName } from '../types';

export default buildRule({
  name: RuleName.NoUnknownEntries,
  description: 'Are there any other unknown paths in the root of the project?',
  verify: ({ pass, fail }) => {
    return async ({ projectCache, repositoryDirectoryPath }) => {
      const knownEntryPaths = (
        await projectCache.fetch('templateRootEntryPaths')
      ).concat(['.yarnrc', 'LICENSE']);
      const entryPathsInProjectRoot = await projectCache.fetch(
        'rootEntryPaths',
      );
      const unknownEntryPaths = entryPathsInProjectRoot.filter(
        (entryPath) => !knownEntryPaths.includes(entryPath),
      );
      const failures = [];
      for (const unknownEntryPath of unknownEntryPaths) {
        const isEntryDirectory = await isDirectory(
          path.join(repositoryDirectoryPath, unknownEntryPath),
        );
        const message = `"${unknownEntryPath}" does not exist in the module template. Should it be moved to src/?`;
        const checkResultPath = isEntryDirectory
          ? `${unknownEntryPath}/`
          : unknownEntryPath;

        failures.push({
          message,
          details: {
            entryPath: checkResultPath,
          },
        });
      }

      return failures.length > 0 ? fail({ failures }) : pass();
    };
  },
});
