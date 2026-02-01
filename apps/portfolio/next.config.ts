import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/backtester/:path*',
        destination: 'https://szap-backtester.vercel.app/:path*',
      },
      {
        source: '/resume-ai/:path*',
        destination: 'https://resume-ai-sooty-seven.vercel.app/:path*',
      },
      {
        source: '/wallet/:path*',
        destination: 'https://wallet-scope.vercel.app/:path*',
      },
      {
        source: '/devpulse/:path*',
        destination: 'https://devpulse-ivory.vercel.app/:path*',
      },
      {
        source: '/api-tester/:path*',
        destination: 'https://api-tester-two-teal.vercel.app/:path*',
      },
      {
        source: '/snippets/:path*',
        destination: 'https://snippet-vault-lime.vercel.app/:path*',
      },
      {
        source: '/markdown/:path*',
        destination: 'https://markdown-pro-nu.vercel.app/:path*',
      },
      {
        source: '/todo/:path*',
        destination: 'https://alexszapiro-to-do.vercel.app/:path*',
      },
    ];
  },
};

export default nextConfig;
