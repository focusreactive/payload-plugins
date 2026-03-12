import { withPayload } from '@payloadcms/next/withPayload'
import { createRequire } from 'module'
import { dirname } from 'path'

const require = createRequire(import.meta.url)

// Resolve to package directory (not entry file) so subpath imports like react/jsx-runtime still work
const pkgDir = (pkg) => dirname(require.resolve(`${pkg}/package.json`))

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (webpackConfig, { dev }) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    // Force single instances of packages that use React context
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      '@payloadcms/ui': pkgDir('@payloadcms/ui'),
      react: pkgDir('react'),
      'react-dom': pkgDir('react-dom'),
    }

    if (dev) {
      webpackConfig.watchOptions = {
        ...webpackConfig.watchOptions,
        ignored: /node_modules\/(?!(@focus-reactive)\/).*/,
      }
    }

    return webpackConfig
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
