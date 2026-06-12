/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  trailingSlash: false,

  async redirects() {
    return [
      // Non-www -> www host normalization. Canonical origin lives at
      // https://www.100xcircle.com (matches SITE_URL in lib/seo/site-config.ts).
      {
        source: '/:path*',
        has: [{ type: 'host', value: '100xcircle.com' }],
        destination: 'https://www.100xcircle.com/:path*',
        permanent: true,
      },
      {
        source: '/contact',
        destination: '/contact-us',
        permanent: true,
      },
      {
        source: '/100xdb400-double-barrel-thermal-fogging-machine-vehicle-mountable',
        destination: '/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400',
        permanent: true,
      },

      // ── Product canonical redirects ──────────────────────────────────────
      // These 3 products have SEO landing pages at their canonical URLs.
      // Every /products/<slug-or-id> variant must 301 to the SEO URL so no
      // two URLs both return 200 for the same product.
      // Evaluated at the edge layer — no route handler is invoked.

      // Thermal & Cold Fogging Machine 100XTFS50
      { source: '/products/thermal-cold-fogging-machine-100xtfs50-90602f',  destination: '/thermal-and-cold-fogging-machine-100xtfs50', permanent: true },
      { source: '/products/thermal-cold-fogging-machine-100xtfs50-290275',  destination: '/thermal-and-cold-fogging-machine-100xtfs50', permanent: true },
      { source: '/products/68e5217a0bab18231190602f',                       destination: '/thermal-and-cold-fogging-machine-100xtfs50', permanent: true },
      { source: '/products/6a1fccbf04cb8e079f290275',                       destination: '/thermal-and-cold-fogging-machine-100xtfs50', permanent: true },

      // Stainless Steel Thermal Fogger 100XSSMA20
      { source: '/products/thermal-fogging-machine-with-stainless-steel-tank-100xssma20-1b5dd8', destination: '/thermal-fogging-machine-with-stainless-steel-tank-100xssma20', permanent: true },
      { source: '/products/68e523cd8d624609ac1b5dd8',                                           destination: '/thermal-fogging-machine-with-stainless-steel-tank-100xssma20', permanent: true },

      // Double Barrel Vehicle-Mountable Fogger 100XDB400
      { source: '/products/100xdb400-double-barrel-thermal-fogging-machine-vehicle-moun-f377e0', destination: '/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400', permanent: true },
      { source: '/products/double-barrel-thermal-fogging-machine-vehicle-mounted',               destination: '/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400', permanent: true },
      { source: '/products/68e52538f84599d156f377e0',                                            destination: '/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400', permanent: true },
      { source: '/products/6a1e6c08ef20ab52efaa3d69',                                            destination: '/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400', permanent: true },
    ]
  },

  async rewrites() {
    return [
      ...(process.env.NODE_ENV === 'production' ? [] : [
        {
          source: '/admin/:path*',
          destination: '/admin/:path*',
        }
      ])
    ]
  },

  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
    ]
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/admin/:path*',
        headers: [
          ...securityHeaders,
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
      // Immutable cache for hashed Next.js static assets (_next/static)
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Long cache for public static files (logos, banners, PDFs)
      {
        source: '/Logos clipart 2/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/:file(.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|woff2|woff|ttf))',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
    ]
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000, // 30 days
    deviceSizes: [390, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // Experimental: faster builds and better tree-shaking
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-accordion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      'recharts',
    ],
  },
}

export default nextConfig
