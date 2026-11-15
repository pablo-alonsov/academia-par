import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',interactiveWidget:'resizes-content'};

export const metadata: Metadata = {
  title: "academia PAR",
  description: "Clases, actividades y seguimiento individual.",
  robots: { index: false, follow: false, noarchive: true },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
