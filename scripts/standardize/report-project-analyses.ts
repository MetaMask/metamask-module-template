import chalk from 'chalk';

import { buildDivider } from './misc-utils';
import { ProjectAnalysis, RuleExecutionResultNode, RuleName } from './types';

type IndexedProjectAnalyses = Record<string, ProjectAnalysis>;

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
        [projectAnalysis.projectName]: projectAnalysis,
      };
    },
    {},
  );
}

/**
 * TODO.
 *
 * @param ruleExecutionResultNodes - TODO.
 * @param level - TODO.
 */
function reportRuleExecutionResultNodes(
  ruleExecutionResultNodes: RuleExecutionResultNode<RuleName>[],
  level = 0,
) {
  let indentation = '';
  for (let i = 0; i < level; i++) {
    indentation += ' ';
  }
  ruleExecutionResultNodes.forEach((ruleExecutionResultNode) => {
    console.log(
      `${indentation}- ${ruleExecutionResultNode.value.ruleDescription} ${
        ruleExecutionResultNode.value.passed ? '✅' : '❌'
      }`,
    );
    if ('failures' in ruleExecutionResultNode.value) {
      console.log(
        `${indentation}  ${chalk.yellow(
          ruleExecutionResultNode.value.failures.join(', '),
        )}`,
      );
    }

    reportRuleExecutionResultNodes(ruleExecutionResultNode.children, level + 1);
  });
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

    /*
    console.log(
      `Analyzed project in ${chalk.blue(
        projectAnalysis.elapsedTime,
      )} ms. Found ${chalk.blue(
        projectAnalysis.checkResults.length,
      )} checkResult(s) in ${chalk.blue(entryPaths.length)} file(s).\n`,
    );
    */

    reportRuleExecutionResultNodes(projectAnalysis.ruleExecutionResultNodes);
  }

  console.log('');
}
