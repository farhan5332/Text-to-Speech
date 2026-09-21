import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
  test: {
    // server/test holds the API's node:test suites; run those with its own npm test.
    include: ['src/**/*.test.{js,jsx}'],
    environment: 'node',
  },
});
