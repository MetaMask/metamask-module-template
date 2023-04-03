import path from 'path';
import { inspect } from 'util';

import { buildProjectCache } from './project-cache';
import { RuleNode, buildRuleTree } from './rule-tree';
import {
  ProjectAnalysis,
  ProjectCache,
  Repository,
  RuleExecutionResultNode,
  RuleName,
} from './types';

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
  const projectCache = buildProjectCache(repositoryDirectoryPath);
  const entryRuleNodes = buildRuleTree();
  console.log('entryRuleNodes', inspect(entryRuleNodes, { depth: null }));
  process.exit(1);

  const ruleExecutionResultNodes = await runRules(entryRuleNodes, {
    projectCache,
    repositoryDirectoryPath,
  });

  const endDate = new Date();

  return {
    projectName,
    elapsedTime: endDate.getTime() - startDate.getTime(),
    ruleExecutionResultNodes,
  };
}

/**
 * TODO.
 *
 * @param ruleNodes - TODO.
 * @param verifyArgs - TODO.
 * @param verifyArgs.projectCache - TODO.
 * @param verifyArgs.repositoryDirectoryPath - TODO.
 * @returns TODO.
 */
async function runRules(
  ruleNodes: RuleNode<RuleName>[],
  verifyArgs: {
    projectCache: ProjectCache;
    repositoryDirectoryPath: string;
  },
): Promise<RuleExecutionResultNode<RuleName>[]> {
  const ruleExecutionResultNodes: RuleExecutionResultNode<RuleName>[] = [];
  for (const ruleNode of ruleNodes) {
    await runRule(ruleNode, verifyArgs);
  }
  return ruleExecutionResultNodes;
}

/**
 * TODO.
 *
 * @param ruleNode - TODO.
 * @param verifyArgs - TODO.
 * @param verifyArgs.projectCache - TODO.
 * @param verifyArgs.repositoryDirectoryPath - TODO.
 * @returns TODO.
 */
async function runRule<Name extends RuleName>(
  ruleNode: RuleNode<Name>,
  verifyArgs: {
    projectCache: ProjectCache;
    repositoryDirectoryPath: string;
  },
): Promise<RuleExecutionResultNode<Name>> {
  console.log('Running rule', ruleNode.rule.name);

  const ruleExecutionResult = await ruleNode.rule.verify(verifyArgs);
  const children: RuleExecutionResultNode<RuleName>[] =
    ruleNode.children.length > 0
      ? await runRules(ruleNode.children, verifyArgs)
      : [];
  return {
    value: ruleExecutionResult,
    children,
  };
}
