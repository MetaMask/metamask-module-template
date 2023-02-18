import fs from 'fs';
import path from 'path';
// import {literal, object, string} from 'superstruct';
// import { format } from 'util';

import { ROOT_DIRECTORY } from './constants';
import { isDirectory, isFile, readJsonFile } from './fs';
import { flattenObject, getProperty } from './misc-utils';
import { ProjectAnalysis, Repository, Violation } from './types';

/*
const ManifestStruct = object({
  name: string(),
  version: string(),
  description: string(),
  repository: object({
    type: literal('git'),
    url: literal('https://github.com/MetaMask/metamask-module-template'),
  }),
});
*/

// RULES
//
// - Project structure
//   - All source files located in src/?
// - TypeScript
//   - Using TypeScript at all?
//   - Using a tsconfig.build.json?
//   - All settings in tsconfig.json being used?
//   - All settings in tsconfig.build.json being used?
//   - Using the same version of TypeScript as in template?
//   - TypeScript-related ESLint packages present and using same version as template?
//   - `@types/*` packages present?
//   - "main" present in package.json and set to "dist/index.js"?
//   - "types" present in package.json and set to "dist/index.d.ts"?
//   - (If types/ directory present) types/ excluded from tsconfig.build.json?
// - Documentation
//   - typedoc package included in package.json?
//   - typedoc.json file present?
//   - "build:docs" package script present?
//   - Documentation-related GitHub workflows added?
//   - scripts/get.sh present?
// - Yarn
//   - Using Yarn v3?
//     - .yarnrc.yml present instead of .yarnrc?
//     - yarn.lock in new format?
//     - .yarn/releases/*.cjs present and listed in .yarnrc.yml?
//     - Yarn v3 section present in .gitignore?
//   - All settings in .yarnrc.yml being used?
//   - `scripts/prepack.sh` present?
//   - "prepack" package script present?
// - Node version
//   - .nvmrc file present and using v16?
//   - Node v16 reflected in the README?
//   - "engines" package in package.json set to >= 14.0.0?
//   - GitHub workflow lists 14.x, 16.x, 18.x, 19.x?
// - ESLint
//   - ESLint configuration up to date?
//   - Using the latest versions of official and MetaMask ESLint packages?
//   - All settings in .eslintrc.js being used?
// - Prettier
//   - Using the latest versions of official and unofficial Prettier packages?
//   - .prettierrc.js present?
// - Dependency checking
//   - "lint:dependencies" package script present?
//   - depcheck present in package.json?
//   - Both "lint" and "lint:fix" scripts include "lint:dependencies"?
//   - .depcheckrc.json
// - allow-scripts
//   - Using the latest version of @lavamoat/allow-scripts?
//   - `lavamoat.allowScripts` present in package.json?
//   - (If using Yarn v3) allow-scripts present as a Yarn plugin and in .yarnrc.yml?
// - Changelog validation
//   - Using the latest version of @metamask/auto-changelog?
//   - Changelog job listed in GitHub workflow?
//   - CHANGELOG.md present and passes auto-changelog?
// - README
//   - In correct format?
//     - Header, followed by description, then Installation (Yarn or NPM), then Usage, then API (optional), then Contributing
// - Testing
//   - All tests located in `src/`?
//   - All tests written in Jest?
//   - jest.config.js and matches template?
//   - Jest-related ESLint packages present and matches template?
//   - jest-it-up package present?
// - Publishing
//   - package.json contains "name"?
//   - package.json contains "version"?
//   - package.json contains "description"?
//   - package.json contains "repository" matching the repo?
//   - package.json contains "main"?
//   - package.json contains "publishConfig"?
//   - Publishing-related GitHub workflows present?
// - Final checks
//   - Using all of our GitHub workflows?
//   - .editorconfig matches?
//   - .gitattributes matches?
//   - .gitignore matches? (minus Yarn v3 section)
//   - .gitattributes matches?

/**
 * TODO.
 *
 * @param repository - TODO.
 * @param repository.directoryPath - TODO.
 */
