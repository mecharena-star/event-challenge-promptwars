import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Do not advertise the framework; smaller fingerprint for scanners.
  poweredByHeader: false,
  // Self-contained server bundle for Docker / Cloud Run; disabled on Vercel.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default config;
