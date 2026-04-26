import type { NextConfig } from "next";

/** Public deploy path: https://rateministere.com/waste-your-tokens */
const basePath = "/waste-your-tokens";

const nextConfig: NextConfig = {
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
