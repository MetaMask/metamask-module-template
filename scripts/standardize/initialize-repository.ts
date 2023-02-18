import execa from 'execa';
import fs from 'fs';
import path from 'path';

import { REPOSITORIES_DIRECTORY_PATH } from './constants';
import { isDirectory } from './fs';
import { getLinesFromCommand, log } from './misc-utils';
import type { Repository } from './types';

/**
 * If the repository by the given name has not already been cloned, clones it
 * first; otherwise, ensures that the latest code has been pulled for the
 * primary branch. Then, initializes a new Repository from the repository path.
 *
 * @param repositoryName - The name of a repository in the MetaMask
 * organization.
 * @returns The repository.
 */
export async function initializeRepository(
  repositoryName: string,
): Promise<Repository> {
  const repository = await ensureRepositoryCloned(repositoryName);
  log('Repository is', repository);
  await ensureDefaultBranchSelected(repository);
  return repository;
}

/**
 * TODO.
 *
 * @param repositoryName - TODO.
 */
async function ensureRepositoryCloned(
  repositoryName: string,
): Promise<Repository> {
  const repositoryDirectoryPath = path.join(
    REPOSITORIES_DIRECTORY_PATH,
    repositoryName,
  );
  const isGitRepository = await isDirectory(
    path.join(repositoryDirectoryPath, '.git'),
  );
  let defaultBranchName;
  let currentBranchName;

  if (isGitRepository) {
    log('Capturing current and default branch name');
    currentBranchName = await getCurrentBranchName(repositoryDirectoryPath);
    defaultBranchName = await getDefaultBranchName(
      repositoryDirectoryPath,
      repositoryName,
    );
  } else {
    log('Removing existing', repositoryDirectoryPath);
    await fs.promises.rm(repositoryDirectoryPath, {
      recursive: true,
      force: true,
    });
    log('Cloning', repositoryName);
    await execa('git', [
      'clone',
      `https://github.com/MetaMask/${repositoryName}`,
      repositoryDirectoryPath,
    ]);
    currentBranchName = await getCurrentBranchName(repositoryDirectoryPath);
    defaultBranchName = currentBranchName;
  }

  return {
    directoryPath: repositoryDirectoryPath,
    currentBranchName,
    defaultBranchName,
  };
}

/**
 * TODO.
 *
 * @param repositoryDirectoryPath - TODO.
 * @param repositoryName - TODO.
 * @returns TODO.
 * @throws TODO.
 */
async function getDefaultBranchName(
  repositoryDirectoryPath: string,
  repositoryName: string,
): Promise<string> {
  const lines = await getLinesFromCommand('git', ['remote', 'show', 'origin'], {
    cwd: repositoryDirectoryPath,
  });
  let defaultBranchName;
  for (const line of lines) {
    const match = line.match(/^\s*HEAD branch: (.+)$/u);
    if (match) {
      defaultBranchName = match[1];
      break;
    }
  }
  if (defaultBranchName) {
    return defaultBranchName;
  }
  throw new Error(
    `Could not detect default branch name for ${repositoryName}, cannot proceed.`,
  );
}

/**
 * TODO.
 *
 * @param repositoryDirectoryPath - TODO.
 * @returns TODO.
 * @throws TODO.
 */
async function getCurrentBranchName(
  repositoryDirectoryPath: string,
): Promise<string> {
  const { stdout } = await execa('git', ['symbolic-ref', '--quiet', 'HEAD'], {
    cwd: repositoryDirectoryPath,
  });
  const match = stdout.match(/^refs\/heads\/(.+)$/u);
  if (match?.[1]) {
    return match[1];
  }
  throw new Error(
    'You do not seem to be on a branch. Perhaps HEAD is detached? Either way, you will need to return this repo to its default branch manually.',
  );
}

/**
 * TODO.
 *
 * @param repository - TODO.
 */
async function ensureDefaultBranchSelected(repository: Repository) {
  if (repository.currentBranchName !== repository.defaultBranchName) {
    await execa('git', ['checkout', repository.defaultBranchName], {
      cwd: repository.directoryPath,
    });
  }
}
