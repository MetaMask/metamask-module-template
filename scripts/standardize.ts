#!yarn ts-node

import fs from 'fs';

import {
  REPOSITORIES_DIRECTORY_PATH,
  REPOSITORY_NAMES,
} from './standardize/constants';
import { initializeRepository } from './standardize/initialize-repository';
import { reportProjectAnalyses } from './standardize/report-project-analyses';
import { standardizeRepository } from './standardize/standardize-repository';

main().catch((error) => console.error(error));

/**
 * The main entrypoint of this script.
 */
async function main() {
  await fs.promises.mkdir(REPOSITORIES_DIRECTORY_PATH, { recursive: true });
  const repositoryConfigs = await Promise.all(
    REPOSITORY_NAMES.map(initializeRepository),
  );
  const projectAnalyses = (
    await Promise.all(repositoryConfigs.map(standardizeRepository))
  ).flat();
  reportProjectAnalyses(projectAnalyses);
}
