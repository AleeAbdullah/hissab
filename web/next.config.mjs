import createMDX from '@next/mdx';

const withMDX = createMDX();

export default withMDX({
  agentRules: false,
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  poweredByHeader: false,
  trailingSlash: true,
  turbopack: { root: import.meta.dirname },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' }
        ]
      }
    ];
  }
});
