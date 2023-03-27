import path from 'path';

export const ROOT_DIRECTORY = path.resolve(__dirname, '../..');
export const REPOSITORIES_DIRECTORY_PATH = path.join(
  ROOT_DIRECTORY,
  '.repositories',
);
// You can get a list of repos by looking at:
// <https://github.com/MetaMask/core/issues/1079>
export const REPOSITORY_NAMES = [
  'abi-utils',
  'browser-passworder',
  'eth-block-tracker',
  'eth-phishing-detect',
  'eth-token-tracker',
  'logo',
  'providers',
];
