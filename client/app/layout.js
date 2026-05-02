import { Manrope, Newsreader } from 'next/font/google';
import './globals.css';
import AppProviders from '@/components/layout/AppProviders';

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
  weight: ['400','500','600','700'],
});

const newsreader = Newsreader({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-newsreader',
  weight: ['300','400','500','600'],
  style: ['normal','italic'],
});

export const metadata = {
  title: 'Novel Center',
  description: 'A quiet, editorial home for long-form reading.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${manrope.variable}`} data-reader-theme="cream">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='nc.siteTheme';var r=localStorage.getItem(k);if(!r)return;var p=JSON.parse(r);if(p&&p.state&&p.state.siteTheme==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-white text-ink-700 antialiased selection:bg-tertiary-fixed selection:text-on-tertiary-fixed dark:bg-black dark:text-neutral-100">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
