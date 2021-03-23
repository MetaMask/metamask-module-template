module.exports = {
  env: {
    'browser': true,
  },

  extends: [
    '@metamask/eslint-config',
    '@metamask/eslint-config/config/typescript',
  ],

  plugins: [
    'json',
  ],

  overrides: [{
    files: [
      '*.js',
      '*.json',
    ],
    parserOptions: {
      sourceType: 'script',
    },
    extends: [
      '@metamask/eslint-config/config/nodejs',
    ],
  }],

  ignorePatterns: [
    '!.eslintrc.js',
    'dist/',
    'node_modules/',
  ],
};
