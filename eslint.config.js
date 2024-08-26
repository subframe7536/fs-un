import { defineEslintConfig } from '@subframe7536/eslint-config'

export default defineEslintConfig({
  type: 'lib',
  ignoreRuleOnFile: {
    files: ['tests/**/*', 'dev/**/*'],
    rules: ['ts/explicit-function-return-type'],
  },
})
