import { DepGraph } from 'dependency-graph';

import { rules } from './rules';
import { Rule, RuleName } from './types';

export type RuleNode<Name extends RuleName> = {
  rule: Rule<Name>;
  // TODO: Figure out a way to have Name be RuleName but also exclude Name
  children: RuleNode<RuleName>[];
};

/**
 * TODO.
 *
 * @param graph - TODO.
 * @param nodeName - TODO.
 */
function buildRuleNode(graph: DepGraph<Rule<RuleName>>, nodeName: string) {
  const rule = graph.getNodeData(nodeName);
  return {
    rule,
    children: buildRuleNodes(graph, graph.dependenciesOf(nodeName, true)),
  };
}

/**
 * TODO.
 *
 * @param graph - TODO.
 * @param nodeNames - TODO.
 * @returns TODO.
 */
function buildRuleNodes(
  graph: DepGraph<Rule<RuleName>>,
  nodeNames: string[],
): RuleNode<RuleName>[] {
  return nodeNames.map((nodeName) => buildRuleNode(graph, nodeName));
}

/**
 * TODO.
 *
 * @returns TODO.
 */
export function buildRuleTree(): RuleNode<RuleName>[] {
  const graph = new DepGraph<Rule<RuleName>>();
  rules.forEach((rule) => {
    graph.addNode(rule.name);
  });
  rules.forEach((rule) => {
    rule.dependencies.forEach((dependencyName) => {
      graph.addDependency(rule.name, dependencyName);
    });
  });

  return buildRuleNodes(graph, graph.entryNodes());
}
