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
    quotes: ['error', 'single'],
    semi: ['error', 'never'],
    // 配合多行导入的排序（防止 Prettier 冲突）
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',
    'simple-import-sort/imports': [
      'error',
      {
        groups: [
          // 1. Vue 相关、第三方库
          ['^vue', '^@?\\w'],
          // 2. 内部别名路径 (如 @/components)
          ['^@/'],
          // 3. 父级目录和同级目录导入
          [
            '^\\.\\.(?!/?$)',
            '^\\.\\./?$',
            '^\\./(?=.*/)(?!/?$)',
            '^\\./?$',
            '^\\.(?!/?$)',
          ],
          // 4. 类型导入 (配合你之前的 verbatimModuleSyntax)
          ['^@/types', '^type'],
          // 5. 样式文件
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
