module.exports = {
  root: true,

  extends: ['@metamask/eslint-config'],

  overrides: [
    {
      files: ['*.ts'],
      extends: ['@metamask/eslint-config-typescript'],
    },

    {
      files: ['*.js', 'scripts/**/*.ts'],
      parserOptions: {
        sourceType: 'script',
      },
      extends: ['@metamask/eslint-config-nodejs'],
    },

    {
      files: ['*.test.ts', '*.test.js'],
      extends: ['@metamask/eslint-config-jest'],
    },

    {
      files: ['scripts/**/*.ts'],
      rules: {
        'no-implicit-globals': 'off',
        'node/no-sync': 'off',
        'node/shebang': 'off',
      },
    },
  ],

  ignorePatterns: ['!.eslintrc.js', '!.prettierrc.js', 'dist/'],
};
