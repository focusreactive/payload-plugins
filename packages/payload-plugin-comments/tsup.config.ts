import { defineConfig } from 'tsup'

export default defineConfig({
  onSuccess: 'node node_modules/@tailwindcss/cli/dist/index.mjs -i src/styles.css -o dist/styles.css --minify',
  entry: ['src/**/*.{ts,tsx}'],
  bundle: false,
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  external: [
    'payload',
    'react',
    'react-dom',
    'next',
    '@payloadcms/ui',
    '@payloadcms/plugin-multi-tenant',
    'resend',
  ],
})