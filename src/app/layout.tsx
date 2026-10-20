import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema de Subsidios para Salud",
  description: "Red de Salud Huánuco",
  icons: {
    icon: [
      { url: "/images/logo-red-huanuco.png", type: "image/png" },
      { url: "/favicon.ico" }
    ],
    shortcut: "/images/logo-red-huanuco.png",
    apple: "/images/logo-red-huanuco.png",
  },
};

import { Providers } from "./Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="font-sans antialiased h-screen overflow-hidden" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
