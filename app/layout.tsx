import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import Navbar from '../components/Navbar'
import GemPopup from '@/components/GemPopup'
import VideoPopup from '@/components/VideoPopup'

export const metadata: Metadata = {
  title:
    'Best Thermal Fogging Machine Manufacturer | 100x Circle',
  description:
    'Discover 100x Circle, top thermal fogging machine manufacturer serving various areas across India. High-performance mosquito foggers. Contact us today!',
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: '7yMHOjyWo4oTSZpe1JQP0P7CR1t0dxuHSVufT6u065A',
  },
  alternates: {
    canonical: 'https://www.100xcircle.com',
  },
  keywords: " thermal fogging machine manufacturer, cold fogging machine, buy industrial fogging machine online, vehicle mounted fogging machine manufacturer, pest control fogging machine supplier india, Fogging machine supplier in India, mosquito fogging machine manufacturer"
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="robots" content="INDEX, FOLLOW" />
        <meta name="google-site-verification" content="7yMHOjyWo4oTSZpe1JQP0P7CR1t0dxuHSVufT6u065A" />
        <link rel="icon" href="/logo-main.png" sizes="48x48" />
      </head>
      <body>
        <GemPopup />
        <VideoPopup />
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17730009010"
          strategy="afterInteractive"
        />
        <Script id="google-ads" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-17730009010');
            gtag('config', 'AW-17730009010/0N2CCMvmudwbELLvqYZC', {
              'phone_conversion_number': '7827229116'
            });
            function gtag_report_conversion(url) {
              var callback = function () {
                if (typeof(url) != 'undefined') {
                  window.location = url;
                }
              };
              gtag('event', 'conversion', {
                  'send_to': 'AW-17730009010/d5fWCOSUvtwbELLvqYZC',
                  'event_callback': callback
              });
              return false;
            }
          `}
        </Script>
        <Navbar />
        {children}
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-GEWH5YB3PS"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-GEWH5YB3PS');
          `}
        </Script>
        {/* Google Analytics - Additional Tag */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-7EXHP2B0SD"
          strategy="afterInteractive"
        />
        <Script id="google-analytics-2" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-7EXHP2B0SD');
          `}
        </Script>
      </body>
    </html>
  )
}
