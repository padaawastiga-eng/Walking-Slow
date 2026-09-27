import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Jalan Santai GPS - Panduan Navigasi Rute',
  description: 'Aplikasi navigasi GPS interaktif real-time khusus rute Jalan Santai dengan penunjuk arah kompas presisi, deteksi jalur, dan panduan suara.',
  openGraph: {
    title: 'Jalan Santai GPS - Panduan Navigasi Rute',
    description: 'Aplikasi navigasi GPS interaktif real-time khusus rute Jalan Santai dengan penunjuk arah kompas presisi, deteksi jalur, dan panduan suara.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jalan Santai GPS - Panduan Navigasi Rute',
    description: 'Aplikasi navigasi GPS interaktif real-time khusus rute Jalan Santai dengan penunjuk arah kompas presisi, deteksi jalur, dan panduan suara.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="id" className="h-full bg-slate-900 text-slate-100 antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </head>
      <body className="h-full overflow-hidden bg-slate-900 text-slate-100 selection:bg-emerald-500 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
