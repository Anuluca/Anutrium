module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: [
    'plugin:vue/vue3-recommended',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier',
  ],
  plugins: ['simple-import-sort', 'import'],
  rules: {
    'vue/multi-word-component-names': 'off',
    'vue/no-unused-components': 'warn',
    'vue/attribute-hyphenation': ['error', 'always'],
    'vue/html-self-closing': [
      'warn',
      { html: { void: 'always', normal: 'always', component: 'always' } },
    ],

    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports' },
    ],
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-duplicate-imports': 'error',
    quotes: 'off',
    semi: ['error', 'never'],
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',
    'simple-import-sort/imports': [
      'error',
      {
        groups: [
          ['^vue', '^@?\\w'],
          ['^@/'],
          [
            '^\\.\\.(?!/?$)',
            '^\\.\\./?$',
            '^\\./(?=.*/)(?!/?$)',
            '^\\./?$',
            '^\\.(?!/?$)',
          ],
          ['^@/types', '^type'],
          ['^.+\\.s?css$', '^.+\\.less$'],
        ],
      },
    ],
  },
  parserOptions: {
    ecmaVersion: 'latest',
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
  },
}
