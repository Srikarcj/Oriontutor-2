/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/a/ask",
        destination: "/ask",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
