import React from "react"
import type { Metadata } from "next"
import "./styles.css"
import { Cormorant_Garamond, Inter } from "next/font/google"

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "600"],
})

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://echoes-archive.onrender.com",
  ),
  title: "Echoes — A Family Memory Archive",
  description: "Because some voices deserve to live beyond a lifetime.",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "Echoes — A Family Memory Archive",
    description: "Because some voices deserve to live beyond a lifetime.",
    images: ["/sunset.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/sunset.jpg"],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable} min-h-screen bg-[var(--navy)] text-[var(--ivory)] antialiased`}>
        <div id="root" tabIndex={-1}>
          {children}
        </div>
      </body>
    </html>
  )
}
