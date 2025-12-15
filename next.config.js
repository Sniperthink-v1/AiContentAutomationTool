/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'localhost',
      'pub-5d2e0793863742dbaeef0a683ee01333.r2.dev',
      '3c946c1874c456b1fdef2a60890675a5.r2.cloudflarestorage.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudflare.com',
      },
    ],
  },
  env: {
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
  },
}

module.exports = nextConfig
