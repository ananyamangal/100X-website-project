/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,

  async redirects() {
    return [
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
    ]
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
  },
}

export default nextConfig
