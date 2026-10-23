import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Do not advertise the framework; smaller fingerprint for scanners.
  poweredByHeader: false,
  // Self-contained server bundle for the Docker / Cloud Run image.
  output: "standalone",
};

export default config;
