import path from 'path';

import { Cache } from './cache';
import { isDirectory, isFile } from './fs';
import { CheckName } from './types';

type ProjectCacheProperties = Record<
  'hasSourceDirectory' | 'hasTsConfig',
  boolean
>;

/**
 * TODO.
 *
 * @param directoryPath - TODO.
 */
export function buildProjectCache(directoryPath: string) {
  const sourceDirectoryPath = path.join(directoryPath, 'src');

  return new Cache<ProjectCacheProperties>({
    async hasSourceDirectory() {
      return await isDirectory(sourceDirectoryPath);
    },

    async hasTsConfig() {
      return isFile(path.join(directoryPath, 'tsconfig.json'));
    },
  });
}
