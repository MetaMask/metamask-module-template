import base, { createConfig } from '@metamask/oxlint-config';
import commonjs from '@metamask/oxlint-config-commonjs';
import nodejs from '@metamask/oxlint-config-nodejs';
import typescript from '@metamask/oxlint-config-typescript';
import vitest from '@metamask/oxlint-config-vitest';

export default createConfig({
  extends: [base],

  ignorePatterns: ['.yarn/**', 'dist/**', 'lavamoat/**'],

  options: {
    reportUnusedDisableDirectives: 'error',
    typeAware: true,
  },

  overrides: [
    {
      files: ['**/*.ts', '**/*.mts', '**/*.cts'],
      extends: [typescript],
    },

    {
      files: ['**/*.cjs', '**/*.cts'],
      extends: [nodejs, commonjs],
      rules: {
        'import/unambiguous': 'off',
      },
    },

    {
      files: ['.github/**', 'yarn.config.cjs', '**/scripts/**'],
      extends: [nodejs],
    },

    {
      files: ['**/*.test.ts', '**/test/**', '**/tests/**'],
      extends: [nodejs, vitest],
      rules: {
        'node/no-sync': 'off',
        'node/no-process-env': 'off',
      },
    },
  ],
});
