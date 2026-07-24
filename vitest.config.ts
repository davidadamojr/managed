import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The engine is pure and headless — tests run in Node, never a DOM.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
