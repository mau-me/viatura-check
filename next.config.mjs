import withPWA from "next-pwa";

const nextConfig = {
  images: { unoptimized: true },
  experimental: {
    serverActions: {
      runtime: 'nodejs',
    },
  },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);