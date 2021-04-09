module.exports = {
  env: {
    browser: true,
  },

  extends: ['@metamask/eslint-config'],

  overrides: [
    {
      files: ['*.ts'],
      extends: ['@metamask/eslint-config-typescript'],
    },

    {
      files: ['*.test.ts', '*.test.js'],
      extends: ['@metamask/eslint-config-jest'],
    },

    {
      files: ['*.js'],
      parserOptions: {
        sourceType: 'script',
      },
      extends: ['@metamask/eslint-config-nodejs'],
    },
  ],

  ignorePatterns: ['!.eslintrc.js', 'dist/'],
};
