import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Chewy } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const brandFont = Chewy({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Lär med Sinus",
  description: "Desc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" sizes="16x16" href="/logos/sinus-logo-1024px.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/logos/sinus-logo-1024px.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/logos/sinus-logo-1024px.png" />
        <link rel="shortcut icon" href="/logos/sinus-logo-1024px.png" />
        <link rel="apple-touch-icon" href="/logos/sinus-logo-1024px.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${brandFont.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
