import { defineWorkspace } from 'vitest/config'

function getBrowserConfig(name: 'chromium' | 'firefox' | 'webkit'): Parameters<typeof defineWorkspace>[0][0] {
  return {
    test: {
      include: ['tests/browser.test.ts'],
      browser: {
        provider: 'playwright',
        name,
        enabled: true,
        headless: true,
        screenshotFailures: false,
      },
    },
  }
}

export default defineWorkspace([
  {
    test: {
      include: ['tests/node.test.ts'],
    },
  },
  getBrowserConfig('chromium'),
  getBrowserConfig('firefox'),
  getBrowserConfig('webkit'),
])
