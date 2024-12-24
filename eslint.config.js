import { defineEslintConfig } from '@subframe7536/eslint-config'

export default defineEslintConfig({
  ignoreRuleOnFile: {
    files: ['tests/**/*', 'dev/**/*'],
    rules: ['ts/explicit-function-return-type'],
  },
})
