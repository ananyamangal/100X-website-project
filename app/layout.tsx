import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import Navbar from '../components/Navbar';

export const metadata: Metadata = {
  title:
    'Best thermal & giant fogging machine manufacturer in Delhi, Uttar Pradesh, Bihar, Mumbai, Pune India | Mosquito Fogger | 100x Circle',
  description:
    'Discover 100x Circle – the best thermal & giant fogging machine manufacturer in Delhi, Uttar Pradesh, Bihar, Mumbai, and Pune, India. Our high-performance mosquito foggers ensure superior pest control, durability, and efficiency for industrial and residential use. Connect with us!',
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: 'MGOgHdnClDvCf-IVmtpccyhPKKtHcbS8W3Xvhd2KYmo',
  },
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
        <meta name="google-site-verification" content="MGOgHdnClDvCf-IVmtpccyhPKKtHcbS8W3Xvhd2KYmo" />
      </head>
      <body>
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
      </body>
    </html>
  )
}
