import path from 'path';

export const ROOT_DIRECTORY = path.resolve(__dirname, '../..');
export const REPOSITORIES_DIRECTORY_PATH = path.join(
  ROOT_DIRECTORY,
  '.repositories',
);
export const REPOSITORY_NAMES = ['eth-token-tracker', 'logo', 'providers'];
