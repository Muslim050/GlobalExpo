import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'
import query from '@tanstack/eslint-plugin-query'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'scripts'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Правила TanStack Query: ключи запросов, стабильность queryFn и т.п.
  ...query.configs['flat/recommended'],

  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,

      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Пропсы описываем типами, не PropTypes.
      'react/prop-types': 'off',

      // TODO: временно warning. Это чтение localStorage внутри эффектов
      // в CampaignMediaTabs / CampaignReportPanels / SpotLogTable — уходит
      // вместе с переносом данных в слой запросов и store. Вернуть в 'error'.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Конфиги и скрипты сборки живут в Node.
  {
    files: ['*.config.{js,ts}', 'vite.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },

  // Отключаем правила, конфликтующие с Prettier. Всегда последним.
  prettier,
)
