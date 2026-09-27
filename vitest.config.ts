import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // OCR de verdade é lento: roda separado com `npm run test:ocr`
    exclude: process.env.OCR ? [] : ['tests/**/*.slow.test.ts'],
  },
});
