import { defineConfig } from 'vitest/config';

// Real-browser checks for Rare Styles (CSS-118). Runs headless Google Chrome
// through playwright-core (no bundled browser download):
//   npm run test:browser
// Part of the release checks; not in the default `npm test`, which must run
// without a browser installed.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/browser/**/*.test.js'],
    testTimeout: 60000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
