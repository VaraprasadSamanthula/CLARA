/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use Turbopack (default in Next.js 16)
  turbopack: {},
  
  // Enable experimental features if needed
  experimental: {
    // Enable agent feedback for debugging
    agentFeedback: true,
  },
};

module.exports = nextConfig;
