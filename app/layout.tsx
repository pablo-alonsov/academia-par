import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Academia ARP · Un paso más, a tu manera",
  description: "Tu espacio para aprender, practicar y seguir avanzando.",
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
