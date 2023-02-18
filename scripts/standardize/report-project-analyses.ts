import chalk from 'chalk';

import { buildDivider } from './misc-utils';
import { ProjectAnalysis, Violation } from './types';

type IndexedViolations = Record<string, Violation[]>;
type IndexedProjectAnalysis = ProjectAnalysis & {
  violationsByEntryPath: IndexedViolations;
};
type IndexedProjectAnalyses = Record<string, IndexedProjectAnalysis>;

/**
 * TODO.
 *
 * @param violations - TODO.
 * @returns TODO.
 */
function indexViolationsByEntryPath(
  violations: Violation[],
): IndexedViolations {
  return violations.reduce<IndexedViolations>((obj, violation) => {
    const existingViolations = obj[violation.entryPath];

    if (existingViolations === undefined) {
      return {
        ...obj,
        [violation.entryPath]: [violation],
      };
    }
    return {
      ...obj,
      [violation.entryPath]: [...existingViolations, violation],
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
      return {
        ...obj,
        [projectAnalysis.projectName]: {
          ...projectAnalysis,
          violationsByEntryPath: indexViolationsByEntryPath(
            projectAnalysis.violations,
          ),
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
      projectAnalysis.violationsByEntryPath,
    ).sort();
    if (entryPaths.length > 0) {
      console.log(
        `Analyzed project in ${chalk.blue(
          projectAnalysis.elapsedTime,
        )} ms. Found ${chalk.blue(
          projectAnalysis.violations.length,
        )} violation(s) in ${chalk.blue(entryPaths.length)} file(s).\n`,
      );
    }
    for (const entryPath of entryPaths) {
      console.log(`- ${chalk.yellow(entryPath)}`);
      const entryPathViolations =
        projectAnalysis.violationsByEntryPath[entryPath];
      if (entryPathViolations === undefined) {
        continue;
      }
      for (const violation of entryPathViolations) {
        console.log(`  - ${violation.message}`);
      }
    }
  }

  console.log('');
}
