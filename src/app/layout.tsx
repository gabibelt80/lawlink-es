import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "JURIDICTAS — Sistema de Gestión Legal para Estudios Jurídicos",
    template: "%s · JURIDICTAS",
  },
  description:
    "Sistema integral de gestión para estudios jurídicos argentinos. Casos, clientes, finanzas, plazos, IA y jurisprudencia en un solo lugar.",
  applicationName: "JURIDICTAS",
  keywords: [
    "gestión legal",
    "estudio jurídico",
    "abogados",
    "Argentina",
    "casos",
    "expedientes",
    "jurisprudencia",
  ],
  authors: [{ name: "JURIDICTAS" }],
  creator: "JURIDICTAS",
  publisher: "JURIDICTAS",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "https://juridictas.ar",
    siteName: "JURIDICTAS",
    title: "JURIDICTAS — Sistema de Gestión Legal",
    description:
      "Sistema integral de gestión para estudios jurídicos argentinos.",
    images: [
      {
        url: "/brand/juridictas-logo-con-letras.jpg",
        width: 1200,
        height: 630,
        alt: "JURIDICTAS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JURIDICTAS — Sistema de Gestión Legal",
    description:
      "Sistema integral de gestión para estudios jurídicos argentinos.",
    images: ["/brand/juridictas-logo-con-letras.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#007b7f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
