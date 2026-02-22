import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Configuración de Vitest para tests E2E del pipeline RAG.
 * Usa entorno Node.js puro (sin jsdom) para que los SDKs de OpenAI y Pinecone
 * funcionen correctamente. Carga las API keys desde .env.
 *
 * Ejecutar: npm run test:e2e:rag
 */
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/__tests__/e2e-setup.ts'],
    include: ['src/__tests__/atc/rag-e2e.test.ts'],
    globals: true,
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
