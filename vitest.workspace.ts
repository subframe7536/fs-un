import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name: 'node',
      include: ['tests/node.test.ts'],
    },
  },
  {
    test: {
      name: 'browser',
      include: ['tests/browser.test.ts'],
      browser: {
        provider: 'playwright',
        enabled: true,
        headless: true,
        screenshotFailures: false,
        instances: [
          {
            browser: 'chromium',
          },
          {
            browser: 'firefox',
          },
          {
            browser: 'webkit',
          },
        ],
      },
    },
  },
])
