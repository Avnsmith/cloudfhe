/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_VERCEL_URL: process.env.VERCEL_URL || 'http://localhost:3000',
  },
}

module.exports = nextConfig
