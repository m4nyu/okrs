import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import type { Metadata } from "next"
import type React from "react"
import { Providers } from "@/lib/theme"
import "../lib/styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://okrs.dev"),
  title: "OKRs",
  description: "Set objectives, track key results, and align your team around what matters most. A simple OKR tool for startups.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    url: "https://okrs.dev",
    type: "website",
    title: "OKRs",
    description: "Set objectives, track key results, and align your team around what matters most.",
    images: ["/app.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "OKRs",
    description: "Set objectives, track key results, and align your team around what matters most.",
    images: ["/app.png"],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
