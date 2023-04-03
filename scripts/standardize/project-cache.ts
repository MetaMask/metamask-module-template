import fs from 'fs';
import path from 'path';

import { Cache } from './cache';
import { ROOT_DIRECTORY } from './constants';
import { isDirectory, isFile, readJsonFile } from './fs';
import { ProjectCacheProperties } from './types';

/**
 * TODO.
 *
 * @param directoryPath - TODO.
 * @returns TODO.
 */
// TODO: Rename to buildRuleSetExecutionCache
export function buildProjectCache(
  directoryPath: string,
): Cache<ProjectCacheProperties> {
  const sourceDirectoryPath = path.join(directoryPath, 'src');

  return new Cache<ProjectCacheProperties>({
    async hasSourceDirectory() {
      return await isDirectory(sourceDirectoryPath);
    },

    async hasTsConfig() {
      return isFile(path.join(directoryPath, 'tsconfig.json'));
    },

    async templateTsConfig() {
      return await readJsonFile(path.join(ROOT_DIRECTORY, 'tsconfig.json'));
    },

    async tsConfig() {
      return await readJsonFile(path.join(directoryPath, 'tsconfig.json'));
    },

    async hasYarn1Config() {
      return isFile(path.join(directoryPath, '.yarnrc'));
    },

    async hasPackageManifest() {
      return isFile(path.join(directoryPath, 'package.json'));
    },

    async packageManifest() {
      return await readJsonFile(path.join(directoryPath, 'package.json'));
    },

    async templateRootEntryPaths() {
      return await fs.promises.readdir(ROOT_DIRECTORY);
    },

    async rootEntryPaths() {
      return await fs.promises.readdir(directoryPath);
    },
  });
}
