import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'adapters/payloadGlobal/index': 'src/adapters/payloadGlobal/index.ts',
    'adapters/vercelEdge/index': 'src/adapters/vercelEdge/index.ts',
    'analytics/index': 'src/analytics/index.ts',
    'analytics/client': 'src/analytics/client.ts',
    'analytics/adapters/googleAnalytics/index':
      'src/analytics/adapters/googleAnalytics/index.ts',
    'middleware/index': 'src/middleware/index.ts',
    'admin/VariantsField': 'src/admin/components/VariantsField.tsx',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  splitting: false,
  clean: true,
  external: ['payload', 'react', 'next', '@vercel/edge-config', '@payloadcms/ui'],
})