export async function standardizeRepository({
  directoryPath: repositoryDirectoryPath,
}: Repository): Promise<ProjectAnalysis> {
  const startDate = new Date();
  const projectName = path.basename(repositoryDirectoryPath);

  const sourceDirectoryPath = path.join(repositoryDirectoryPath, 'src');
  // const templateManifest = await readJsonFile(
  // path.join(ROOT_DIRECTORY, 'package.json'),
  // );
  const violations: Violation[] = [];

  // Does the src/ directory exist?
  if (await isDirectory(sourceDirectoryPath)) {
    // Does the project have a tsconfig.json?
    if (await isFile(path.join(repositoryDirectoryPath, 'tsconfig.json'))) {
      // Are all the settings in tsconfig.json being used?
      const templateJsonContent = await readJsonFile(
        path.join(ROOT_DIRECTORY, 'tsconfig.json'),
      );
      const projectJsonContent = await readJsonFile(
        path.join(repositoryDirectoryPath, 'tsconfig.json'),
      );
      for (const { propertyPath } of flattenObject(templateJsonContent)) {
        if (!getProperty(projectJsonContent, propertyPath)) {
          violations.push({
            entryPath: 'tsconfig.json',
            message: `Missing property "${propertyPath.join('.')}".`,
          });
        }
      }
    } else {
      violations.push({
        entryPath: 'tsconfig.json',
        message:
          'This file exists in the module template, but not in this repo.',
      });
    }
  } else {
    violations.push({
      entryPath: 'src/',
      message:
        'This directory exists in the module template, but not in this repo.',
    });
  }

  const isYarn1ConfigFilePresent = await isFile(
    path.join(repositoryDirectoryPath, '.yarnrc'),
  );
  const isYarn2ConfigFilePresent = await isFile(
    path.join(repositoryDirectoryPath, '.yarnrc.yml'),
  );
  if (isYarn1ConfigFilePresent && !isYarn2ConfigFilePresent) {
    violations.push({
      entryPath: '.yarnrc',
      message:
        'This file is obsolete. Please convert this project to Yarn v3, making sure to merge these settings into .yarnrc.yml.',
    });
  }

  // Is there a package.json?
  if (await isFile(path.join(repositoryDirectoryPath, 'package.json'))) {
    const manifest = await readJsonFile(
      path.join(repositoryDirectoryPath, 'package.json'),
    );

    if ('name' in manifest) {
      // do nothing for now
    } else {
      violations.push({
        entryPath: 'package.json',
        message: 'Package manifest is missing a "name" field.',
      });
    }

    if ('version' in manifest) {
      // do nothing for now
    } else {
      violations.push({
        entryPath: 'package.json',
        message: 'Package manifest is missing a "version" field.',
      });
    }
  } else {
    violations.push({
      entryPath: 'package.json',
      message: 'This file exists in the module template, but not in this repo.',
    });
  }

  // If the package is not private, does it have a LICENSE?
  if (await isFile(path.join(repositoryDirectoryPath, 'LICENSE'))) {
    // TODO
  }

  // Are there any other unknown paths in the root of the project?
  const knownEntryPaths = (await fs.promises.readdir(ROOT_DIRECTORY)).concat([
    '.yarnrc',
    'LICENSE',
  ]);
  const entryPathsInProjectRoot = await fs.promises.readdir(
    repositoryDirectoryPath,
  );
  const unknownEntryPaths = entryPathsInProjectRoot.filter(
    (entryPath) => !knownEntryPaths.includes(entryPath),
  );
  for (const unknownEntryPath of unknownEntryPaths) {
    const isEntryDirectory = await isDirectory(
      path.join(repositoryDirectoryPath, unknownEntryPath),
    );
    const message = `This ${
      isEntryDirectory ? 'directory' : 'file'
    } does not exist in the module template. Should it be moved to src/?`;
    const violationPath = isEntryDirectory
      ? `${unknownEntryPath}/`
      : unknownEntryPath;

    violations.push({ entryPath: violationPath, message });
  }

  const endDate = new Date();

  return {
    projectName,
    elapsedTime: endDate.getTime() - startDate.getTime(),
    violations,
  };
}
