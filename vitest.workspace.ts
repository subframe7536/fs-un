import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      include: ['tests/node.test.ts'],
    },
  },
  {
    test: {
      include: ['tests/browser.test.ts'],
      browser: {
        provider: 'playwright',
        name: 'chromium',
        enabled: true,
        headless: true,
        screenshotFailures: false,
      },
    },
  },
])
