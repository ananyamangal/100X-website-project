/** @type {import('next').NextConfig} */
const nextConfig = {
  // Environment-based configuration
  async rewrites() {
    return [
      // In production, you might want to block admin routes entirely
      ...(process.env.NODE_ENV === 'production' ? [] : [
        {
          source: '/admin/:path*',
          destination: '/admin/:path*',
        }
      ])
    ]
  },
  
  // Security headers for admin routes
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
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
