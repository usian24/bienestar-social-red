import type { NextConfig } from "next";
import os from "os";

function getLocalDevOrigins(): string[] {
  const dynamicOrigins = new Set<string>([
    // Patrones de red local privada RFC 1918 (Wi-Fi / Hotspot / LAN / USB / WSL)
    "192.168.*.*",
    "10.*.*.*",
    ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`),
    "127.0.0.1",
    "localhost",
    "localhost:3000",
    // IPs registradas explícitamente
    "192.168.137.19",
    "192.168.137.19:3000",
    "192.168.137.233",
    "192.168.137.233:3000",
    "10.225.68.18",
    "10.225.68.18:3000",
    "192.168.137.60",
    "192.168.137.60:3000",
    "192.168.137.8",
    "192.168.137.8:3000",
    "10.204.252.18",
    "10.204.252.18:3000",
    "192.168.1.161",
    "192.168.1.161:3000",
    "172.25.48.1",
    "172.25.48.1:3000",
    "192.168.56.1",
    "192.168.56.1:3000",
    "10.0.2.2",
    "10.0.2.2:3000",
  ]);

  try {
    const nets = os.networkInterfaces();
    for (const ifaces of Object.values(nets)) {
      for (const iface of ifaces || []) {
        if (iface.family === "IPv4" && iface.address) {
          dynamicOrigins.add(iface.address);
          dynamicOrigins.add(`${iface.address}:3000`);
        }
      }
    }
  } catch {
    // Fallback con la lista base si falla la inspección de interfaces
  }

  return Array.from(dynamicOrigins);
}

const nextConfig: NextConfig = {
  allowedDevOrigins: getLocalDevOrigins(),
  /* config options here */
  devIndicators: false,
};

export default nextConfig;
