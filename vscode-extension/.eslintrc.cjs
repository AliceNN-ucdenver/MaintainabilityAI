module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist', 'node_modules', '*.js'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-require-imports': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    'no-inner-declarations': 'warn',
    'no-constant-condition': 'warn',
    'no-useless-escape': 'warn',
    'no-regex-spaces': 'warn',
    'no-case-declarations': 'warn',
    'prefer-const': 'warn'
  }
};
