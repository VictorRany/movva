import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Movva | Personal Presencial e Online",
  description: "Seu personal trainer, presencial ou online. Treino + nutrição com acompanhamento real.",
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Movva", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { themeColor: "#0f1a2e", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
