import chalk from 'chalk';

import { buildDivider } from './misc-utils';
import {
  CheckResult,
  FailedCheckResult,
  ProjectAnalysis,
  isFailedCheckResult,
} from './types';

type IndexedFailedCheckResults = Record<string, FailedCheckResult[]>;
type IndexedProjectAnalysis = ProjectAnalysis & {
  failedCheckResultsByEntryPath: IndexedFailedCheckResults;
};
type IndexedProjectAnalyses = Record<string, IndexedProjectAnalysis>;

/**
 * TODO.
 *
 * @param checkResults - TODO.
 * @returns TODO.
 */
function indexFailedCheckResultsByEntryPath(
  checkResults: FailedCheckResult[],
): IndexedFailedCheckResults {
  return checkResults.reduce<IndexedFailedCheckResults>((obj, checkResult) => {
    const existingCheckResults = obj[checkResult.entryPath];

    if (existingCheckResults === undefined) {
      return {
        ...obj,
        [checkResult.entryPath]: [checkResult],
      };
    }
    return {
      ...obj,
      [checkResult.entryPath]: [...existingCheckResults, checkResult],
    };
  }, {});
}

/**
 * TODO.
 *
 * @param projectAnalyses - TODO.
 * @returns TODO.
 */
function indexProjectAnalysesByName(
  projectAnalyses: ProjectAnalysis[],
): IndexedProjectAnalyses {
  return projectAnalyses.reduce<IndexedProjectAnalyses>(
    (obj, projectAnalysis) => {
      const failedCheckResults =
        projectAnalysis.checkResults.filter(isFailedCheckResult);
      return {
        ...obj,
        [projectAnalysis.projectName]: {
          ...projectAnalysis,
          failedCheckResultsByEntryPath:
            indexFailedCheckResultsByEntryPath(failedCheckResults),
        },
      };
    },
    {},
  );
}

/**
 * TODO.
 *
 * @param projectAnalyses - TODO.
 */
export function reportProjectAnalyses(projectAnalyses: ProjectAnalysis[]) {
  const projectAnalysesByProjectName =
    indexProjectAnalysesByName(projectAnalyses);

  for (const projectName of Object.keys(projectAnalysesByProjectName).sort()) {
    const projectAnalysis = projectAnalysesByProjectName[projectName];

    if (projectAnalysis === undefined) {
      continue;
    }

    console.log(`\n${chalk.magenta(projectAnalysis.projectName)}`);
    console.log(
      `${chalk.magenta(
        buildDivider('-', projectAnalysis.projectName.length),
      )}\n`,
    );

    const entryPaths = Object.keys(
      projectAnalysis.failedCheckResultsByEntryPath,
    ).sort();
    if (entryPaths.length > 0) {
      console.log(
        `Analyzed project in ${chalk.blue(
          projectAnalysis.elapsedTime,
        )} ms. Found ${chalk.blue(
          projectAnalysis.checkResults.length,
        )} checkResult(s) in ${chalk.blue(entryPaths.length)} file(s).\n`,
      );
    }
    for (const entryPath of entryPaths) {
      console.log(`- ${chalk.yellow(entryPath)}`);
      const entryPathCheckResults =
        projectAnalysis.failedCheckResultsByEntryPath[entryPath];
      if (entryPathCheckResults === undefined) {
        continue;
      }
      for (const checkResult of entryPathCheckResults) {
        console.log(`  - ${checkResult.failureMessage}`);
      }
    }
  }

  console.log('');
}
