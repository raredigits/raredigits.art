import { defineConfig } from 'vitest/config';

// RareCharts test harness (path-to-1.0 task B1).
// Pure-function tests run under jsdom so future DOM/render smoke tests can be
// added in the same suite without reconfiguring. Tests live in repo-root
// test/ — NOT under assets/charts/, which Eleventy passthrough-copies to _site.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.js'],
    setupFiles: ['./test/setup.js'],
  },
});
