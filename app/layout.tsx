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
        {/* Google Tag Manager */}
        <Script id="gtm-head" strategy="beforeInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-5JMGCKRW');
          `}
        </Script>
        <meta name="robots" content="INDEX, FOLLOW" />
        <meta name="google-site-verification" content="7yMHOjyWo4oTSZpe1JQP0P7CR1t0dxuHSVufT6u065A" />
        <link rel="icon" href="/logo-main.png" sizes="48x48" />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5JMGCKRW"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <GemPopup />
        <VideoPopup />
        {/* Push WhatsApp clicks to dataLayer for GTM conversion tracking */}
        <Script id="whatsapp-click-tracker" strategy="afterInteractive">
          {`
            document.addEventListener('click', function (event) {
              var target = event.target;
              if (!target) return;
              var link = target.closest && target.closest('a[href]');
              if (!link) return;
              var href = (link.getAttribute('href') || '').toLowerCase();
              if (href.indexOf('wa.me') === -1 && href.indexOf('whatsapp') === -1) return;
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({
                event: 'whatsapp_click',
                whatsapp_url: link.href || href
              });
            });

            // Backward compatibility: legacy code still calls these functions.
            window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
            window.gtag_report_conversion = window.gtag_report_conversion || function(url) {
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({
                event: 'legacy_conversion_call',
                conversion_url: url || ''
              });
              if (url) window.location = url;
              return false;
            };
          `}
        </Script>
        <Navbar />
        {children}
      </body>
    </html>
  )
}
