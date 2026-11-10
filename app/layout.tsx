import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Academia ARP",
  description: "Clases, actividades y seguimiento individual.",
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
