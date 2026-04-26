/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/zapi/:path*',
        destination: 'https://signal-lens.hub.zerve.cloud/:path*',
      },
    ]
  },
}

export default nextConfig
