import { withPayload } from '@payloadcms/next/withPayload'
import { createRequire } from 'module'
import { dirname, sep } from 'path'

const require = createRequire(import.meta.url)

// Resolve to package directory. Prefers `pkg/package.json` but falls back to
// scanning the resolved entry path for the node_modules/<pkg> segment, since
// some packages (e.g. @payloadcms/ui) don't expose ./package.json in exports.
const pkgDir = (pkg) => {
  try {
    return dirname(require.resolve(`${pkg}/package.json`))
  } catch {
    const entry = require.resolve(pkg)
    const marker = `${sep}node_modules${sep}${pkg.replace('/', sep)}${sep}`
    const idx = entry.lastIndexOf(marker)
    if (idx !== -1) return entry.slice(0, idx + marker.length - 1)
    throw new Error(`Cannot find package directory for ${pkg}`)
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (webpackConfig, { dev }) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    // Force single instances of packages that use React context.
    // Use '$' suffix for exact-match alias on @payloadcms/ui so that only
    // `import '@payloadcms/ui'` is redirected. Subpath imports like
    // `@payloadcms/ui/shared` and `@payloadcms/ui/utilities/*` are left to
    // normal webpack resolution, which correctly uses the package's exports
    // field. A prefix alias (without '$') would bypass the exports map for
    // every subpath import, producing "Module not found" errors.
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      '@payloadcms/ui$': pkgDir('@payloadcms/ui'),
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
