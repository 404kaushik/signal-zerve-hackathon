import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import { CommandPalette } from '@/components/worldlens/command-palette'
import { Analytics } from '@vercel/analytics/next'
import Image from 'next/image'
import bg from '@/public/bg-3.png'
import { AppProviders } from '@/components/AppProviders'
import './globals.css'

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'SIGNAL // GLOBAL INTELLIGENCE TERMINAL',
  description: 'Real-time global data intelligence system. Explore economy, markets, climate, sports, and culture through live data feeds.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#050505',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="font-mono">
      <body className={`font-sans antialiased text-[#e8e8e8]`}>
        <div className="fixed inset-0 -z-10">
          <Image src={bg} alt="Background" className="h-full w-full object-cover" />
        </div>
        <div className="fixed inset-0 -z-10 bg-black/55" />
        <AppProviders>
          {children}
        </AppProviders>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}