import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

const modules = [
  'identity',
  'catalog',
  'ordering',
  'reviews',
  'engagement',
  'promotions',
  'reporting',
];

function otherInternals(moduleName) {
  const others = modules.filter((m) => m !== moduleName);
  return others.flatMap((other) => [
    {
      group: [
        `@modules/${other}/domain`,
        `@modules/${other}/domain/*`,
        `@modules/${other}/domain/**`,
        `@modules/${other}/application`,
        `@modules/${other}/application/*`,
        `@modules/${other}/application/**`,
        `@modules/${other}/infra`,
        `@modules/${other}/infra/*`,
        `@modules/${other}/infra/**`,
        `@modules/${other}/http/controllers/**`,
        `@modules/${other}/http/routes/**`,
        `@modules/${other}/http/validators/**`,
        `@modules/${other}/http/docs/**`,
        `@modules/${other}/http/presenters/**`,
      ],
      message: `Import @modules/${other} public API instead of deep internals.`,
    },
  ]);
}

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '_migrate/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  ...modules.map((moduleName) => ({
    files: [`src/modules/${moduleName}/**/*.ts`],
    rules: {
      'no-restricted-imports': ['error', { patterns: otherInternals(moduleName) }],
    },
  })),
  ...modules.map((moduleName) => ({
    files: [`src/modules/${moduleName}/domain/**/*.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['express', 'express/*', 'mongoose', 'mongoose/*'],
              message: 'Domain must not import express or mongoose',
            },
            ...otherInternals(moduleName),
          ],
        },
      ],
    },
  })),
  {
    files: ['src/shared/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['express', 'express/*', 'mongoose', 'mongoose/*'],
              message: 'Domain must not import express or mongoose',
            },
          ],
        },
      ],
    },
  },
);
