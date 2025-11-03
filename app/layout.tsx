import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "CleanSpace Tradeshow Lead Capture",
  description:
    "CleanSpace Technology tradeshow lead capture and management system. Streamlined lead collection, rep tracking, and CRM integration for tradeshows and events.",
  keywords: "CleanSpace, tradeshow, lead capture, respiratory protection, sales management",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-DWPDBGS6K4"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-DWPDBGS6K4');
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              var head = document.head;
              var script = document.createElement('script');
              script.type = 'text/javascript';
              script.src = "https://insights.profitgeeks.com.au/api/tracking/universal-script?cid=b1d06ab1-1a37-4ab0-9433-4bc4543674f0&tag=csworkvercel&ref_url=" + encodeURI(document.URL);
              head.appendChild(script);
            `,
          }}
        />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={<div>Loading...</div>}>
          {children}
          <Analytics />
          <SpeedInsights />
        </Suspense>
      </body>
    </html>
  )
}
