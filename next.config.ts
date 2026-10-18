import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "10.225.68.18",
    "10.225.68.18:3000",
    "192.168.137.60",
    "192.168.137.60:3000",
    "192.168.137.8",
    "192.168.137.8:3000",
    "192.168.1.161",
    "192.168.1.161:3000",
    "172.25.48.1",
    "172.25.48.1:3000",
    "192.168.56.1",
    "192.168.56.1:3000",
    "10.0.2.2",
    "10.0.2.2:3000",
    "localhost",
    "localhost:3000"
  ],
  /* config options here */
};

export default nextConfig;
